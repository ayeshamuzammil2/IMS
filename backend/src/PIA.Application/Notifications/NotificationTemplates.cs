using PIA.Domain.Enums;

namespace PIA.Application.Notifications;

public sealed record NotificationTemplate(
    string Key,
    string TitleTemplate,
    string BodyTemplate,
    NotificationType Type,
    NotificationCategory Category,
    string? ActionRoute,
    string? EmailTemplateKey
);

/// <summary>
/// The single wording catalog for every in-app notification. Emission always lives inside the
/// service method that makes the state change, never in the controller - see
/// InternWorkflowNotificationTests (added in Phase 9) for the coverage check that a workflow
/// can't ship without a corresponding entry here being fired.
/// </summary>
public static class NotificationTemplates
{
    public static readonly NotificationTemplate AccountCreatedMentor = new(
        "account.created.mentor",
        "Welcome to PIA Wings",
        "Your mentor account has been created for the {{ department_name }} department. Sign in with the password your administrator gave you - you'll be asked to set a new one immediately.",
        NotificationType.Success, NotificationCategory.Account, null, "mentor-welcome");

    public static readonly NotificationTemplate AccountCreatedIntern = new(
        "account.created.intern",
        "Welcome to PIA Wings",
        "Your internship account has been created. Sign in with the password your admin or mentor gave you - you'll be asked to set a new one immediately.",
        NotificationType.Success, NotificationCategory.Account, null, "intern-welcome");

    public static readonly NotificationTemplate PasswordResetByAdmin = new(
        "account.password_reset_by_admin",
        "Your password was reset",
        "An administrator or mentor reset your password. Sign in with the new password they gave you - you'll be asked to set a new one immediately.",
        NotificationType.Warning, NotificationCategory.Account, null, "password-reset-by-admin");

    public static readonly NotificationTemplate PasswordChanged = new(
        "account.password_changed",
        "Password changed",
        "Your password was changed successfully at {{ changed_at }}.",
        NotificationType.Info, NotificationCategory.Account, null, "password-changed");

    public static readonly NotificationTemplate AccountDeactivated = new(
        "account.deactivated",
        "Account deactivated",
        "Your account has been deactivated. Contact your administrator if you believe this is a mistake.",
        NotificationType.Error, NotificationCategory.Account, null, "account-deactivated");

    public static readonly NotificationTemplate DepartmentTransferred = new(
        "mentor.department_transferred",
        "Department changed",
        "You have been moved to the {{ department_name }} department.",
        NotificationType.Info, NotificationCategory.Account, null, null);

    public static readonly NotificationTemplate DocumentApproved = new(
        "document.approved",
        "Document approved",
        "Your {{ document_type }} has been approved.",
        NotificationType.Success, NotificationCategory.Document, null, null);

    public static readonly NotificationTemplate DocumentRejected = new(
        "document.rejected",
        "Document needs resubmission",
        "Your {{ document_type }} was rejected: {{ reason }}. Please upload a new one.",
        NotificationType.Warning, NotificationCategory.Document, null, null);

    public static readonly NotificationTemplate ProfileVerified = new(
        "verification.completed",
        "Verification complete",
        "All your documents have been approved. Attendance marking is now unlocked.",
        NotificationType.Success, NotificationCategory.Verification, null, null);

    public static readonly NotificationTemplate GithubApproved = new(
        "github.approved",
        "GitHub repository approved",
        "Your GitHub repository submission has been approved.",
        NotificationType.Success, NotificationCategory.Github, "GithubRepo", null);

    public static readonly NotificationTemplate GithubRejected = new(
        "github.rejected",
        "GitHub repository rejected",
        "Your GitHub repository submission was rejected: {{ reason }}.",
        NotificationType.Warning, NotificationCategory.Github, "GithubRepo", null);

    public static readonly NotificationTemplate GithubResubmitRequested = new(
        "github.resubmit_requested",
        "GitHub repository - resubmission requested",
        "Your mentor asked you to resubmit your GitHub repository: {{ reason }}.",
        NotificationType.Warning, NotificationCategory.Github, "GithubRepo", null);

    public static readonly NotificationTemplate ProjectAssigned = new(
        "project.assigned",
        "New project assigned",
        "You have been assigned a new project: {{ title }}.",
        NotificationType.Info, NotificationCategory.Project, "InternshipTask", null);

    public static readonly NotificationTemplate CertificateIssued = new(
        "certificate.issued",
        "Certificate issued",
        "Your internship completion certificate has been issued.",
        NotificationType.Success, NotificationCategory.Certificate, "Certificate", null);

    public static readonly NotificationTemplate IdCardIssued = new(
        "idcard.issued",
        "ID card issued",
        "Your internee ID card has been issued.",
        NotificationType.Success, NotificationCategory.IdCard, "IdCard", null);

    public static readonly NotificationTemplate BiometricErased = new(
        "biometric.erased",
        "Face enrollment reset",
        "An administrator has erased your face enrollment data ({{ reason }}). Please enroll again before marking biometric attendance.",
        NotificationType.Warning, NotificationCategory.Account, null, null);

    public static readonly NotificationTemplate FaceReEnrollmentUnlocked = new(
        "biometric.reenrollment_unlocked",
        "Face re-enrollment unlocked",
        "An administrator has unlocked one face re-enrollment for you ({{ reason }}). You can update your enrolled face once from the Face Enrollment screen; it will lock again automatically afterward.",
        NotificationType.Info, NotificationCategory.Account, null, null);

    public static readonly NotificationTemplate FaceEnrollmentApproved = new(
        "biometric.enrollment_approved",
        "Face enrollment approved",
        "Your mentor/admin has reviewed and approved your face enrollment. Biometric attendance is now unlocked.",
        NotificationType.Success, NotificationCategory.Account, null, null);

    public static readonly NotificationTemplate FaceEnrollmentRejected = new(
        "biometric.enrollment_rejected",
        "Face enrollment needs to be redone",
        "Your face enrollment was rejected on review: {{ reason }}. Please enroll again from the Face Enrollment screen.",
        NotificationType.Warning, NotificationCategory.Account, null, null);
}
