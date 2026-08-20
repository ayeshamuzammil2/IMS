using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class Holiday
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public required string Name { get; set; }
    public int? DepartmentId { get; set; }
}

public class JobRun
{
    public long Id { get; set; }
    public required string JobName { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? FinishedAtUtc { get; set; }
    public bool Succeeded { get; set; }
    public int ItemsProcessed { get; set; }
    public string? Error { get; set; }
    public JobTrigger TriggeredBy { get; set; }
}
