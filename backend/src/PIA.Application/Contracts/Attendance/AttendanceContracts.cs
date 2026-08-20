namespace PIA.Application.Contracts.Attendance;

public sealed record AttendanceTodayResponse(
    DateOnly WorkDatePk,
    string DepartmentName,
    decimal DepartmentLatitude,
    decimal DepartmentLongitude,
    int GeofenceRadiusMeters,
    bool ArrivalMarked,
    DateTime? ArrivalAtUtc,
    bool ArrivalIsLate,
    bool DepartureMarked,
    DateTime? DepartureAtUtc,
    bool DepartureIsEarly,
    string Status,
    IReadOnlyList<string> ArrivalBlockers,
    IReadOnlyList<string> DepartureBlockers,
    double? DistanceMeters,
    string? GeofenceState);

public sealed record CreateAttendanceSessionRequest(
    string EventType,
    decimal Latitude,
    decimal Longitude,
    decimal AccuracyMeters,
    string DeviceId,
    bool? Mocked);

public sealed record AttendanceSessionResponse(
    Guid SessionId,
    string Nonce,
    DateTime ExpiresAtUtc,
    ChallengeSpecDto Challenge);

public sealed record TeamAttendanceRowDto(
    int InternProfileId,
    string InternFullName,
    string InternCode,
    Guid? ArrivalSelfieFileId,
    DateTime? ArrivalAtUtc,
    double? ArrivalDistanceM,
    decimal? ArrivalAccuracyM,
    bool ArrivalIsLate,
    string? ArrivalGeofenceState,
    Guid? DepartureSelfieFileId,
    DateTime? DepartureAtUtc,
    double? DepartureDistanceM,
    decimal? DepartureAccuracyM,
    bool DepartureIsEarly,
    string? DepartureGeofenceState,
    string Status);

/// <summary>One row per intern per work date within a queried range - ArrivalSource/DepartureSource
/// surface Biometric vs ManualOverride vs SystemAbsent explicitly, so a manual override is never
/// visually indistinguishable from a biometric mark in the history view or its CSV export.</summary>
public sealed record AttendanceHistoryRowDto(
    int InternProfileId,
    string InternFullName,
    string InternCode,
    string DepartmentName,
    DateOnly WorkDate,
    string Status,
    DateTime? ArrivalAtUtc,
    bool ArrivalIsLate,
    string? ArrivalSource,
    DateTime? DepartureAtUtc,
    bool DepartureIsEarly,
    string? DepartureSource);
