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

public sealed record ForgotPasswordRequest(string Email);

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
    bool MustResetPassword
);
