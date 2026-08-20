using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Certificates;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/certificates/templates")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class CertificateTemplatesController(ICertificateTemplateService templateService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await templateService.ListAsync(ct));

    [HttpPost]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] UploadCertificateTemplateForm form, CancellationToken ct)
    {
        await using var stream = form.File.OpenReadStream();
        var request = new UploadCertificateTemplateRequest(stream, form.File.FileName, form.Name, form.DepartmentId);
        return Ok(await templateService.UploadAsync(request, ct));
    }

    [HttpGet("{templateId:int}/preview")]
    public async Task<IActionResult> Preview(int templateId, CancellationToken ct)
    {
        var result = await templateService.PreviewAsync(templateId, ct);
        return File(result.Content, result.ContentType, result.FileName);
    }
}

public sealed class UploadCertificateTemplateForm
{
    public IFormFile File { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
}
