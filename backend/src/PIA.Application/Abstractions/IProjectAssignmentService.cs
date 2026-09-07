using PIA.Application.Contracts.Projects;

namespace PIA.Application.Abstractions;

public interface IProjectAssignmentService
{
    /// <summary>Intern-facing - own assignments only, via ICurrentUser.</summary>
    Task<IReadOnlyList<ProjectAssignmentDto>> GetMineAsync(CancellationToken ct);

    /// <summary>Mentor/Admin-facing - a mentor may only view/assign to their own mentees.</summary>
    Task<IReadOnlyList<ProjectAssignmentDto>> GetForInternAsync(int internProfileId, CancellationToken ct);

    Task<ProjectAssignmentDto> AssignAsync(int internProfileId, AssignProjectRequest request, CancellationToken ct);

    /// <summary>Mentor/Admin-facing - edits an existing assignment in place (title, description,
    /// due date, and optionally replacing the attached file) instead of creating a new one. A
    /// Mentor may only edit assignments belonging to their own mentees. Passing a null file
    /// leaves the existing attachment untouched.</summary>
    Task<ProjectAssignmentDto> UpdateAsync(int assignmentId, AssignProjectRequest request, CancellationToken ct);

    /// <summary>Mentor/Admin-facing - a mentor may only delete assignments belonging to their own
    /// mentees. Used to undo a mistaken assignment (wrong intern, wrong project, etc.).</summary>
    Task DeleteAsync(int assignmentId, CancellationToken ct);
}
