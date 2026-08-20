using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Domain.Enums;

namespace PIA.Infrastructure.Persistence.Seeding;

public static class DbSeeder
{
    public static async Task SeedAsync(PiaDbContext db, IConfiguration configuration, IPasswordHasher hasher, IClock clock, ILogger logger, CancellationToken ct = default)
    {
        await SeedAdminAsync(db, configuration, hasher, clock, logger, ct);
        await SeedDepartmentsAsync(db, clock, ct);
    }

    private static async Task SeedAdminAsync(PiaDbContext db, IConfiguration configuration, IPasswordHasher hasher, IClock clock, ILogger logger, CancellationToken ct)
    {
        var adminEmail = configuration["AdminSeed:Email"] ?? "pia@admin.com";
        var adminPassword = configuration["AdminSeed:Password"] ?? "Admin@12345";

        var exists = await db.Users.AnyAsync(u => u.Role == UserRole.Admin, ct);
        if (exists) return;

        db.Users.Add(new User
        {
            Role = UserRole.Admin,
            FullName = "PIA System Administrator",
            Email = adminEmail.ToLowerInvariant(),
            PasswordHash = hasher.Hash(adminPassword),
            MustResetPassword = false,
            IsActive = true,
            CreatedAtUtc = clock.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        logger.LogWarning(
            "Seeded default Admin account {Email}. This credential is documented in the public spec - " +
            "change it immediately in any deployment beyond a local demo.", adminEmail);
    }

    private static async Task SeedDepartmentsAsync(PiaDbContext db, IClock clock, CancellationToken ct)
    {
        if (await db.Departments.AnyAsync(ct)) return;

        // Real PIA Head Office coordinates, Karachi (Jinnah International Airport area) - replace
        // per-department in the Admin UI once actual office locations are known.
        db.Departments.AddRange(
            new Department { Name = "ERP Department", Code = "ERP", Description = "PIA ERP / Systems department", Latitude = 24.8967m, Longitude = 67.1608m, GeofenceRadiusMeters = 150, IsActive = true, CreatedAtUtc = clock.UtcNow },
            new Department { Name = "Human Resources", Code = "HR", Description = "PIA HR department", Latitude = 24.8967m, Longitude = 67.1608m, GeofenceRadiusMeters = 150, IsActive = true, CreatedAtUtc = clock.UtcNow },
            new Department { Name = "Investor Relations", Code = "IR", Description = "PIA Investor Relations department", Latitude = 24.8967m, Longitude = 67.1608m, GeofenceRadiusMeters = 150, IsActive = true, CreatedAtUtc = clock.UtcNow },
            new Department { Name = "Supply Chain Management", Code = "SCM", Description = "PIA Supply Chain Management department", Latitude = 24.8967m, Longitude = 67.1608m, GeofenceRadiusMeters = 150, IsActive = true, CreatedAtUtc = clock.UtcNow }
        );
        await db.SaveChangesAsync(ct);
    }
}
