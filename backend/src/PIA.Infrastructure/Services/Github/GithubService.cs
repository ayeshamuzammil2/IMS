using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Github;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Github;

public sealed class GithubService(PiaDbContext db, ICurrentUser currentUser, IClock clock) : IGithubService
{
    public async Task<GithubStatusDto> GetMyStatusAsync(CancellationToken ct)
    {
        var profile = await LoadOwnProfileAsync(ct);
        var latest = await db.GithubSubmissions.AsNoTracking()
            .Where(s => s.InternProfileId == profile.Id)
            .OrderByDescending(s => s.Version)
            .FirstOrDefaultAsync(ct);

        return new GithubStatusDto(
            profile.GithubRepoUrl, profile.GithubStatus.ToString(),
            latest?.Version ?? 0, latest?.RejectionReason, latest?.SubmittedAtUtc);
    }

    public async Task<GithubStatusDto> SubmitAsync(SubmitGithubRequest request, CancellationToken ct)
    {
        var url = request.RepositoryUrl.Trim();
        if (!GithubUrlValidator.IsValid(url))
        {
            throw new ValidationException("repositoryUrl", "Must be a valid GitHub repository URL, e.g. https://github.com/owner/repo.");
        }

        var profile = await db.InternProfiles.FirstAsync(p => p.Id == currentUser.InternProfileId, ct);
        var nextVersion = 1 + (await db.GithubSubmissions
            .Where(s => s.InternProfileId == profile.Id)
            .Select(s => (int?)s.Version).MaxAsync(ct) ?? 0);

        var submission = new GithubSubmission
        {
            InternProfileId = profile.Id,
            RepositoryUrl = url,
            Version = nextVersion,
            Status = GithubStatus.Pending,
            SubmittedAtUtc = clock.UtcNow,
        };
        db.GithubSubmissions.Add(submission);

        profile.GithubRepoUrl = url;
        profile.GithubStatus = GithubStatus.Pending;
        await db.SaveChangesAsync(ct);

        return new GithubStatusDto(url, GithubStatus.Pending.ToString(), nextVersion, null, submission.SubmittedAtUtc);
    }

    private async Task<InternProfile> LoadOwnProfileAsync(CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns have a GitHub submission.");
        return await db.InternProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
    }
}
