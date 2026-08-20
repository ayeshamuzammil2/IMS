using PIA.Domain.Entities;

namespace PIA.Application.Abstractions;

public sealed record RefreshResult(User User, TokenPair Tokens);

public interface IRefreshTokenService
{
    /// <summary>Persists a hashed refresh token row and returns the raw token to hand to the client.</summary>
    Task<string> IssueAsync(User user, string? createdByIp, CancellationToken ct);

    /// <summary>
    /// Validates and rotates a refresh token. Returns null if the token is unknown/expired/revoked.
    /// Reuse of an already-rotated token revokes the entire token family for that user.
    /// </summary>
    Task<RefreshResult?> RotateAsync(string rawToken, string? createdByIp, CancellationToken ct);

    Task RevokeAsync(string rawToken, string reason, CancellationToken ct);
    Task RevokeAllForUserAsync(int userId, string reason, CancellationToken ct);
}
