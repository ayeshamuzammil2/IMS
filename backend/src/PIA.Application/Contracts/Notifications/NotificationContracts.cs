namespace PIA.Application.Contracts.Notifications;

public sealed record NotificationDto(
    long Id, string Title, string Body, string Type, string Category,
    string? ActionRoute, bool IsRead, DateTime CreatedAtUtc);

public sealed record NotificationListResponse(IReadOnlyList<NotificationDto> Items, int TotalCount);
