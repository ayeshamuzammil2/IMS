using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Auth;

public sealed class LoginLockoutService(PiaDbContext db, IOptions<LoginLockoutOptions> options, IClock clock) : ILoginLockoutService
{
    public async Task<bool> IsLockedOutAsync(int userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        return user?.LockoutEndUtc is { } lockoutEnd && lockoutEnd > clock.UtcNow;
    }

    public async Task RegisterFailureAsync(int userId, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return;

        var opts = options.Value;
        user.FailedLoginCount++;

        if (user.FailedLoginCount >= opts.MaxFailedAttempts)
        {
            var priorLockouts = Math.Max(0, user.FailedLoginCount / opts.MaxFailedAttempts - 1);
            var minutes = Math.Min(opts.InitialLockoutMinutes * (int)Math.Pow(2, priorLockouts), opts.MaxLockoutMinutes);
            user.LockoutEndUtc = clock.UtcNow.AddMinutes(minutes);
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task ResetAsync(int userId, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return;

        user.FailedLoginCount = 0;
        user.LockoutEndUtc = null;
        await db.SaveChangesAsync(ct);
    }
}
