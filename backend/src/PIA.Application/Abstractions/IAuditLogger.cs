namespace PIA.Application.Abstractions;

/// <summary>
/// Explicit audit events for things that aren't entity-state changes (the interceptor covers
/// those automatically): login success/failure, lockout, token refresh/reuse-detection, file
/// download, CSV export, attendance rejection, job runs, bulk actions.
/// </summary>
public interface IAuditLogger
{
    Task LogAsync(string action, string entityType, string? entityId, string? details, CancellationToken ct);
}
