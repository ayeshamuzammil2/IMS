using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Notifications;

public sealed class PushTokenService(PiaDbContext db, IClock clock) : IPushTokenService
{
    public async Task RegisterAsync(int userId, string expoPushToken, string? deviceId, CancellationToken ct)
    {
        var existing = await db.PushTokens.FirstOrDefaultAsync(t => t.ExpoPushToken == expoPushToken, ct);
        if (existing is not null)
        {
            existing.UserId = userId;
            existing.DeviceId = deviceId;
            existing.IsActive = true;
            existing.LastUsedAtUtc = clock.UtcNow;
        }
        else
        {
            db.PushTokens.Add(new PushToken
            {
                UserId = userId,
                ExpoPushToken = expoPushToken,
                DeviceId = deviceId,
                IsActive = true,
                CreatedAtUtc = clock.UtcNow,
                LastUsedAtUtc = clock.UtcNow,
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
