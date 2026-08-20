using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class ProjectAssignment
{
    public int Id { get; set; }
    public int InternProfileId { get; set; }
    public InternProfile InternProfile { get; set; } = null!;
    public int AssignedByUserId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public Guid? FileId { get; set; }
    public DateOnly? DueDate { get; set; }
    public ProjectAssignmentStatus Status { get; set; } = ProjectAssignmentStatus.Assigned;
    public DateTime AssignedAtUtc { get; set; }
}
