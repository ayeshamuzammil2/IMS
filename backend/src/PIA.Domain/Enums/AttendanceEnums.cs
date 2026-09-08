namespace PIA.Domain.Enums;

public enum AttendanceStatus
{
    Present,
    Late,
    Absent,
    Leave,
    Holiday,
}

public enum AttendanceEventType
{
    Arrival,
    Departure,
}

public enum AttendanceEventOutcome
{
    Accepted,
    AcceptedWithReview,
    RejectedGeofence,
    RejectedLiveness,
    RejectedFaceMismatch,
    RejectedDuplicate,
    RejectedNotVerified,
    RejectedOutsidePeriod,
    RejectedChallengeExpired,
    RejectedReplayDetected,
    RejectedAttestationFailed,
}

public enum GeofenceState
{
    Inside,
    Uncertain,
    Outside,
}

public enum VerificationMode
{
    FullBiometric,
    MatchOnly,
    GeofenceOnly,
    Manual,
}

public enum ChallengeSessionState
{
    Issued,
    Submitted,
    Passed,
    SoftFailed,
    HardFailed,
    Expired,
    Abandoned,
}

public enum AttendanceSource
{
    Biometric,
    ManualOverride,
    SystemAbsent,
}

/// <summary>Reasons GET /api/attendance/today can refuse to let an intern open a marking session.
/// Purely additive - later phases (verification lock in Phase 6, device binding in Phase 9) add
/// members here without changing the shape of the response.</summary>
public enum AttendanceBlocker
{
    AccountInactive,
    NoDepartmentAssigned,
    OutsideInternshipPeriod,
    HolidayToday,
    OnApprovedLeave,
    ArrivalAlreadyMarked,
    DepartureAlreadyMarked,
    ArrivalNotYetMarked,
    ActiveSessionAlreadyOpen,
    NotVerified,
    /// <summary>Phase 5 dual-lock: both an Admin/Mentor-approved profile photo AND a completed
    /// face enrollment are required before the camera may even open, not just before submit.</summary>
    FaceNotReady,
    /// <summary>Outside the intern's own assigned DailyStartTime/DailyEndTime window (with a
    /// small grace margin) - distinct from OutsideInternshipPeriod, which is about the calendar
    /// date range, not the time of day.</summary>
    OutsideDailyTimeWindow,
}

/// <summary>Actions the server can request during a challenge sequence (Phase 5). MLKit reports the
/// client's observed pose/eye-state for each; the server never trusts the client's own pass/fail
/// claim, only the raw observations, cross-checked against what was actually requested.</summary>
public enum ChallengeActionType
{
    HoldStill,
    TurnLeft,
    TurnRight,
    Blink,
    Smile,
    NodUp,
    NodDown,
}

/// <summary>What a video-replay/geometry detector concluded about one signal. Inconclusive is the
/// default whenever the detector's preconditions aren't met (bad light, insufficient rotation,
/// too far) - a detector must never fabricate a Suspicious/LiveConsistent verdict it can't support,
/// since that is what keeps honest-user false-rejects down.</summary>
public enum DetectorVerdict
{
    Inconclusive,
    LiveConsistent,
    Suspicious,
}
