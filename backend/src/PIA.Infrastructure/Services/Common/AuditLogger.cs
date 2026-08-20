using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Common;

public sealed class AuditLogger(PiaDbContext db, ICurrentUser currentUser, ICorrelationContext correlation, IClock clock) : IAuditLogger
{
    public async Task LogAsync(string action, string entityType, string? entityId, string? details, CancellationToken ct)
    {
        db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = currentUser.IsAuthenticated ? currentUser.UserId : null,
            ActorRole = currentUser.IsAuthenticated ? currentUser.Role.ToString() : null,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            AfterJson = details,
            IpAddress = correlation.IpAddress,
            UserAgent = correlation.UserAgent,
            CorrelationId = correlation.CorrelationId,
            CreatedAtUtc = clock.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }
}
