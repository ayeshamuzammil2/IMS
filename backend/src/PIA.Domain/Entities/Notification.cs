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
