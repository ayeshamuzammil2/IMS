namespace PIA.Application.Abstractions;

public sealed record UserSecurityState(bool Found, bool IsActive, string SecurityStamp, bool MustResetPassword, string Role, int? DepartmentId);

/// <summary>
/// The single lever for token invalidation. Rotating a user's SecurityStamp makes every
/// previously issued JWT fail validation on its next request (see SecurityStampValidator).
/// Called on: password change, admin/mentor password reset, deactivation, role/department change,
/// and explicit "sign out everywhere".
/// </summary>
public interface IUserSecurityService
{
    Task InvalidateAsync(int userId, string reason, CancellationToken ct);
    Task<UserSecurityState> GetStateAsync(int userId, CancellationToken ct);
}

public interface IPasswordPolicyService
{
    /// <summary>Throws ValidationException with per-rule messages if the password does not satisfy policy.</summary>
    void Validate(string password, string? email = null, string? fullName = null, string? currentPasswordHash = null);
}

public interface ILoginLockoutService
{
    Task<bool> IsLockedOutAsync(int userId, CancellationToken ct);
    Task RegisterFailureAsync(int userId, CancellationToken ct);
    Task ResetAsync(int userId, CancellationToken ct);
}
