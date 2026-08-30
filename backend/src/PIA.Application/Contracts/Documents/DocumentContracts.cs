namespace PIA.Application.Contracts.Documents;

public sealed record DocumentDto(
    int Id,
    string DocumentType,
    Guid? FileId,
    string? ExternalLinkUrl,
    int Version,
    string Status,
    string? Remarks,
    DateTime UploadedAtUtc,
    int? ReviewedByUserId,
    DateTime? ReviewedAtUtc);

/// <summary>Content is a raw Stream (not IFormFile), matching IFileStorage.FileSaveRequest, so
/// Application stays framework-agnostic - the Api-layer controller does the IFormFile translation.</summary>
public sealed record UploadDocumentRequest(
    Stream Content,
    string FileName,
    string? ContentType,
    string DocumentType);

/// <summary>The optional extra slot's link path - the only DocumentType submittable without a file.</summary>
public sealed record SubmitExtraDocumentLinkRequest(string Url);

public sealed record SubmitSelfDetailsRequest(
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? BloodGroup);

public sealed record InternDashboardDto(
    int InternProfileId,
    string FullName,
    string Email,
    string? Phone,
    string? Cnic,
    string InternCode,
    string DepartmentName,
    string MentorName,
    DateOnly InternshipStartDate,
    DateOnly InternshipEndDate,
    TimeOnly DailyStartTime,
    TimeOnly DailyEndTime,
    string? UniversityName,
    string? DegreeProgram,
    string VerificationStatus,
    string ProfilePhotoStatus,
    Guid? ApprovedPhotoFileId,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? BloodGroup,
    bool SelfDetailsSubmitted,
    IReadOnlyList<DocumentDto> Documents);

public sealed record DocumentReviewQueueItemDto(
    int DocumentId,
    int InternProfileId,
    string InternFullName,
    string InternCode,
    int? DepartmentId,
    string? DepartmentName,
    string DocumentType,
    Guid? FileId,
    string? ContentType,
    string? ExternalLinkUrl,
    int Version,
    DateTime UploadedAtUtc);

public sealed record ReviewDocumentRequest(bool Approve, string? Remarks);
