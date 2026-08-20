using Microsoft.AspNetCore.Authorization;
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

    [HttpPost("{internProfileId:int}/approve")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Approve(int internProfileId, CancellationToken ct) =>
        Ok(await certificateService.ApproveAsync(internProfileId, ct));

    [HttpPost("{internProfileId:int}/issue")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Issue(int internProfileId, CancellationToken ct) =>
        Ok(await certificateService.IssueAsync(internProfileId, ct));
}
