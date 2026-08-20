using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Notifications;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Notifications;

public sealed class NotificationQueryService(PiaDbContext db, IClock clock) : INotificationQueryService
{
    public async Task<NotificationListResponse> ListAsync(int userId, bool unreadOnly, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Notifications.AsNoTracking().Where(n => n.RecipientUserId == userId);
        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Body, n.Type.ToString(), n.Category.ToString(), n.ActionRoute, n.IsRead, n.CreatedAtUtc))
            .ToListAsync(ct);

        return new NotificationListResponse(items, total);
    }

    public Task<int> GetUnreadCountAsync(int userId, CancellationToken ct) =>
        db.Notifications.AsNoTracking().CountAsync(n => n.RecipientUserId == userId && !n.IsRead, ct);

    public async Task MarkReadAsync(int userId, long notificationId, CancellationToken ct)
    {
        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId, ct)
            ?? throw new NotFoundException("Notification", notificationId);

        if (notification.RecipientUserId != userId)
        {
            throw new ForbiddenException("You are not allowed to modify this notification.");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = clock.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task MarkAllReadAsync(int userId, CancellationToken ct)
    {
        var unread = await db.Notifications.Where(n => n.RecipientUserId == userId && !n.IsRead).ToListAsync(ct);
        if (unread.Count == 0) return;

        var now = clock.UtcNow;
        foreach (var notification in unread)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = now;
        }
        await db.SaveChangesAsync(ct);
    }
}
