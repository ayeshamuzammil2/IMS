using PIA.Application.Contracts.Attendance;

namespace PIA.Application.Abstractions;

/// <summary>Live face enrollment - deliberately separate from the (static) approved profile
/// photo. The live capture must cross-match the approved photo above threshold before a
/// FaceTemplate is stored; this cross-match is the system's strongest anti-impersonation control.</summary>
public interface IFaceEnrollmentService
{
    Task<EnrollmentSessionResponse> CreateSessionAsync(CreateEnrollmentSessionRequest request, CancellationToken ct);

    Task<EnrollmentResult> SubmitAsync(Guid sessionId, SubmitEnrollmentRequest request, CancellationToken ct);

    /// <summary>Admin-facing biometric erasure - revokes the intern's active face template (if
    /// any) and resets enrollment status to Revoked, forcing a fresh live enrollment (with a new
    /// cross-match against the approved photo) before biometric attendance can resume.</summary>
    Task RevokeAsync(int internProfileId, string reason, CancellationToken ct);

    /// <summary>Admin-facing one-time unlock: enrollment is locked by default once a template is
    /// Active (see InternProfile.FaceReEnrollmentAllowed), so this is the only way an already-
    /// enrolled intern can submit a new enrollment. The unlock is consumed automatically by the
    /// next successful SubmitAsync call - it does not stay open.</summary>
    Task UnlockReEnrollmentAsync(int internProfileId, string reason, CancellationToken ct);

    /// <summary>Mentor/Admin review queue - every intern profile currently sitting at
    /// FaceEnrollmentStatus.Pending (passed the automatic checks, awaiting a human decision).
    /// Mentors only see their own interns; Admin sees everyone.</summary>
    Task<IReadOnlyList<FaceEnrollmentReviewQueueItemDto>> GetPendingReviewsAsync(CancellationToken ct);

    /// <summary>Full detail (both photos + scores) for one pending enrollment.</summary>
    Task<FaceEnrollmentReviewDetailDto> GetReviewDetailAsync(int internProfileId, CancellationToken ct);

    /// <summary>Approve moves FaceEnrollmentStatus Pending -> Active (attendance unlocks). Reject
    /// deactivates the pending template and resets status so the intern can immediately capture a
    /// fresh enrollment themselves - no admin unlock needed, since this was never "already
    /// active" in the first place.</summary>
    Task DecideReviewAsync(int internProfileId, DecideFaceEnrollmentRequest request, CancellationToken ct);
}
