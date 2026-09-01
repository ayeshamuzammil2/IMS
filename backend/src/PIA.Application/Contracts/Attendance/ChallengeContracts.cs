using PIA.Domain.Enums;

namespace PIA.Application.Contracts.Attendance;

public sealed record ChallengeStepDto(ChallengeActionType Action, int HoldMs);

public sealed record ChallengeSpecDto(IReadOnlyList<ChallengeStepDto> Steps);

public sealed record LandmarkPointDto(double X, double Y);

public sealed record BoundingBoxDto(double X, double Y, double Width, double Height);

/// <summary>Per-frame telemetry as reported by the client's on-device MLKit frame processor -
/// informational only. The server never trusts this for a pass/fail decision by itself; it is
/// cross-checked against what was actually requested and against the server's own pixel analysis.
/// BoundingBox is measured against MLKit's own analysis-frame resolution, not the still photo
/// submitted alongside it, so it is NOT in the right coordinate space to crop that photo directly
/// (confirmed bug: doing so cropped background instead of the face). The server re-detects the face
/// in the actual submitted photo via IFaceDetector for cropping, and only falls back to this field
/// if that server-side detector is unavailable - so a manipulated or misaligned value here just
/// produces a degraded crop (caught by the quality gate) rather than a security bypass.</summary>
public sealed record ChallengeFrameTelemetryDto(
    int Index,
    double TimestampMs,
    string Action,
    double? Yaw,
    double? Pitch,
    double? Roll,
    double? LeftEyeOpenProbability,
    double? RightEyeOpenProbability,
    double? SmileProbability,
    BoundingBoxDto? BoundingBox,
    IReadOnlyDictionary<string, LandmarkPointDto>? Landmarks,
    string? ActiveLightQuadrant);

public sealed record SubmitChallengeFrame(
    Stream Content,
    string FileName,
    string? ContentType,
    ChallengeFrameTelemetryDto Telemetry);

public sealed record SubmitAttendanceRequest(
    IReadOnlyList<SubmitChallengeFrame> Frames,
    decimal Latitude,
    decimal Longitude,
    decimal AccuracyMeters,
    string DeviceId,
    bool? Mocked,
    string? DeviceModel,
    string? AppVersion,
    string? AttestationToken);

public sealed record SubmitAttendanceResult(
    string Outcome,
    DateTime? MarkedAtUtc,
    bool IsLate,
    bool IsEarlyLeave,
    double DistanceMeters,
    string GeofenceState,
    bool RequiresReview,
    int RiskScore,
    IReadOnlyList<string> Flags,
    string Message);
