using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

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
