using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Domain.Entities;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Auth;

public sealed class RefreshTokenService(PiaDbContext db, IOptions<JwtOptions> options, IJwtTokenService jwtTokenService, IClock clock)
    : IRefreshTokenService
{
    public async Task<string> IssueAsync(User user, string? createdByIp, CancellationToken ct)
    {
        var raw = GenerateRawToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = Hash(raw),
            ExpiresAtUtc = clock.UtcNow.AddDays(options.Value.RefreshTokenLifetimeDays),
            CreatedAtUtc = clock.UtcNow,
            CreatedByIp = createdByIp,
        });
        await db.SaveChangesAsync(ct);
        return raw;
    }

    public async Task<RefreshResult?> RotateAsync(string rawToken, string? createdByIp, CancellationToken ct)
    {
        var hash = Hash(rawToken);
        var existing = await db.RefreshTokens.Include(t => t.User).ThenInclude(u => u.Department)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (existing is null) return null;

        if (existing.RevokedAtUtc is not null)
        {
            // Reuse of an already-rotated token: revoke the entire family for this user.
            await RevokeAllForUserAsync(existing.UserId, "Refresh token reuse detected", ct);
            return null;
        }

        if (existing.ExpiresAtUtc <= clock.UtcNow) return null;

        var user = existing.User;
        if (!user.IsActive) return null;

        var newRaw = GenerateRawToken();
        var newToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = Hash(newRaw),
            ExpiresAtUtc = clock.UtcNow.AddDays(options.Value.RefreshTokenLifetimeDays),
            CreatedAtUtc = clock.UtcNow,
            CreatedByIp = createdByIp,
        };
        db.RefreshTokens.Add(newToken);

        existing.RevokedAtUtc = clock.UtcNow;
        existing.ReplacedByTokenId = newToken.Id;
        existing.RevokedReason = "Rotated";

        await db.SaveChangesAsync(ct);

        var accessTokens = jwtTokenService.CreateFullTokenPair(user, createdByIp);
        return new RefreshResult(user, accessTokens with { RefreshToken = newRaw });
    }

    public async Task RevokeAsync(string rawToken, string reason, CancellationToken ct)
    {
        var hash = Hash(rawToken);
        var existing = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (existing is null || existing.RevokedAtUtc is not null) return;

        existing.RevokedAtUtc = clock.UtcNow;
        existing.RevokedReason = reason;
        await db.SaveChangesAsync(ct);
    }

    public async Task RevokeAllForUserAsync(int userId, string reason, CancellationToken ct)
    {
        var active = await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ToListAsync(ct);

        foreach (var token in active)
        {
            token.RevokedAtUtc = clock.UtcNow;
            token.RevokedReason = reason;
        }
        await db.SaveChangesAsync(ct);
    }

    private static string GenerateRawToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string Hash(string raw) => Convert.ToHexString(SHA256.HashData(Convert.FromBase64String(raw)));
}
