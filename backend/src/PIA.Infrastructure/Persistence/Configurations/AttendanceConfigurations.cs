using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Persistence.Configurations;

public sealed class AttendanceDayConfiguration : IEntityTypeConfiguration<AttendanceDay>
{
    public void Configure(EntityTypeBuilder<AttendanceDay> b)
    {
        b.HasKey(x => x.Id);
        b.HasOne(x => x.InternProfile).WithMany(x => x.AttendanceDays)
            .HasForeignKey(x => x.InternProfileId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.InternProfileId, x.WorkDate }).IsUnique();
        b.HasIndex(x => new { x.WorkDate, x.Status });

        foreach (var col in new[] { nameof(AttendanceDay.ArrivalLat), nameof(AttendanceDay.DepartureLat) })
        {
            b.Property(col).HasColumnType("decimal(10,7)");
        }
        foreach (var col in new[] { nameof(AttendanceDay.ArrivalLng), nameof(AttendanceDay.DepartureLng) })
        {
            b.Property(col).HasColumnType("decimal(10,7)");
        }
        foreach (var col in new[] { nameof(AttendanceDay.ArrivalAccuracyM), nameof(AttendanceDay.DepartureAccuracyM) })
        {
            b.Property(col).HasColumnType("decimal(7,2)");
        }
        b.Property(x => x.VoidReason).HasMaxLength(500);
    }
}

public sealed class AttendanceEventConfiguration : IEntityTypeConfiguration<AttendanceEvent>
{
    public void Configure(EntityTypeBuilder<AttendanceEvent> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Latitude).HasColumnType("decimal(10,7)");
        b.Property(x => x.Longitude).HasColumnType("decimal(10,7)");
        b.Property(x => x.AccuracyM).HasColumnType("decimal(7,2)");
        b.Property(x => x.DeviceModel).HasMaxLength(100);
        b.Property(x => x.AppVersion).HasMaxLength(30);
        b.HasIndex(x => new { x.InternProfileId, x.OccurredAtUtc });
    }
}

public sealed class FaceTemplateConfiguration : IEntityTypeConfiguration<FaceTemplate>
{
    public void Configure(EntityTypeBuilder<FaceTemplate> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.ModelId).HasMaxLength(100).IsRequired();
        b.Property(x => x.ModelVersion).HasMaxLength(50).IsRequired();
        b.Property(x => x.Embedding).HasColumnType("varbinary(2048)");
        b.Property(x => x.ExternalFaceId).HasMaxLength(120);
        b.Property(x => x.ExternalCollection).HasMaxLength(120);
        b.Property(x => x.RevokedReason).HasMaxLength(255);
        b.HasOne(x => x.InternProfile).WithMany(x => x.FaceTemplates)
            .HasForeignKey(x => x.InternProfileId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.InternProfileId, x.Version }).IsUnique();
        b.HasIndex(x => new { x.InternProfileId, x.IsActive });
    }
}

public sealed class AttendanceChallengeSessionConfiguration : IEntityTypeConfiguration<AttendanceChallengeSession>
{
    public void Configure(EntityTypeBuilder<AttendanceChallengeSession> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Nonce).HasColumnType("varbinary(32)").IsRequired();
        b.HasIndex(x => x.Nonce).IsUnique();
        b.Property(x => x.ChallengeJson).HasColumnType("json").IsRequired();
        b.Property(x => x.JwtJti).HasMaxLength(64).IsRequired();
        b.Property(x => x.DeviceId).HasMaxLength(128).IsRequired();
        b.Property(x => x.IssueLatitude).HasColumnType("decimal(10,7)");
        b.Property(x => x.IssueLongitude).HasColumnType("decimal(10,7)");
        b.Property(x => x.ClientIp).HasMaxLength(45);
        b.Property(x => x.UserAgent).HasMaxLength(255);
        b.HasIndex(x => new { x.InternProfileId, x.State, x.ExpiresAtUtc });
        b.HasIndex(x => new { x.State, x.ExpiresAtUtc });
    }
}

public sealed class FaceVerificationResultConfiguration : IEntityTypeConfiguration<FaceVerificationResult>
{
    public void Configure(EntityTypeBuilder<FaceVerificationResult> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.ProviderName).HasMaxLength(50).IsRequired();
        b.Property(x => x.FailureReason).HasMaxLength(120);
        b.Property(x => x.RawPayloadJson).HasColumnType("json");
        foreach (var col in new[]
        {
            nameof(FaceVerificationResult.LiveScore), nameof(FaceVerificationResult.PrintAttackScore),
            nameof(FaceVerificationResult.ReplayAttackScore), nameof(FaceVerificationResult.MatchSimilarity),
            nameof(FaceVerificationResult.MatchThreshold),
        })
        {
            b.Property(col).HasColumnType("decimal(6,5)");
        }
    }
}

public sealed class AttendanceVerificationAttemptConfiguration : IEntityTypeConfiguration<AttendanceVerificationAttempt>
{
    public void Configure(EntityTypeBuilder<AttendanceVerificationAttempt> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Verdict).HasMaxLength(20).IsRequired();
        b.Property(x => x.InternalReasonCode).HasMaxLength(60);
        b.Property(x => x.ClientReasonCode).HasMaxLength(40);
        b.Property(x => x.FlagsJson).HasColumnType("json");
        b.Property(x => x.TraceJson).HasColumnType("json");
        b.Property(x => x.GpsAccuracyM).HasColumnType("decimal(7,2)");
        b.Property(x => x.AttestationVerdict).HasMaxLength(60);
        b.Property(x => x.DeviceId).HasMaxLength(128);
        b.HasIndex(x => new { x.InternProfileId, x.DatePk });
        b.HasIndex(x => new { x.Verdict, x.RiskScore, x.CreatedAtUtc });
    }
}

public sealed class AttendanceMediaConfiguration : IEntityTypeConfiguration<AttendanceMedia>
{
    public void Configure(EntityTypeBuilder<AttendanceMedia> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slot).HasMaxLength(16).IsRequired();
        b.Property(x => x.Kind).HasMaxLength(30).IsRequired();
        b.Property(x => x.StorageKey).HasMaxLength(300).IsRequired();
        b.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
        b.Property(x => x.Sha256).HasColumnType("binary(32)").IsRequired();
        b.HasIndex(x => x.Phash);
        b.HasIndex(x => new { x.RetentionExpiresAtUtc, x.PurgedAtUtc });
    }
}

public sealed class DeviceBindingConfiguration : IEntityTypeConfiguration<DeviceBinding>
{
    public void Configure(EntityTypeBuilder<DeviceBinding> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.DeviceId).HasMaxLength(128).IsRequired();
        b.Property(x => x.Status).HasMaxLength(20).IsRequired();
        b.Property(x => x.Model).HasMaxLength(100);
        b.Property(x => x.OsVersion).HasMaxLength(30);
        b.Property(x => x.LastAttestationVerdict).HasMaxLength(60);
        b.Property(x => x.RevokeReason).HasMaxLength(255);
        b.HasIndex(x => new { x.InternProfileId, x.DeviceId }).IsUnique();
    }
}

public sealed class AttendanceOverrideConfiguration : IEntityTypeConfiguration<AttendanceOverride>
{
    public void Configure(EntityTypeBuilder<AttendanceOverride> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.ReasonCode).HasMaxLength(60).IsRequired();
        b.Property(x => x.RequestNote).HasMaxLength(500);
        b.Property(x => x.DecidedByRole).HasMaxLength(20);
        b.Property(x => x.Decision).HasMaxLength(20);
        b.Property(x => x.Justification).HasMaxLength(1000).IsRequired();
        b.Property(x => x.ClientIp).HasMaxLength(45);
        b.Property(x => x.UserAgent).HasMaxLength(255);
        b.HasIndex(x => new { x.InternProfileId, x.DatePk });
    }
}
