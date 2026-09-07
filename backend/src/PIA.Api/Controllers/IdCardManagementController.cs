using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.IdCards;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/idcards/intern")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class IdCardManagementController(IIdCardService idCardService) : ControllerBase
{
    [HttpGet("/api/idcards")]
    public async Task<IActionResult> List([FromQuery] int? departmentId, CancellationToken ct) =>
        Ok(await idCardService.ListAsync(departmentId, ct));

    [HttpGet("{internProfileId:int}")]
    public async Task<IActionResult> GetForIntern(int internProfileId, CancellationToken ct) =>
        Ok(await idCardService.GetForInternAsync(internProfileId, ct));

    [HttpPost("{internProfileId:int}/submit")]
    public async Task<IActionResult> Submit(int internProfileId, [FromBody] SubmitIdCardRequest request, CancellationToken ct) =>
        Ok(await idCardService.SubmitAsync(internProfileId, request, ct));

    [HttpDelete("{internProfileId:int}")]
    public async Task<IActionResult> Delete(int internProfileId, CancellationToken ct)
    {
        await idCardService.DeleteAsync(internProfileId, ct);
        return NoContent();
    }

    [HttpPost("{internProfileId:int}/approve")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Approve(int internProfileId, CancellationToken ct) =>
        Ok(await idCardService.ApproveAsync(internProfileId, ct));

    [HttpPost("{internProfileId:int}/issue")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Issue(int internProfileId, CancellationToken ct) =>
        Ok(await idCardService.IssueAsync(internProfileId, ct));
}
