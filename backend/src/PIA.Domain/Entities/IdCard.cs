using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class IdCard
{
    public int Id { get; set; }
    public int InternProfileId { get; set; }
    public InternProfile InternProfile { get; set; } = null!;
    public required string CardNumber { get; set; }
    public IdCardStatus Status { get; set; } = IdCardStatus.Draft;
    public string? BloodGroup { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Address { get; set; }
    public string? Designation { get; set; }
    public DateOnly ValidUntil { get; set; }
    public Guid? GeneratedFileId { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public int? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public int? IssuedByUserId { get; set; }
    public DateTime? IssuedAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
