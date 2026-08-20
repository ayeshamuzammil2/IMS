using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class CertificateTemplate
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public int? DepartmentId { get; set; }
    public Guid FileId { get; set; }
    public string? MergeFieldsJson { get; set; }
    public int UploadedByUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
}

public class Certificate
{
    public int Id { get; set; }
    public int InternProfileId { get; set; }
    public InternProfile InternProfile { get; set; } = null!;
    public required string CertificateNumber { get; set; }
    public CertificateStatus Status { get; set; } = CertificateStatus.Locked;
    public int? TemplateId { get; set; }
    public Guid? GeneratedFileId { get; set; }
    public int? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public int? IssuedByUserId { get; set; }
    public DateTime? IssuedAtUtc { get; set; }
    public DateOnly? IssueDate { get; set; }
    public string? RejectionReason { get; set; }
    public CertificateRenderedBy? RenderedBy { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
