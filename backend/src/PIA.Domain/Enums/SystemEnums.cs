namespace PIA.Domain.Enums;

public enum EmailOutboxStatus
{
    Pending,
    Sending,
    Sent,
    Failed,
    Abandoned,
}

public enum FileCategory
{
    ProfilePhoto,
    CnicScan,
    Resume,
    ReferenceLetter,
    AttendanceSelfie,
    AttendanceChallengeFrame,
    ProjectFile,
    CertificateTemplate,
    GeneratedCertificate,
    GeneratedIdCard,
    ExtraDocument,
    FaceEnrollmentCapture,
}

public enum JobTrigger
{
    Schedule,
    Manual,
}

public enum FaceProviderName
{
    Onnx,
    AwsRekognition,
}

public enum EnrollmentReason
{
    Initial,
    PhotoChanged,
    Refresh,
    MentorForced,
    Recovery,
}
