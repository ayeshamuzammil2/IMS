namespace PIA.Application.Abstractions;

/// <summary>Fire-and-forget push delivery for the async workflow-event notification catalog
/// (NotificationTemplates.cs) - complements the DB row + optional email NotificationService
/// already writes, it never replaces them. A failure here must never fail the caller's request;
/// implementations swallow/log delivery errors internally.</summary>
public interface IPushNotificationSender
{
    Task SendAsync(IReadOnlyList<string> expoPushTokens, string title, string body, string? actionRoute, CancellationToken ct);
}

public interface IPushTokenService
{
    Task RegisterAsync(int userId, string expoPushToken, string? deviceId, CancellationToken ct);
}
