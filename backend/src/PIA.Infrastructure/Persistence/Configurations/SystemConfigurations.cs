using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Persistence.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(150).IsRequired();
        b.Property(x => x.Body).HasMaxLength(1000).IsRequired();
        b.Property(x => x.RelatedEntityType).HasMaxLength(80);
        b.Property(x => x.RelatedEntityId).HasMaxLength(40);
        b.Property(x => x.ActionRoute).HasMaxLength(200);
        b.HasOne(x => x.Recipient).WithMany(x => x.Notifications)
            .HasForeignKey(x => x.RecipientUserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.RecipientUserId, x.IsRead, x.CreatedAtUtc });
    }
}

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.ActorRole).HasMaxLength(20);
        b.Property(x => x.Action).HasMaxLength(120).IsRequired();
        b.Property(x => x.EntityType).HasMaxLength(80).IsRequired();
        b.Property(x => x.EntityId).HasMaxLength(40);
        b.Property(x => x.BeforeJson).HasColumnType("json");
        b.Property(x => x.AfterJson).HasColumnType("json");
        b.Property(x => x.IpAddress).HasMaxLength(45);
        b.Property(x => x.UserAgent).HasMaxLength(256);
        b.Property(x => x.CorrelationId).HasMaxLength(64).IsRequired();
        b.HasIndex(x => new { x.EntityType, x.EntityId });
        b.HasIndex(x => new { x.ActorUserId, x.CreatedAtUtc });
    }
}

public sealed class EmailOutboxMessageConfiguration : IEntityTypeConfiguration<EmailOutboxMessage>
{
    public void Configure(EntityTypeBuilder<EmailOutboxMessage> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.ToAddress).HasMaxLength(254).IsRequired();
        b.Property(x => x.ToName).HasMaxLength(150);
        b.Property(x => x.Subject).HasMaxLength(255).IsRequired();
        b.Property(x => x.HtmlBody).HasColumnType("mediumtext").IsRequired();
        b.Property(x => x.TextBody).HasColumnType("mediumtext");
        b.Property(x => x.TemplateKey).HasMaxLength(80).IsRequired();
        b.Property(x => x.AttachmentFileIdsJson).HasColumnType("json");
        b.Property(x => x.LastError).HasMaxLength(1000);
        b.HasIndex(x => new { x.Status, x.NextAttemptAtUtc });
    }
}

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.TokenHash).IsUnique();
        b.Property(x => x.CreatedByIp).HasMaxLength(45);
        b.Property(x => x.RevokedReason).HasMaxLength(255);
        b.HasOne(x => x.User).WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class HolidayConfiguration : IEntityTypeConfiguration<Holiday>
{
    public void Configure(EntityTypeBuilder<Holiday> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.HasIndex(x => new { x.Date, x.DepartmentId });
    }
}

public sealed class JobRunConfiguration : IEntityTypeConfiguration<JobRun>
{
    public void Configure(EntityTypeBuilder<JobRun> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.JobName).HasMaxLength(100).IsRequired();
        b.Property(x => x.Error).HasMaxLength(2000);
        b.HasIndex(x => new { x.JobName, x.StartedAtUtc });
    }
}
