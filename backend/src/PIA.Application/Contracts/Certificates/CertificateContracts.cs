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
    string? RejectionReason);

public sealed record GenerateCertificateRequest(int TemplateId);

public sealed record GeneratedFileResult(byte[] Content, string FileName, string ContentType);
