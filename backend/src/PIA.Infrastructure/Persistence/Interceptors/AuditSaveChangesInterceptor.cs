using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Automatically writes an AuditLog row for every add/modify/delete of an audited entity type,
/// in the SAME SaveChanges call - so the audit row is transactionally inseparable from the change.
/// This is what fixed v1's zero-audit-rows bug: audit logging cannot be forgotten because it isn't
/// something a developer has to remember to call.
/// </summary>
public sealed class AuditSaveChangesInterceptor(ICurrentUser currentUser, ICorrelationContext correlation, IClock clock)
    : SaveChangesInterceptor
{
    private static readonly HashSet<Type> AuditedTypes =
    [
        typeof(User), typeof(InternProfile), typeof(Department), typeof(InternDocument),
        typeof(Certificate), typeof(IdCard), typeof(GithubSubmission), typeof(ProjectAssignment),
        typeof(AttendanceDay),
    ];

    private static readonly HashSet<string> RedactedProperties = ["PasswordHash", "SecurityStamp", "Embedding"];

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        if (eventData.Context is not null)
        {
            AppendAuditRows(eventData.Context);
        }
        return base.SavingChangesAsync(eventData, result, ct);
    }

    private void AppendAuditRows(DbContext context)
    {
        var entries = context.ChangeTracker.Entries()
            .Where(e => AuditedTypes.Contains(e.Entity.GetType())
                        && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            var (before, after) = BuildDiff(entry);
            var idProperty = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");

            context.Set<AuditLog>().Add(new AuditLog
            {
                ActorUserId = currentUser.IsAuthenticated ? currentUser.UserId : null,
                ActorRole = currentUser.IsAuthenticated ? currentUser.Role.ToString() : null,
                Action = $"{entry.Entity.GetType().Name}.{entry.State}",
                EntityType = entry.Entity.GetType().Name,
                EntityId = idProperty?.CurrentValue?.ToString(),
                BeforeJson = before,
                AfterJson = after,
                IpAddress = correlation.IpAddress,
                UserAgent = correlation.UserAgent,
                CorrelationId = correlation.CorrelationId,
                CreatedAtUtc = clock.UtcNow,
            });
        }
    }

    private static (string? before, string? after) BuildDiff(EntityEntry entry)
    {
        var before = new Dictionary<string, object?>();
        var after = new Dictionary<string, object?>();

        foreach (var property in entry.Properties)
        {
            var name = property.Metadata.Name;
            if (RedactedProperties.Contains(name)) continue;

            var changed = entry.State switch
            {
                EntityState.Added => true,
                EntityState.Deleted => true,
                _ => property.IsModified,
            };
            if (!changed) continue;

            if (entry.State != EntityState.Added) before[name] = property.OriginalValue;
            if (entry.State != EntityState.Deleted) after[name] = property.CurrentValue;
        }

        var beforeJson = before.Count > 0 ? JsonSerializer.Serialize(before) : null;
        var afterJson = after.Count > 0 ? JsonSerializer.Serialize(after) : null;
        return (beforeJson, afterJson);
    }
}
