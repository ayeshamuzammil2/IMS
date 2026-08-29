namespace PIA.Domain.Exceptions;

/// <summary>
/// Canonical BusinessRuleException codes. The mobile app branches on these, never on message text.
/// </summary>
public static class BusinessRuleCodes
{
    public const string PasswordResetRequired = "PASSWORD_RESET_REQUIRED";
    public const string AccountInactive = "ACCOUNT_INACTIVE";
    public const string AccountLockedOut = "ACCOUNT_LOCKED_OUT";
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string PasswordPolicyViolation = "PASSWORD_POLICY_VIOLATION";
    public const string ResetCodeInvalidOrExpired = "RESET_CODE_INVALID_OR_EXPIRED";

    public const string NotVerified = "NOT_VERIFIED";
    public const string NoApprovedPhoto = "NO_APPROVED_PHOTO";
    public const string AttendanceLocked = "ATTENDANCE_LOCKED";
    public const string OutsideInternshipPeriod = "OUTSIDE_INTERNSHIP_PERIOD";
    public const string OutsideDailyWindow = "OUTSIDE_DAILY_WINDOW";
    public const string OutsideGeofence = "OUTSIDE_GEOFENCE";
    public const string LivenessFailed = "LIVENESS_FAILED";
    public const string FaceMismatch = "FACE_MISMATCH";
    public const string ChallengeExpired = "CHALLENGE_EXPIRED";
    public const string SessionAlreadyConsumed = "SESSION_ALREADY_CONSUMED";
    public const string FrameReplayDetected = "FRAME_REPLAY_DETECTED";
    public const string SpoofDetected = "SPOOF_DETECTED";
    public const string AlreadyMarked = "ALREADY_MARKED";
    public const string ArrivalRequiredFirst = "ARRIVAL_REQUIRED_FIRST";
    public const string AttemptLimitReached = "ATTEMPT_LIMIT_REACHED";
    public const string FaceVerificationUnavailable = "FACE_VERIFICATION_UNAVAILABLE";
    public const string AttestationFailed = "ATTESTATION_FAILED";
    public const string MockLocationDetected = "MOCK_LOCATION_DETECTED";
    public const string RetryCooldownActive = "RETRY_COOLDOWN_ACTIVE";
    public const string UnofficialActivityLockout = "UNOFFICIAL_ACTIVITY_LOCKOUT";

    public const string CertificateNotEligible = "CERTIFICATE_NOT_ELIGIBLE";
    public const string IdCardNoPhoto = "IDCARD_NO_PHOTO";
    public const string IdCardNotReadyForDownload = "IDCARD_NOT_READY_FOR_DOWNLOAD";
    public const string DesignationRequired = "DESIGNATION_REQUIRED";
    public const string TemplateUnknownMergeFields = "TEMPLATE_UNKNOWN_MERGE_FIELDS";

    public const string InvalidFileType = "INVALID_FILE_TYPE";
    public const string FileTooLarge = "FILE_TOO_LARGE";
    public const string CorruptFile = "CORRUPT_FILE";
}
