namespace PIA.Application.Contracts.Attendance;

public sealed record CreateEnrollmentSessionRequest(string DeviceId);

public sealed record EnrollmentSessionResponse(Guid SessionId, DateTime ExpiresAtUtc, ChallengeSpecDto Challenge);

public sealed record SubmitEnrollmentRequest(
    IReadOnlyList<SubmitChallengeFrame> Frames,
    string DeviceId,
    bool ConsentAcknowledged);

public sealed record EnrollmentResult(bool Success, string Status, string? Message, int? TemplateVersion);
