using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Github;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Github;

public sealed class GithubReviewService(
    PiaDbContext db,
    ICurrentUser currentUser,
    INotificationService notifications,
    IClock clock) : IGithubReviewService
{
    private static readonly HashSet<GithubStatus> AllowedDecisions =
        [GithubStatus.Approved, GithubStatus.Rejected, GithubStatus.ResubmitRequested];

    public async Task<IReadOnlyList<GithubReviewQueueItemDto>> GetPendingAsync(CancellationToken ct)
    {
        var query = db.GithubSubmissions.AsNoTracking()
            .Where(s => s.Status == GithubStatus.Pending)
            .Join(db.InternProfiles.Include(p => p.User), s => s.InternProfileId, p => p.Id,
                (s, p) => new { Submission = s, Profile = p });

        if (currentUser.Role == UserRole.Mentor)
        {
            query = query.Where(x => x.Profile.MentorId == currentUser.UserId);
        }

        var rows = await query.OrderBy(x => x.Submission.SubmittedAtUtc).ToListAsync(ct);

        return rows.Select(x => new GithubReviewQueueItemDto(
            x.Submission.Id, x.Profile.Id, x.Profile.User.FullName, x.Profile.InternCode,
            x.Submission.RepositoryUrl, x.Submission.Version, x.Submission.SubmittedAtUtc)).ToList();
    }

    public async Task DecideAsync(int submissionId, ReviewGithubRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<GithubStatus>(request.Decision, true, out var decision) || !AllowedDecisions.Contains(decision))
        {
            throw new ValidationException("decision", "Must be one of Approved, Rejected, ResubmitRequested.");
        }
        if (decision != GithubStatus.Approved && string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new ValidationException("reason", "A reason is required when rejecting or requesting resubmission.");
        }

        var submission = await db.GithubSubmissions.FirstOrDefaultAsync(s => s.Id == submissionId, ct)
            ?? throw new NotFoundException(nameof(GithubSubmission), submissionId);
        if (submission.Status != GithubStatus.Pending)
        {
            throw new ConflictException("This submission has already been decided.");
        }

        var profile = await db.InternProfiles.FirstAsync(p => p.Id == submission.InternProfileId, ct);
        if (currentUser.Role == UserRole.Mentor && profile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only review submissions from your own interns.");
        }

        submission.Status = decision;
        submission.ReviewedByUserId = currentUser.UserId;
        submission.ReviewedAtUtc = clock.UtcNow;
        submission.RejectionReason = decision == GithubStatus.Approved ? null : request.Reason;

        profile.GithubStatus = decision;
        await db.SaveChangesAsync(ct);

        var template = decision switch
        {
            GithubStatus.Approved => NotificationTemplates.GithubApproved,
            GithubStatus.Rejected => NotificationTemplates.GithubRejected,
            _ => NotificationTemplates.GithubResubmitRequested,
        };
        await notifications.NotifyUserAsync(profile.UserId, template,
            new Dictionary<string, object?> { ["reason"] = request.Reason ?? "No reason given." }, ct);
    }
}
