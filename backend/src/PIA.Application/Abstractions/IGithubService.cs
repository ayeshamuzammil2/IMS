using PIA.Application.Contracts.Github;

namespace PIA.Application.Abstractions;

/// <summary>Intern-facing GitHub repository submission - scoped to the current authenticated intern via ICurrentUser.</summary>
public interface IGithubService
{
    Task<GithubStatusDto> GetMyStatusAsync(CancellationToken ct);

    Task<GithubStatusDto> SubmitAsync(SubmitGithubRequest request, CancellationToken ct);
}

/// <summary>Mentor/Admin review queue for pending GitHub submissions - a mentor sees only their own mentees.</summary>
public interface IGithubReviewService
{
    Task<IReadOnlyList<GithubReviewQueueItemDto>> GetPendingAsync(CancellationToken ct);

    Task DecideAsync(int submissionId, ReviewGithubRequest request, CancellationToken ct);
}
