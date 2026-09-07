using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Certificates;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/certificates/intern")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class CertificateManagementController(ICertificateService certificateService) : ControllerBase
{
    [HttpGet("/api/certificates")]
    public async Task<IActionResult> List([FromQuery] int? departmentId, CancellationToken ct) =>
        Ok(await certificateService.ListAsync(departmentId, ct));

    [HttpGet("{internProfileId:int}")]
    public async Task<IActionResult> GetForIntern(int internProfileId, CancellationToken ct) =>
        Ok(await certificateService.GetForInternAsync(internProfileId, ct));

    [HttpPost("{internProfileId:int}/generate")]
    public async Task<IActionResult> Generate(int internProfileId, [FromBody] GenerateCertificateRequest request, CancellationToken ct) =>
        Ok(await certificateService.GenerateAsync(internProfileId, request, ct));

    [HttpPost("{internProfileId:int}/upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload(int internProfileId, [FromForm] UploadCertificateForm form, CancellationToken ct)
    {
        await using var stream = form.File.OpenReadStream();
        var request = new UploadCertificateRequest(stream, form.File.FileName, form.File.ContentType);
        return Ok(await certificateService.UploadAsync(internProfileId, request, ct));
    }

    [HttpDelete("{internProfileId:int}")]
    public async Task<IActionResult> Delete(int internProfileId, CancellationToken ct)
    {
        await certificateService.DeleteAsync(internProfileId, ct);
        return NoContent();
    }

    [HttpPost("{internProfileId:int}/approve")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Approve(int internProfileId, CancellationToken ct) =>
        Ok(await certificateService.ApproveAsync(internProfileId, ct));

    [HttpPost("{internProfileId:int}/issue")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Issue(int internProfileId, CancellationToken ct) =>
        Ok(await certificateService.IssueAsync(internProfileId, ct));
}

public sealed class UploadCertificateForm
{
    public IFormFile File { get; set; } = null!;
}
