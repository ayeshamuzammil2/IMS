using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using PIA.Application.Abstractions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Auth;

/// <summary>
/// The single lever for token invalidation. InvalidateAsync rotates SecurityStamp, which the
/// JWT bearer's OnTokenValidated event compares against the "sst" claim on every request - so
/// rotating it here makes every previously issued access token fail on its very next use.
/// </summary>
public sealed class UserSecurityService(PiaDbContext db, IMemoryCache cache, IClock clock) : IUserSecurityService
{
    private static string CacheKey(int userId) => $"usersec:{userId}";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    public async Task InvalidateAsync(int userId, string reason, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return;

        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        cache.Remove(CacheKey(userId));
    }

    public async Task<UserSecurityState> GetStateAsync(int userId, CancellationToken ct)
    {
        if (cache.TryGetValue<UserSecurityState>(CacheKey(userId), out var cached) && cached is not null)
        {
            return cached;
        }

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        var state = user is null
            ? new UserSecurityState(false, false, string.Empty, false, string.Empty, null)
            : new UserSecurityState(true, user.IsActive, user.SecurityStamp, user.MustResetPassword, user.Role.ToString(), user.DepartmentId);

        cache.Set(CacheKey(userId), state, CacheTtl);
        return state;
    }
}
