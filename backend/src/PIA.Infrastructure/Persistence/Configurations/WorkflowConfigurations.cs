using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Persistence.Configurations;

public sealed class ProjectAssignmentConfiguration : IEntityTypeConfiguration<ProjectAssignment>
{
    public void Configure(EntityTypeBuilder<ProjectAssignment> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000);
        b.HasOne(x => x.InternProfile).WithMany(x => x.ProjectAssignments)
            .HasForeignKey(x => x.InternProfileId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class GithubSubmissionConfiguration : IEntityTypeConfiguration<GithubSubmission>
{
    public void Configure(EntityTypeBuilder<GithubSubmission> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.RepositoryUrl).HasMaxLength(255).IsRequired();
        b.Property(x => x.RejectionReason).HasMaxLength(500);
        b.HasOne(x => x.InternProfile).WithMany(x => x.GithubSubmissions)
            .HasForeignKey(x => x.InternProfileId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.InternProfileId, x.Version }).IsUnique();
    }
}

public sealed class CertificateTemplateConfiguration : IEntityTypeConfiguration<CertificateTemplate>
{
    public void Configure(EntityTypeBuilder<CertificateTemplate> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.MergeFieldsJson).HasColumnType("json");
    }
}

public sealed class CertificateConfiguration : IEntityTypeConfiguration<Certificate>
{
    public void Configure(EntityTypeBuilder<Certificate> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.CertificateNumber).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.CertificateNumber).IsUnique();
        b.Property(x => x.RejectionReason).HasMaxLength(500);
        b.HasOne(x => x.InternProfile).WithOne(x => x.Certificate)
            .HasForeignKey<Certificate>(x => x.InternProfileId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.InternProfileId).IsUnique();
    }
}

public sealed class IdCardConfiguration : IEntityTypeConfiguration<IdCard>
{
    public void Configure(EntityTypeBuilder<IdCard> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.CardNumber).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.CardNumber).IsUnique();
        b.Property(x => x.BloodGroup).HasMaxLength(5);
        b.Property(x => x.EmergencyContactName).HasMaxLength(150);
        b.Property(x => x.EmergencyContactPhone).HasMaxLength(20);
        b.Property(x => x.Address).HasMaxLength(500);
        b.Property(x => x.Designation).HasMaxLength(100);
        b.Property(x => x.RejectionReason).HasMaxLength(500);
        b.HasOne(x => x.InternProfile).WithOne(x => x.IdCard)
            .HasForeignKey<IdCard>(x => x.InternProfileId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.InternProfileId).IsUnique();
    }
}
