namespace PIA.Domain.Enums;

public enum VerificationStatus
{
    PendingSubmission,
    PendingReview,
    Verified,
    Rejected,
}

public enum ProfilePhotoStatus
{
    Missing,
    Pending,
    Approved,
    Rejected,
}

public enum FaceEnrollmentStatus
{
    None,
    Pending,
    Active,
    Superseded,
    Revoked,
}

public enum DocumentType
{
    ProfilePhoto,
    Cnic,
    Resume,
    ReferenceLetter,
}

public enum DocumentStatus
{
    Pending,
    Approved,
    Rejected,
}

public enum GithubStatus
{
    NotSubmitted,
    Pending,
    Approved,
    Rejected,
    ResubmitRequested,
}

public enum ProjectAssignmentStatus
{
    Assigned,
    Submitted,
    Completed,
}

public enum AttendanceAccommodation
{
    None,
    ReducedBiometric,
    ManualOnly,
}
