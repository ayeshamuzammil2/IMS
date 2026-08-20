using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PIA.Application.Abstractions;
using PIA.Infrastructure.Persistence;
using PIA.Infrastructure.Persistence.Seeding;

namespace PIA.Infrastructure;

/// <summary>
/// The only place Program.cs touches for startup DB work. Its public signature uses no EF Core
/// types, so PIA.Api - which cannot see EF Core at all (see the PrivateAssets note in
/// PIA.Infrastructure.csproj) - can call it without needing that visibility. Migrating and
/// seeding both happen inside PIA.Infrastructure, where PiaDbContext is actually visible.
/// </summary>
public static class DatabaseBootstrapper
{
    public static async Task MigrateAndSeedAsync(
        IServiceProvider services, IConfiguration configuration, bool applyMigrations, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PiaDbContext>();

        if (applyMigrations)
        {
            // Production applies migrations via an explicit `dotnet ef database update` deploy
            // step, never automatically - see database/README.md.
            await db.Database.MigrateAsync(ct);
        }

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<PiaDbContext>>();
        await DbSeeder.SeedAsync(db, configuration, hasher, clock, logger, ct);
    }
}
