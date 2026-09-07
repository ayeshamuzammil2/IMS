using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Auth;
using PIA.Domain.Entities;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Auth;

public sealed class AuthService(
    PiaDbContext db,
    IPasswordHasher hasher,
    IPasswordPolicyService passwordPolicy,
    ILoginLockoutService lockout,
    IUserSecurityService security,
    IJwtTokenService jwtTokenService,
    IRefreshTokenService refreshTokenService,
    ITempPasswordGenerator tempPasswordGenerator,
    IEmailQueue emailQueue,
    IAuditLogger auditLogger,
    IClock clock) : IAuthService
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request, string? ip, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(u => u.InternProfile).ThenInclude(p => p!.Mentor)
            .FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null)
        {
            throw new BusinessRuleException(BusinessRuleCodes.InvalidCredentials, "Incorrect email or password.");
        }

        if (user.IsLockedForUnofficialActivity)
        {
            var mentorEmail = user.InternProfile?.Mentor?.Email ?? "your administrator";
            throw new BusinessRuleException(BusinessRuleCodes.UnofficialActivityLockout,
                $"Your account has been locked due to unofficial activity. Kindly contact your mentor at {mentorEmail} or meet your mentor in person to unlock your account.");
        }

        if (await lockout.IsLockedOutAsync(user.Id, ct))
        {
            throw new BusinessRuleException(BusinessRuleCodes.AccountLockedOut,
                "This account is temporarily locked due to repeated failed sign-in attempts. Try again later.");
        }

        if (!hasher.Verify(request.Password, user.PasswordHash))
        {
            await lockout.RegisterFailureAsync(user.Id, ct);
            await auditLogger.LogAsync("Auth.LoginFailed", nameof(User), user.Id.ToString(), null, ct);
            throw new BusinessRuleException(BusinessRuleCodes.InvalidCredentials, "Incorrect email or password.");
        }

        if (!user.IsActive)
        {
            throw new BusinessRuleException(BusinessRuleCodes.AccountInactive, "This account has been deactivated.");
        }

        await lockout.ResetAsync(user.Id, ct);
        user.LastLoginAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        await auditLogger.LogAsync("Auth.LoginSucceeded", nameof(User), user.Id.ToString(), null, ct);

        if (user.MustResetPassword)
        {
            var restricted = jwtTokenService.CreateRestrictedToken(user);
            return ToResponse(user, restricted);
        }

        var full = jwtTokenService.CreateFullTokenPair(user, ip);
        var refreshToken = await refreshTokenService.IssueAsync(user, ip, ct);
        return ToResponse(user, full with { RefreshToken = refreshToken });
    }

    public async Task<LoginResponse> ChangePasswordAsync(int userId, ChangePasswordRequest request, string? ip, CancellationToken ct)
    {
        var user = await db.Users.Include(u => u.InternProfile).FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException(nameof(User), userId);

        if (!hasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new BusinessRuleException(BusinessRuleCodes.InvalidCredentials, "Current password is incorrect.");
        }

        passwordPolicy.Validate(request.NewPassword, user.Email, user.FullName, user.PasswordHash);

        user.PasswordHash = hasher.Hash(request.NewPassword);
        user.MustResetPassword = false;
        user.PasswordChangedAtUtc = clock.UtcNow;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync(ct);
        await security.InvalidateAsync(userId, "Password changed", ct);
        await auditLogger.LogAsync("Auth.PasswordChanged", nameof(User), user.Id.ToString(), null, ct);

        var full = jwtTokenService.CreateFullTokenPair(user, ip);
        var refreshToken = await refreshTokenService.IssueAsync(user, ip, ct);
        return ToResponse(user, full with { RefreshToken = refreshToken });
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct);

        // Requested behavior: reject unknown/inactive emails explicitly instead of silently
        // succeeding. Note this trades away the usual "don't reveal whether an account exists"
        // protection against email enumeration - acceptable here since this is an internal
        // staff/intern system, not a public consumer product.
        if (user is null) throw new ValidationException("email", "This email address is not registered.");

        var tempPassword = tempPasswordGenerator.Generate();
        user.PasswordHash = hasher.Hash(tempPassword);
        user.MustResetPassword = true;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync(ct);
        await security.InvalidateAsync(user.Id, "Forgot-password reset", ct);

        var html = $"""
            <p>Hello {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Your password has been reset. Your new temporary password is:</p>
            <p style="font-size:20px;font-weight:bold;letter-spacing:1px;">{System.Net.WebUtility.HtmlEncode(tempPassword)}</p>
            <p>Please sign in with this password - you will be asked to set a new one immediately.</p>
            <p>If you did not request this, contact your administrator right away.</p>
            """;
        await emailQueue.EnqueueAsync(user.Email, user.FullName, "Your PIA Wings password", html, "password-reset-by-request", ct);
        await auditLogger.LogAsync("Auth.ForgotPasswordReset", nameof(User), user.Id.ToString(), null, ct);
    }

    public async Task<MeResponse> GetMeAsync(int userId, CancellationToken ct)
    {
        var user = await db.Users.Include(u => u.Department).Include(u => u.InternProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException(nameof(User), userId);

        return new MeResponse(
            user.Id, user.Role.ToString(), user.FullName, user.Email, user.Phone, user.Cnic,
            null, user.DepartmentId, user.Department?.Name, user.InternProfile?.Id, user.MustResetPassword,
            user.InternProfile?.FaceEnrollmentStatus.ToString(), user.InternProfile?.FaceReEnrollmentAllowed ?? false);
    }

    public async Task<LoginResponse> RefreshAsync(RefreshRequest request, string? ip, CancellationToken ct)
    {
        var result = await refreshTokenService.RotateAsync(request.RefreshToken, ip, ct)
            ?? throw new BusinessRuleException(BusinessRuleCodes.InvalidCredentials, "Refresh token is invalid or expired.");

        return ToResponse(result.User, result.Tokens);
    }

    public Task LogoutAsync(RefreshRequest request, CancellationToken ct) =>
        refreshTokenService.RevokeAsync(request.RefreshToken, "User signed out", ct);

    public async Task LogoutAllAsync(int userId, CancellationToken ct)
    {
        await refreshTokenService.RevokeAllForUserAsync(userId, "Sign out everywhere", ct);
        await security.InvalidateAsync(userId, "Sign out everywhere", ct);
    }

    private static LoginResponse ToResponse(User user, TokenPair tokens) => new(
        tokens.AccessToken, tokens.RefreshToken, tokens.AccessTokenExpiresAtUtc,
        user.MustResetPassword, user.Role.ToString(), user.FullName, user.Id);
}
