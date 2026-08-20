using PIA.Domain.Entities;
using PIA.Domain.Enums;

namespace PIA.Application.Abstractions;

public sealed record FileSaveRequest(
    Stream Content,
    string OriginalFileName,
    string? ClientContentType,
    FileCategory Category,
    int? OwnerUserId,
    int UploadedByUserId
);

public interface IFileStorage
{
    /// <summary>Validates (size, extension, magic bytes), re-encodes images, and persists the file. Throws BusinessRuleException on any validation failure.</summary>
    Task<StoredFile> SaveAsync(FileSaveRequest request, CancellationToken ct);

    Task<Stream> OpenReadAsync(Guid fileId, CancellationToken ct);

    Task<StoredFile?> GetMetadataAsync(Guid fileId, CancellationToken ct);

    Task SoftDeleteAsync(Guid fileId, CancellationToken ct);

    /// <summary>Permanently deletes the physical file from disk and marks it deleted - unlike
    /// SoftDeleteAsync (which only revokes access, keeping the bytes on disk), this actually
    /// reclaims storage. Used by the media retention job once a file's retention window has
    /// passed. Safe to call on an already-missing file (idempotent).</summary>
    Task PurgeAsync(Guid fileId, CancellationToken ct);
}

public interface IFileAccessAuthorizer
{
    /// <summary>Throws ForbiddenException/NotFoundException if the current user cannot read this file.</summary>
    Task EnsureCanReadAsync(Guid fileId, CancellationToken ct);
}
