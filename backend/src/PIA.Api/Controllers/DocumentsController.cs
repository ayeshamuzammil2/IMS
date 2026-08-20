using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Documents;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize(Policy = Policies.Intern)]
public sealed class DocumentsController(IDocumentService documentService) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct) => Ok(await documentService.GetMyDashboardAsync(ct));

    [HttpPost]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] UploadDocumentForm form, CancellationToken ct)
    {
        await using var stream = form.File.OpenReadStream();
        var request = new UploadDocumentRequest(stream, form.File.FileName, form.File.ContentType, form.DocumentType);
        return Ok(await documentService.UploadAsync(request, ct));
    }

    [HttpPost("self-details")]
    public async Task<IActionResult> SubmitSelfDetails([FromBody] SubmitSelfDetailsRequest request, CancellationToken ct)
    {
        await documentService.SubmitSelfDetailsAsync(request, ct);
        return NoContent();
    }
}

public sealed class UploadDocumentForm
{
    public IFormFile File { get; set; } = null!;
    public string DocumentType { get; set; } = string.Empty;
}
