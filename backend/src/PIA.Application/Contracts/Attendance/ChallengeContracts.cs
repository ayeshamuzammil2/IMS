using PIA.Domain.Enums;

namespace PIA.Application.Contracts.Attendance;

public sealed record ChallengeStepDto(ChallengeActionType Action, int HoldMs);

public sealed record ChallengeSpecDto(IReadOnlyList<ChallengeStepDto> Steps);

public sealed record LandmarkPointDto(double X, double Y);

public sealed record BoundingBoxDto(double X, double Y, double Width, double Height);

/// <summary>Per-frame telemetry as reported by the client's on-device MLKit frame processor -
/// informational only. The server never trusts this for a pass/fail decision by itself; it is
/// cross-checked against what was actually requested and against the server's own pixel analysis.
/// BoundingBox is the one exception used for something load-bearing: it only decides WHERE to crop
/// for PAD/embedding, never whether the attempt passes, so a manipulated value just produces a bad
/// crop (caught by the quality gate) rather than a security bypass.</summary>
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
