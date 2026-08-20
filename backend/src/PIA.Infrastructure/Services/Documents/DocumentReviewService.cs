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
        var query = db.InternDocuments.AsNoTracking()
            .Where(d => d.Status == DocumentStatus.Pending)
            .Join(db.InternProfiles.Include(p => p.User), d => d.InternProfileId, p => p.Id,
                (d, p) => new { Document = d, Profile = p });

        if (currentUser.Role == UserRole.Mentor)
        {
            query = query.Where(x => x.Profile.MentorId == currentUser.UserId);
        }

        var rows = await query.OrderBy(x => x.Document.UploadedAtUtc).ToListAsync(ct);

        return rows.Select(x => new DocumentReviewQueueItemDto(
            x.Document.Id, x.Profile.Id, x.Profile.User.FullName, x.Profile.InternCode,
            x.Document.DocumentType.ToString(), x.Document.FileId, x.Document.Version, x.Document.UploadedAtUtc)).ToList();
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
