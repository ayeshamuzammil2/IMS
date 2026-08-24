using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using PIA.Application.Abstractions;

namespace PIA.Infrastructure.Services.Notifications;

/// <summary>
/// No official Expo push SDK exists for .NET - this is a minimal client for Expo's plain REST push
/// API (https://exp.host/--/api/v2/push/send), which accepts a JSON array of messages and fans them
/// out to APNs/FCM on Expo's side. Delivery failure is swallowed and logged, never thrown: a push
/// notification is a best-effort supplement to the DB notification row NotificationService already
/// wrote, not something a request should fail over.
/// </summary>
public sealed class ExpoPushClient(HttpClient httpClient, ILogger<ExpoPushClient> logger) : IPushNotificationSender
{
    private const string PushEndpoint = "https://exp.host/--/api/v2/push/send";

    public async Task SendAsync(IReadOnlyList<string> expoPushTokens, string title, string body, string? actionRoute, CancellationToken ct)
    {
        if (expoPushTokens.Count == 0)
        {
            return;
        }

        try
        {
            var messages = expoPushTokens.Select(token => new ExpoPushMessage(
                token, title, body, actionRoute is null ? null : new Dictionary<string, string> { ["route"] = actionRoute }));

            var response = await httpClient.PostAsJsonAsync(PushEndpoint, messages, ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Expo push send failed with status {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Expo push send threw an exception");
        }
    }

    private sealed record ExpoPushMessage(string To, string Title, string Body, Dictionary<string, string>? Data);
}
