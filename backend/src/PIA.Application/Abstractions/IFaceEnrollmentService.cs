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
}
