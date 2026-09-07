namespace PIA.Application.Contracts.Auth;

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(
    string AccessToken,
    string? RefreshToken,
    DateTime AccessTokenExpiresAtUtc,
    bool MustResetPassword,
    string Role,
    string FullName,
    int UserId
);

public sealed record RefreshRequest(string RefreshToken);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record ForgotPasswordRequest(string Email, string NewPassword);

public sealed record MeResponse(
    int UserId,
    string Role,
    string FullName,
    string Email,
    string? Phone,
    string? Cnic,
    string? ProfileImageUrl,
    int? DepartmentId,
    string? DepartmentName,
    int? InternProfileId,
    bool MustResetPassword,
    /// <summary>Null for non-interns. Lets the app gate the "Start Enrollment" UI before the
    /// intern ever attempts a submit, instead of only surfacing the lock as a submit-time error.</summary>
    string? FaceEnrollmentStatus,
    bool FaceReEnrollmentAllowed
);
