using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PIA.Application.Abstractions;

namespace PIA.Infrastructure.Persistence.Interceptors;

public sealed class TimestampSaveChangesInterceptor(IClock clock) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Apply(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        Apply(eventData.Context);
        return base.SavingChangesAsync(eventData, result, ct);
    }

    private void Apply(DbContext? context)
    {
        if (context is null) return;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                TrySetProperty(entry, "CreatedAtUtc", clock.UtcNow);
            }
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                TrySetProperty(entry, "UpdatedAtUtc", clock.UtcNow);
            }
        }
    }

    private static void TrySetProperty(EntityEntry entry, string propertyName, DateTime value)
    {
        var property = entry.Properties.FirstOrDefault(p => p.Metadata.Name == propertyName);
        if (property is not null)
        {
            property.CurrentValue = value;
        }
    }
}
