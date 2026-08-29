using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

// FileCategory.GeneratedIdCard and IdCardStatus live in PIA.Domain.Enums (already imported above);
// IdCard entity lives in PIA.Domain.Entities (already imported above).

namespace PIA.Infrastructure.Services.Files;

public sealed class FileAccessAuthorizer(PiaDbContext db, ICurrentUser currentUser) : IFileAccessAuthorizer
{
    public async Task EnsureCanReadAsync(Guid fileId, CancellationToken ct)
    {
        var file = await db.StoredFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == fileId && !f.IsDeleted, ct)
            ?? throw new NotFoundException(nameof(StoredFile), fileId);

        if (currentUser.Role == UserRole.Admin)
        {
            return;
        }

        // Dual-lock for the intern's own generated ID card PDF: the file exists (and is owned by
        // the intern) as soon as the mentor submits it, but it must only be downloadable by the
        // intern once Admin has approved or issued it - mirrors the attendance dual-lock pattern.
        if (file.Category == FileCategory.GeneratedIdCard && currentUser.Role == UserRole.Intern &&
            file.OwnerUserId == currentUser.UserId)
        {
            var card = await db.IdCards.AsNoTracking().FirstOrDefaultAsync(c => c.GeneratedFileId == fileId, ct);
            if (card is null || (card.Status != IdCardStatus.Approved && card.Status != IdCardStatus.Issued))
            {
                throw new BusinessRuleException(BusinessRuleCodes.IdCardNotReadyForDownload,
                    "Your ID card is not available for download yet - it must be approved or issued by admin first.");
            }
            return;
        }

        if (file.OwnerUserId == currentUser.UserId || file.UploadedByUserId == currentUser.UserId)
        {
            return;
        }

        if (currentUser.Role == UserRole.Mentor && file.OwnerUserId is { } ownerId)
        {
            var mentorsThisOwner = await db.InternProfiles.AsNoTracking()
                .AnyAsync(p => p.UserId == ownerId && p.MentorId == currentUser.UserId, ct);
            if (mentorsThisOwner)
            {
                return;
            }
        }

        throw new ForbiddenException("You are not allowed to access this file.");
    }
}
