using PIA.Application.Contracts.Projects;

namespace PIA.Application.Abstractions;

public interface IProjectAssignmentService
{
    /// <summary>Intern-facing - own assignments only, via ICurrentUser.</summary>
    Task<IReadOnlyList<ProjectAssignmentDto>> GetMineAsync(CancellationToken ct);

    /// <summary>Mentor/Admin-facing - a mentor may only view/assign to their own mentees.</summary>
    Task<IReadOnlyList<ProjectAssignmentDto>> GetForInternAsync(int internProfileId, CancellationToken ct);

    Task<ProjectAssignmentDto> AssignAsync(int internProfileId, AssignProjectRequest request, CancellationToken ct);
}
