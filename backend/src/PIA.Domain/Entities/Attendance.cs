using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

/// <summary>One row per intern per Pakistan-local calendar day. Event-level detail lives in AttendanceEvent.</summary>
public class AttendanceDay
{
    public long Id { get; set; }
    public int InternProfileId { get; set; }
    public InternProfile InternProfile { get; set; } = null!;
    public DateOnly WorkDate { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;

    public long? ArrivalEventId { get; set; }
    public DateTime? ArrivalAtUtc { get; set; }
    public decimal? ArrivalLat { get; set; }
    public decimal? ArrivalLng { get; set; }
    public decimal? ArrivalAccuracyM { get; set; }
    public double? ArrivalDistanceM { get; set; }
    public GeofenceState? ArrivalGeofence { get; set; }
    public AttendanceSource? ArrivalSource { get; set; }
    public VerificationMode? ArrivalMode { get; set; }

    public long? DepartureEventId { get; set; }
    public DateTime? DepartureAtUtc { get; set; }
    public decimal? DepartureLat { get; set; }
    public decimal? DepartureLng { get; set; }
    public decimal? DepartureAccuracyM { get; set; }
    public double? DepartureDistanceM { get; set; }
    public GeofenceState? DepartureGeofence { get; set; }
    public AttendanceSource? DepartureSource { get; set; }
    public VerificationMode? DepartureMode { get; set; }

    public int? WorkedMinutes { get; set; }
    public bool IsLate { get; set; }
    public bool IsEarlyLeave { get; set; }
    public bool AutoClosed { get; set; }
    public bool MarkedBySystem { get; set; }
    public bool RequiresReview { get; set; }
    public int? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }

    public DateTime? VoidedAtUtc { get; set; }
    public int? VoidedByUserId { get; set; }
    public string? VoidReason { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>Every attendance attempt, accepted or rejected - the security/audit trail for marking events.</summary>
public class AttendanceEvent
{
    public long Id { get; set; }
    public long? AttendanceDayId { get; set; }
    public int InternProfileId { get; set; }
    public AttendanceEventType EventType { get; set; }
    public AttendanceEventOutcome Outcome { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public decimal? AccuracyM { get; set; }
    public double DistanceFromDepartmentM { get; set; }
    public GeofenceState GeofenceState { get; set; }
    public Guid? SelfieFileId { get; set; }
    public long? FaceVerificationResultId { get; set; }
    public Guid? ChallengeSessionId { get; set; }
    public string? DeviceModel { get; set; }
    public string? AppVersion { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
