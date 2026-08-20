using PIA.Application.Contracts.Attendance;
using PIA.Domain.Enums;

namespace PIA.Application.Abstractions;

/// <summary>Intern-facing attendance operations - scoped to the current authenticated intern via ICurrentUser.</summary>
public interface IAttendanceService
{
    Task<AttendanceTodayResponse> GetTodayAsync(decimal? latitude, decimal? longitude, decimal? accuracyMeters, CancellationToken ct);

    Task<AttendanceSessionResponse> CreateSessionAsync(CreateAttendanceSessionRequest request, CancellationToken ct);

    Task<SubmitAttendanceResult> SubmitAsync(Guid sessionId, SubmitAttendanceRequest request, CancellationToken ct);
}

/// <summary>Mentor/Admin-facing read model - a mentor sees only their own mentees, an admin can filter by department.</summary>
public interface IAttendanceQueryService
{
    Task<IReadOnlyList<TeamAttendanceRowDto>> GetTeamTodayAsync(int? departmentId, int? mentorId, CancellationToken ct);

    Task<IReadOnlyList<AttendanceHistoryRowDto>> GetHistoryAsync(DateOnly startDate, DateOnly endDate, int? departmentId, int? mentorId, CancellationToken ct);
}

/// <summary>The nightly (or manually-triggered) sweep that marks Absent any active intern with no
/// AttendanceDay row for a work date that has already passed.</summary>
public interface IAutoAbsentJob
{
    Task<int> RunAsync(DateOnly targetDatePk, JobTrigger triggeredBy, CancellationToken ct);
}

/// <summary>The nightly (or manually-triggered) sweep that permanently purges attendance selfies
/// and challenge frames whose AttendanceOptions.SelfieRetentionDays window has passed.</summary>
public interface IMediaRetentionJob
{
    Task<int> RunAsync(JobTrigger triggeredBy, CancellationToken ct);
}
