using PIA.Application.Contracts.Dashboard;

namespace PIA.Application.Abstractions;

/// <summary>Scoped automatically by ICurrentUser.Role - Admin gets an org-wide summary
/// (optionally filtered to one department), a Mentor always gets only their own mentees.</summary>
public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(int? departmentId, CancellationToken ct);
}
