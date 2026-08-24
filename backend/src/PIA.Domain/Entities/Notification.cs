using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class Notification
{
    public long Id { get; set; }
    public int RecipientUserId { get; set; }
    public User Recipient { get; set; } = null!;
    public required string Title { get; set; }
    public required string Body { get; set; }
    public NotificationType Type { get; set; } = NotificationType.Info;
    public NotificationCategory Category { get; set; } = NotificationCategory.System;
    public string? RelatedEntityType { get; set; }
    public string? RelatedEntityId { get; set; }
    public string? ActionRoute { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

/// <summary>An Expo push token registered by a device - a user can have more than one (multiple
/// devices), so notifications fan out to every active token on file for them.</summary>
public class PushToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public required string ExpoPushToken { get; set; }
    public string? DeviceId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime LastUsedAtUtc { get; set; }
}
