using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/files")]
public sealed class FilesController(IFileStorage fileStorage, IFileAccessAuthorizer authorizer, IAuditLogger auditLogger) : ControllerBase
{
    [HttpGet("{fileId:guid}")]
    [Authorize(Policy = Policies.AnyRole)]
    public async Task<IActionResult> Download(Guid fileId, CancellationToken ct)
    {
        await authorizer.EnsureCanReadAsync(fileId, ct);
        var meta = await fileStorage.GetMetadataAsync(fileId, ct)
            ?? throw new PIA.Domain.Exceptions.NotFoundException("File", fileId);

        var stream = await fileStorage.OpenReadAsync(fileId, ct);
        await auditLogger.LogAsync("File.Download", "StoredFile", fileId.ToString(), null, ct);

        Response.Headers.CacheControl = "private, no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(stream, meta.ContentType, meta.OriginalFileName, enableRangeProcessing: true);
    }

    [HttpGet("{fileId:guid}/meta")]
    [Authorize(Policy = Policies.AnyRole)]
    public async Task<IActionResult> Meta(Guid fileId, CancellationToken ct)
    {
        await authorizer.EnsureCanReadAsync(fileId, ct);
        var meta = await fileStorage.GetMetadataAsync(fileId, ct)
            ?? throw new PIA.Domain.Exceptions.NotFoundException("File", fileId);

        return Ok(new
        {
            meta.Id,
            meta.OriginalFileName,
            meta.ContentType,
            meta.SizeBytes,
            meta.Category,
            meta.CreatedAtUtc,
        });
    }
}
