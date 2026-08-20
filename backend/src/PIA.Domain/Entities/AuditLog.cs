namespace PIA.Domain.Entities;

public class AuditLog
{
    public long Id { get; set; }
    public int? ActorUserId { get; set; }
    public string? ActorRole { get; set; }
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public required string CorrelationId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
