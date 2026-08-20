using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class FaceTemplate
{
    public long Id { get; set; }
    public int InternProfileId { get; set; }
    public InternProfile InternProfile { get; set; } = null!;
    public int Version { get; set; }
    public FaceProviderName Provider { get; set; } = FaceProviderName.Onnx;
    public required string ModelId { get; set; }
    public required string ModelVersion { get; set; }

    /// <summary>Raw little-endian float32[Dim] embedding. Null for cloud providers using ExternalFaceId instead.</summary>
    public byte[]? Embedding { get; set; }
    public short? EmbeddingDim { get; set; }
    public decimal? EmbeddingNorm { get; set; }
    public string? ExternalFaceId { get; set; }
    public string? ExternalCollection { get; set; }

    public Guid SourceSessionId { get; set; }
    public decimal? QualityScore { get; set; }
    public decimal? CrossMatchScore { get; set; }
    public decimal? IntraSetMinScore { get; set; }
    public EnrollmentReason EnrollmentReason { get; set; }

    public bool IsActive { get; set; } = true;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? SupersededAtUtc { get; set; }
    public long? SupersededByTemplateId { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevokedReason { get; set; }
}

public class AttendanceChallengeSession
{
    public Guid Id { get; set; }
    public int InternProfileId { get; set; }
    public int UserId { get; set; }
    public AttendanceEventType? EventType { get; set; }
    public DateOnly DatePk { get; set; }
    public required byte[] Nonce { get; set; }
    public required string ChallengeJson { get; set; }
    public required string JwtJti { get; set; }
    public required string DeviceId { get; set; }

    public decimal? IssueLatitude { get; set; }
    public decimal? IssueLongitude { get; set; }
    public double? IssueDistanceM { get; set; }
    public GeofenceState? IssueGeofenceState { get; set; }

    public ChallengeSessionState State { get; set; } = ChallengeSessionState.Issued;
    public DateTime IssuedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? ClientIp { get; set; }
    public string? UserAgent { get; set; }
}

public class FaceVerificationResult
{
    public long Id { get; set; }
    public int InternProfileId { get; set; }
    public required string ProviderName { get; set; }

    public decimal? LiveScore { get; set; }
    public decimal? PrintAttackScore { get; set; }
    public decimal? ReplayAttackScore { get; set; }
    public bool PassivePassed { get; set; }
    public bool ActiveChallengePassed { get; set; }
    public decimal? MatchSimilarity { get; set; }
    public decimal? MatchThreshold { get; set; }
    public bool MatchPassed { get; set; }
    public bool OverallPassed { get; set; }
    public string? FailureReason { get; set; }
    public int FramesEvaluated { get; set; }
    public int LatencyMs { get; set; }
    public string? RawPayloadJson { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class AttendanceVerificationAttempt
{
    public long Id { get; set; }
    public Guid SessionId { get; set; }
    public int InternProfileId { get; set; }
    public long? AttendanceDayId { get; set; }
    public long? FaceTemplateId { get; set; }
    public AttendanceEventType EventType { get; set; }
    public DateOnly DatePk { get; set; }
    public int AttemptNumber { get; set; }
    public string Verdict { get; set; } = "SoftFailed";
    public string? InternalReasonCode { get; set; }
    public string? ClientReasonCode { get; set; }

    public decimal? FaceMatchScore { get; set; }
    public decimal? FaceMatchBestOther { get; set; }
    public decimal? PadLiveProbBest { get; set; }
    public decimal? PadLiveProbMean { get; set; }
    public decimal? QualityScore { get; set; }
    public decimal? BlurVariance { get; set; }
    public int RiskScore { get; set; }
    public string? FlagsJson { get; set; }
    public string? TraceJson { get; set; }

    public GeofenceState? GeofenceState { get; set; }
    public double? DistanceM { get; set; }
    public decimal? GpsAccuracyM { get; set; }
    public bool? LocationMocked { get; set; }
    public string? AttestationVerdict { get; set; }
    public string? DeviceId { get; set; }
    public int? FrameCount { get; set; }
    public int? PayloadBytes { get; set; }
    public int? ServerLatencyMs { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class AttendanceMedia
{
    public long Id { get; set; }
    public long AttemptId { get; set; }
    public int InternProfileId { get; set; }
    public required string Slot { get; set; }
    public required string Kind { get; set; }
    public required string StorageKey { get; set; }
    public bool Encrypted { get; set; } = true;
    public required string ContentType { get; set; }
    public int Bytes { get; set; }
    public required byte[] Sha256 { get; set; }
    public ulong Phash { get; set; }
    public short? Width { get; set; }
    public short? Height { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime RetentionExpiresAtUtc { get; set; }
    public DateTime? PurgedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class DeviceBinding
{
    public int Id { get; set; }
    public int InternProfileId { get; set; }
    public required string DeviceId { get; set; }
    public DateTime FirstSeenAtUtc { get; set; }
    public DateTime? BoundAtUtc { get; set; }
    public int? BoundByUserId { get; set; }
    public string Status { get; set; } = "Active";
    public string? Model { get; set; }
    public string? OsVersion { get; set; }
    public string? LastAttestationVerdict { get; set; }
    public DateTime? LastSeenAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevokeReason { get; set; }
}

public class AttendanceOverride
{
    public long Id { get; set; }
    public long? AttendanceDayId { get; set; }
    public int InternProfileId { get; set; }
    public DateOnly DatePk { get; set; }
    public AttendanceEventType EventType { get; set; }
    public int RequestedByUserId { get; set; }
    public DateTime RequestedAtUtc { get; set; }
    public required string ReasonCode { get; set; }
    public string? RequestNote { get; set; }
    public int? DecidedByUserId { get; set; }
    public string? DecidedByRole { get; set; }
    public DateTime? DecidedAtUtc { get; set; }
    public string? Decision { get; set; }
    public required string Justification { get; set; }

    /// <summary>The mentor-stated actual mark time, converted to UTC via IClock.ToUtc before being stored here.</summary>
    public DateTime MarkedAtUtc { get; set; }
    public GeofenceState? GeofenceStateAtRequest { get; set; }
    public double? DistanceM { get; set; }
    public bool QuotaExceeded { get; set; }
    public int? AdminCountersignedByUserId { get; set; }
    public string? ClientIp { get; set; }
    public string? UserAgent { get; set; }
}
