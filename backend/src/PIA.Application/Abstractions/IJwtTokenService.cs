using PIA.Domain.Entities;

namespace PIA.Application.Abstractions;

public sealed record TokenPair(string AccessToken, string? RefreshToken, DateTime AccessTokenExpiresAtUtc);

public interface IJwtTokenService
{
    /// <summary>Full-scope token pair, issued once MustResetPassword is false.</summary>
    TokenPair CreateFullTokenPair(User user, string? createdByIp);

    /// <summary>Restricted scope=pwd_reset token: 15 min, no refresh token, gated to a handful of endpoints.</summary>
    TokenPair CreateRestrictedToken(User user);
}
