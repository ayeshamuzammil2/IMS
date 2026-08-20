using PIA.Application.Contracts.Attendance;

namespace PIA.Application.Abstractions;

/// <summary>Mentor/Admin oversight for the two things a fully-automated pipeline deliberately
/// cannot resolve on its own: a soft-flagged (AcceptedWithReview) mark, and a manual override for
/// when biometric marking genuinely was not possible.</summary>
public interface IAttendanceReviewService
{
    Task<IReadOnlyList<ReviewQueueItemDto>> GetPendingReviewsAsync(CancellationToken ct);

    Task DecideReviewAsync(long attendanceDayId, ReviewDecisionRequest request, CancellationToken ct);

    Task<AttendanceOverrideDto> RequestOverrideAsync(int internProfileId, RequestOverrideRequest request, CancellationToken ct);

    Task<IReadOnlyList<AttendanceOverrideDto>> GetPendingOverridesAsync(CancellationToken ct);

    Task DecideOverrideAsync(long overrideId, DecideOverrideRequest request, CancellationToken ct);
}
