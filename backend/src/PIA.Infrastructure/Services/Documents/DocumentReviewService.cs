using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Documents;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Documents;

public sealed class DocumentReviewService(
    PiaDbContext db,
    ICurrentUser currentUser,
    IVerificationRecomputer verificationRecomputer,
    INotificationService notifications,
    IClock clock) : IDocumentReviewService
{
    public async Task<IReadOnlyList<DocumentReviewQueueItemDto>> GetPendingAsync(CancellationToken ct)
    {
        var profileQuery = db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department).AsQueryable();
        if (currentUser.Role == UserRole.Mentor)
        {
            profileQuery = profileQuery.Where(p => p.MentorId == currentUser.UserId);
        }

        var profileIds = await profileQuery.Select(p => p.Id).ToListAsync(ct);

        // A re-upload doesn't replace the old row - it adds a new, higher Version for the same
        // (InternProfileId, DocumentType) - so grouping down to just the latest version per type
        // here is what keeps 10 reuploads of the same profile photo from showing up as 10 separate
        // queue entries. This mirrors how VerificationRecomputer and the intern's own dashboard
        // already collapse to "latest per type"; this queue was the one place that hadn't.
        var allDocs = await db.InternDocuments.AsNoTracking()
            .Where(d => profileIds.Contains(d.InternProfileId))
            .ToListAsync(ct);

        var latestPending = allDocs
            .GroupBy(d => (d.InternProfileId, d.DocumentType))
            .Select(g => g.OrderByDescending(d => d.Version).First())
            .Where(d => d.Status == DocumentStatus.Pending)
            .OrderBy(d => d.UploadedAtUtc)
            .ToList();

        var profilesById = await profileQuery.Where(p => profileIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);

        var fileIds = latestPending.Where(d => d.FileId.HasValue).Select(d => d.FileId!.Value).ToList();
        var contentTypesByFileId = await db.StoredFiles.AsNoTracking()
            .Where(f => fileIds.Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.ContentType, ct);

        return latestPending.Select(d =>
        {
            var p = profilesById[d.InternProfileId];
            return new DocumentReviewQueueItemDto(
                d.Id, p.Id, p.User.FullName, p.InternCode,
                p.User.DepartmentId, p.User.Department?.Name,
                d.DocumentType.ToString(), d.FileId,
                d.FileId.HasValue ? contentTypesByFileId.GetValueOrDefault(d.FileId.Value) : null,
                d.ExternalLinkUrl, d.Version, d.UploadedAtUtc);
        }).ToList();
    }

    public async Task DecideAsync(int documentId, ReviewDocumentRequest request, CancellationToken ct)
    {
        var document = await db.InternDocuments.FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new NotFoundException(nameof(InternDocument), documentId);

        if (document.Status != DocumentStatus.Pending)
        {
            throw new ConflictException("This document has already been decided.");
        }

        var profile = await db.InternProfiles.FirstAsync(p => p.Id == document.InternProfileId, ct);
        if (currentUser.Role == UserRole.Mentor && profile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only review documents for your own interns.");
        }

        document.Status = request.Approve ? DocumentStatus.Approved : DocumentStatus.Rejected;
        document.Remarks = request.Remarks;
        document.ReviewedByUserId = currentUser.UserId;
        document.ReviewedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        await verificationRecomputer.RecomputeAsync(document.InternProfileId, ct);

        var template = request.Approve ? NotificationTemplates.DocumentApproved : NotificationTemplates.DocumentRejected;
        await notifications.NotifyUserAsync(profile.UserId, template, new Dictionary<string, object?>
        {
            ["document_type"] = document.DocumentType.ToString(),
            ["reason"] = request.Remarks ?? "No reason given.",
        }, ct);
    }
}
