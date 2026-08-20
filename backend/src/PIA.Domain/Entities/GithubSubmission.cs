using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class GithubSubmission
{
    public int Id { get; set; }
    public int InternProfileId { get; set; }
    public InternProfile InternProfile { get; set; } = null!;
    public required string RepositoryUrl { get; set; }
    public int Version { get; set; } = 1;
    public GithubStatus Status { get; set; } = GithubStatus.Pending;
    public DateTime SubmittedAtUtc { get; set; }
    public int? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? RejectionReason { get; set; }
}
