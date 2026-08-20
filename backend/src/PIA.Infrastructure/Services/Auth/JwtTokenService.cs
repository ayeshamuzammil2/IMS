using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Services.Auth;

public static class JwtClaimTypes
{
    public const string Scope = "scope";
    public const string SecurityStamp = "sst";
    public const string DepartmentId = "dept";
    public const string InternProfileId = "intern_id";

    public const string ScopeFull = "full";
    public const string ScopePasswordReset = "pwd_reset";
}

public sealed class JwtTokenService(IOptions<JwtOptions> options, IClock clock) : IJwtTokenService
{
    public TokenPair CreateFullTokenPair(User user, string? createdByIp)
    {
        var opts = options.Value;
        var expiresAtUtc = clock.UtcNow.AddMinutes(opts.FullTokenLifetimeMinutes);
        var token = CreateToken(user, JwtClaimTypes.ScopeFull, expiresAtUtc);
        // Refresh token issuance/persistence is handled by IRefreshTokenService (needs DB access);
        // AuthController composes both and returns the pair. RefreshToken here is intentionally null.
        return new TokenPair(token, null, expiresAtUtc);
    }

    public TokenPair CreateRestrictedToken(User user)
    {
        var opts = options.Value;
        var expiresAtUtc = clock.UtcNow.AddMinutes(opts.RestrictedTokenLifetimeMinutes);
        var token = CreateToken(user, JwtClaimTypes.ScopePasswordReset, expiresAtUtc);
        return new TokenPair(token, null, expiresAtUtc);
    }

    private string CreateToken(User user, string scope, DateTime expiresAtUtc)
    {
        var opts = options.Value;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(JwtClaimTypes.Scope, scope),
            new(JwtClaimTypes.SecurityStamp, user.SecurityStamp),
        };

        if (user.DepartmentId is { } deptId)
        {
            claims.Add(new Claim(JwtClaimTypes.DepartmentId, deptId.ToString()));
        }
        if (user.InternProfile is { } profile)
        {
            claims.Add(new Claim(JwtClaimTypes.InternProfileId, profile.Id.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opts.Key));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: opts.Issuer,
            audience: opts.Audience,
            claims: claims,
            notBefore: clock.UtcNow,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
