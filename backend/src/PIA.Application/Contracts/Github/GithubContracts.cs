namespace PIA.Application.Contracts.Github;

public sealed record SubmitGithubRequest(string RepositoryUrl);

public sealed record GithubStatusDto(
    string? RepositoryUrl,
    string Status,
    int Version,
    string? RejectionReason,
    DateTime? SubmittedAtUtc);

public sealed record GithubReviewQueueItemDto(
    int SubmissionId,
    int InternProfileId,
    string InternFullName,
    string InternCode,
    string RepositoryUrl,
    int Version,
    DateTime SubmittedAtUtc);

/// <summary>Decision must be Approved, Rejected, or ResubmitRequested - the service rejects any other GithubStatus value.</summary>
public sealed record ReviewGithubRequest(string Decision, string? Reason);
