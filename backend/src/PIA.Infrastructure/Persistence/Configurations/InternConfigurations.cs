using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Persistence.Configurations;

public sealed class InternProfileConfiguration : IEntityTypeConfiguration<InternProfile>
{
    public void Configure(EntityTypeBuilder<InternProfile> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.InternCode).HasMaxLength(30).IsRequired();
        b.HasIndex(x => x.InternCode).IsUnique();

        b.HasOne(x => x.User).WithOne(x => x.InternProfile)
            .HasForeignKey<InternProfile>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.UserId).IsUnique();

        b.HasOne(x => x.Mentor).WithMany(x => x.MenteeProfiles)
            .HasForeignKey(x => x.MentorId).OnDelete(DeleteBehavior.Restrict);

        b.Property(x => x.UniversityName).HasMaxLength(200);
        b.Property(x => x.DegreeProgram).HasMaxLength(150);
        b.Property(x => x.Address).HasMaxLength(500);
        b.Property(x => x.EmergencyContactName).HasMaxLength(150);
        b.Property(x => x.EmergencyContactPhone).HasMaxLength(20);
        b.Property(x => x.BloodGroup).HasMaxLength(5);
        b.Property(x => x.GithubRepoUrl).HasMaxLength(255);
        b.Property(x => x.VerificationRemarks).HasMaxLength(500);
        b.Property(x => x.AttendanceAccommodationReason).HasMaxLength(500);
    }
}

public sealed class StoredFileConfiguration : IEntityTypeConfiguration<StoredFile>
{
    public void Configure(EntityTypeBuilder<StoredFile> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.StorageKey).HasMaxLength(300).IsRequired();
        b.Property(x => x.OriginalFileName).HasMaxLength(255).IsRequired();
        b.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
        b.Property(x => x.Sha256).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.OwnerUserId);
    }
}

public sealed class InternDocumentConfiguration : IEntityTypeConfiguration<InternDocument>
{
    public void Configure(EntityTypeBuilder<InternDocument> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Remarks).HasMaxLength(500);
        b.Property(x => x.ExternalLinkUrl).HasMaxLength(2000);
        b.HasOne(x => x.InternProfile).WithMany(x => x.Documents)
            .HasForeignKey(x => x.InternProfileId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.InternProfileId, x.DocumentType, x.Version }).IsUnique();
    }
}
