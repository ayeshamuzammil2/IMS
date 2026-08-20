using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Persistence.Configurations;

public sealed class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.HasIndex(x => x.Name).IsUnique();
        b.Property(x => x.Code).HasMaxLength(10).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.Latitude).HasColumnType("decimal(10,7)");
        b.Property(x => x.Longitude).HasColumnType("decimal(10,7)");
    }
}

public sealed class DepartmentCodeSequenceConfiguration : IEntityTypeConfiguration<DepartmentCodeSequence>
{
    public void Configure(EntityTypeBuilder<DepartmentCodeSequence> b)
    {
        b.HasKey(x => new { x.DepartmentId, x.Year });
        b.HasOne(x => x.Department).WithMany(x => x.CodeSequences)
            .HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.FullName).HasMaxLength(150).IsRequired();
        b.Property(x => x.Email).HasMaxLength(150).IsRequired();
        b.HasIndex(x => x.Email).IsUnique();
        b.Property(x => x.Phone).HasMaxLength(20);
        b.Property(x => x.Cnic).HasMaxLength(13);
        b.HasIndex(x => x.Cnic).IsUnique().HasFilter("`cnic` IS NOT NULL");
        b.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired();
        b.Property(x => x.SecurityStamp).HasMaxLength(64).IsRequired();

        b.HasOne(x => x.Department).WithMany(x => x.Users)
            .HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);

        b.HasIndex(x => new { x.Role, x.DepartmentId });
    }
}
