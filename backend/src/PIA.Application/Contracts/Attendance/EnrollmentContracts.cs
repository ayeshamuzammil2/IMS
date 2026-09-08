namespace PIA.Application.Contracts.Attendance;

public sealed record CreateEnrollmentSessionRequest(string DeviceId);

public sealed record EnrollmentSessionResponse(Guid SessionId, DateTime ExpiresAtUtc, ChallengeSpecDto Challenge);

public sealed record SubmitEnrollmentRequest(
    IReadOnlyList<SubmitChallengeFrame> Frames,
    string DeviceId,
    bool ConsentAcknowledged);

public sealed record EnrollmentResult(bool Success, string Status, string? Message, int? TemplateVersion);

/// <summary>One row in the mentor/admin review queue - enrollments sit here (FaceEnrollmentStatus
/// = Pending) after passing the automatic cross-match/liveness checks but before a human has
/// looked at them.</summary>
public sealed record FaceEnrollmentReviewQueueItemDto(
    int InternProfileId,
    string InternFullName,
    string InternCode,
    string? DepartmentName,
    long TemplateId,
    int Version,
    DateTime CreatedAtUtc);

/// <summary>Full detail for one pending enrollment - both photos side by side plus the scores the
/// automatic checks already computed, so the reviewer can make an informed manual decision instead
/// of re-deriving anything.</summary>
public sealed record FaceEnrollmentReviewDetailDto(
    int InternProfileId,
    string InternFullName,
    string InternCode,
    string? DepartmentName,
    long TemplateId,
    int Version,
    Guid? ApprovedPhotoFileId,
    Guid? CapturedImageFileId,
    decimal? QualityScore,
    decimal? CrossMatchScore,
    decimal? IntraSetMinScore,
    string EnrollmentReason,
    DateTime CreatedAtUtc);

public sealed record DecideFaceEnrollmentRequest(bool Approve, string? Reason);
