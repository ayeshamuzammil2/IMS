using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Notifications;
using PIA.Domain.Enums;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Documents;

/// <summary>The verification state machine - recomputed after every upload or review decision
/// rather than tracked incrementally, so it can never drift out of sync with the documents that
/// actually exist. Also keeps ProfilePhotoStatus/ApprovedPhotoFileId in lockstep, since the
/// approved photo is what Phase 5's face enrollment cross-matches against.</summary>
public sealed class VerificationRecomputer(PiaDbContext db, INotificationService notifications) : IVerificationRecomputer
{
    private static readonly DocumentType[] RequiredTypes =
    [
        DocumentType.ProfilePhoto, DocumentType.CnicFront, DocumentType.CnicBack, DocumentType.Resume, DocumentType.ReferenceLetter,
    ];

    public async Task RecomputeAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await db.InternProfiles.FirstAsync(p => p.Id == internProfileId, ct);
        var documents = await db.InternDocuments.AsNoTracking()
            .Where(d => d.InternProfileId == internProfileId)
            .OrderByDescending(d => d.Version)
            .ToListAsync(ct);

        var latestPerType = documents.GroupBy(d => d.DocumentType).ToDictionary(g => g.Key, g => g.First());

        if (latestPerType.TryGetValue(DocumentType.ProfilePhoto, out var photoDoc))
        {
            profile.ProfilePhotoStatus = photoDoc.Status switch
            {
                DocumentStatus.Approved => ProfilePhotoStatus.Approved,
                DocumentStatus.Rejected => ProfilePhotoStatus.Rejected,
                _ => ProfilePhotoStatus.Pending,
            };
            if (photoDoc.Status == DocumentStatus.Approved)
            {
                profile.ApprovedPhotoFileId = photoDoc.FileId;
                profile.ProfilePhotoApprovedByUserId = photoDoc.ReviewedByUserId;
                profile.ProfilePhotoApprovedAtUtc = photoDoc.ReviewedAtUtc;
            }
            else
            {
                profile.ApprovedPhotoFileId = null;
            }
        }
        else
        {
            profile.ProfilePhotoStatus = ProfilePhotoStatus.Missing;
            profile.ApprovedPhotoFileId = null;
        }

        var missingTypes = RequiredTypes.Except(latestPerType.Keys).ToList();
        var wasVerified = profile.VerificationStatus == VerificationStatus.Verified;

        profile.VerificationStatus =
            latestPerType.Values.Any(d => d.Status == DocumentStatus.Rejected) ? VerificationStatus.Rejected
            : missingTypes.Count > 0 ? VerificationStatus.PendingSubmission
            : latestPerType.Values.All(d => d.Status == DocumentStatus.Approved) ? VerificationStatus.Verified
            : VerificationStatus.PendingReview;

        await db.SaveChangesAsync(ct);

        if (!wasVerified && profile.VerificationStatus == VerificationStatus.Verified)
        {
            await notifications.NotifyUserAsync(profile.UserId, NotificationTemplates.ProfileVerified,
                new Dictionary<string, object?>(), ct);
        }
    }
}
