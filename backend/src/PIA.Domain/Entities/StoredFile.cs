using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class StoredFile
{
    public Guid Id { get; set; }
    public FileCategory Category { get; set; }
    public int? OwnerUserId { get; set; }
    public int UploadedByUserId { get; set; }
    public required string StorageKey { get; set; }
    public required string OriginalFileName { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public required string Sha256 { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class InternDocument
{
    public int Id { get; set; }
    public int InternProfileId { get; set; }
    public InternProfile InternProfile { get; set; } = null!;
    public DocumentType DocumentType { get; set; }
    /// <summary>Null only for an ExtraDocument row submitted as a link - see ExternalLinkUrl. Every
    /// other document type always has a file.</summary>
    public Guid? FileId { get; set; }
    public string? ExternalLinkUrl { get; set; }
    public int Version { get; set; } = 1;
    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;
    public string? Remarks { get; set; }
    public DateTime UploadedAtUtc { get; set; }
    public int? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
}
