namespace PIA.Application.Contracts.Certificates;

/// <summary>Content is a raw Stream (not IFormFile), matching IFileStorage.FileSaveRequest - the
/// Api-layer controller does the IFormFile translation.</summary>
public sealed record UploadCertificateTemplateRequest(
    Stream Content,
    string FileName,
    string Name,
    int? DepartmentId);

public sealed record CertificateTemplateDto(
    int Id,
    string Name,
    int? DepartmentId,
    IReadOnlyList<string> MergeFields,
    bool IsActive,
    DateTime CreatedAtUtc);

public sealed record CertificateDto(
    int InternProfileId,
    string? InternFullName,
    string? InternCode,
    string? DepartmentName,
    string? CertificateNumber,
    string Status,
    Guid? GeneratedFileId,
    DateOnly? IssueDate,
    string? RejectionReason,
    /// <summary>Attendance percentage across the intern's recorded working days (Present+Late /
    /// Present+Late+Absent, i.e. holidays/approved leave don't count against them). Null only if
    /// no attendance has been recorded yet. Computed on the fly - not persisted.</summary>
    double? AttendancePercentage,
    /// <summary>Short, human-readable performance remark auto-derived from AttendancePercentage -
    /// intended to appear on the certificate/next to it. See CertificateService.DeriveRemark.</summary>
    string? AttendanceRemark);

public sealed record GenerateCertificateRequest(int TemplateId);

/// <summary>Mentor/Admin-facing manual replace - lets a mentor attach/replace the certificate
/// document directly (e.g. a hand-edited copy) instead of re-rendering from a template. Content
/// is a raw Stream, matching IFileStorage.FileSaveRequest - the Api-layer controller does the
/// IFormFile translation.</summary>
public sealed record UploadCertificateRequest(Stream Content, string FileName, string? ContentType);

public sealed record GeneratedFileResult(byte[] Content, string FileName, string ContentType);
