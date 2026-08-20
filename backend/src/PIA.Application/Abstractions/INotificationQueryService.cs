using PIA.Application.Contracts.Notifications;

namespace PIA.Application.Abstractions;

public interface INotificationQueryService
{
    Task<NotificationListResponse> ListAsync(int userId, bool unreadOnly, int page, int pageSize, CancellationToken ct);
    Task<int> GetUnreadCountAsync(int userId, CancellationToken ct);
    Task MarkReadAsync(int userId, long notificationId, CancellationToken ct);
    Task MarkAllReadAsync(int userId, CancellationToken ct);
}
