using PIA.Application.Notifications;

namespace PIA.Application.Abstractions;

public interface INotificationService
{
    /// <summary>
    /// Renders the template, writes the Notification row, and - if the template declares an
    /// EmailTemplateKey - enqueues the matching email too. Commits via the caller's scoped
    /// DbContext in the same call, so a workflow can never silently skip the notification.
    /// </summary>
    Task NotifyUserAsync(int userId, NotificationTemplate template, IReadOnlyDictionary<string, object?> model, CancellationToken ct);
}
