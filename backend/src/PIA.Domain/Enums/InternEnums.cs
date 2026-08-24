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
    /// <summary>Deprecated - superseded by CnicFront/CnicBack. Kept so historically uploaded
    /// documents under the old single combined slot still deserialize correctly.</summary>
    Cnic,
    Resume,
    ReferenceLetter,
    CnicFront,
    CnicBack,
    /// <summary>The one optional 5th slot - either a file upload or a pasted link (InternDocument.ExternalLinkUrl).</summary>
    ExtraDocument,
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
