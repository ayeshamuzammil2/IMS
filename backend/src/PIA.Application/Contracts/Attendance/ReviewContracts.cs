namespace PIA.Application.Contracts.Attendance;

public sealed record ReviewQueueItemDto(
    long AttendanceDayId,
    int InternProfileId,
    string InternFullName,
    string InternCode,
    DateOnly WorkDate,
    Guid? ArrivalSelfieFileId,
    DateTime? ArrivalAtUtc,
    Guid? DepartureSelfieFileId,
    DateTime? DepartureAtUtc,
    double? DistanceM,
    string? GeofenceState,
    IReadOnlyList<string> Flags);

public sealed record ReviewDecisionRequest(bool Approve, string? Note);

public sealed record RequestOverrideRequest(
    string EventType,
    string ReasonCode,
    string Justification,
    DateOnly WorkDate,
    TimeOnly MarkedAtLocalTime);

public sealed record DecideOverrideRequest(bool Approve, string? Note);

public sealed record AttendanceOverrideDto(
    long Id,
    int InternProfileId,
    string InternFullName,
    string EventType,
    string ReasonCode,
    string Justification,
    string? Decision,
    bool QuotaExceeded,
    DateTime RequestedAtUtc,
    DateTime MarkedAtUtc);
