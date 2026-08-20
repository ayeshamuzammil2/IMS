using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class EmailOutboxMessage
{
    public Guid Id { get; set; }
    public required string ToAddress { get; set; }
    public string? ToName { get; set; }
    public required string Subject { get; set; }
    public required string HtmlBody { get; set; }
    public string? TextBody { get; set; }
    public required string TemplateKey { get; set; }
    public string? AttachmentFileIdsJson { get; set; }
    public EmailOutboxStatus Status { get; set; } = EmailOutboxStatus.Pending;
    public int AttemptCount { get; set; }
    public DateTime NextAttemptAtUtc { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? SentAtUtc { get; set; }
}
