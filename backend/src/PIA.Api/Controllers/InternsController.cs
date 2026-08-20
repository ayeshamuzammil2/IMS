using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Interns;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/interns")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class InternsController(IInternService interns, IFaceEnrollmentService faceEnrollment) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? search, [FromQuery] int? departmentId, [FromQuery] int? mentorId,
        [FromQuery] string? verificationStatus, [FromQuery] bool? isActive, CancellationToken ct) =>
        Ok(await interns.ListAsync(search, departmentId, mentorId, verificationStatus, isActive, ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await interns.GetAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInternRequest request, CancellationToken ct)
    {
        var created = await interns.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInternRequest request, CancellationToken ct) =>
        Ok(await interns.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await interns.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
    {
        await interns.DeactivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/reactivate")]
    public async Task<IActionResult> Reactivate(int id, CancellationToken ct)
    {
        await interns.ReactivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, CancellationToken ct)
    {
        await interns.ResetPasswordAsync(id, ct);
        return NoContent();
    }

    /// <summary>Biometric right-to-erasure: revokes the intern's active face template, forcing a
    /// fresh live enrollment before biometric attendance can resume.</summary>
    [HttpPost("{id:int}/erase-biometrics")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> EraseBiometrics(int id, [FromBody] EraseBiometricsRequest request, CancellationToken ct)
    {
        await faceEnrollment.RevokeAsync(id, request.Reason, ct);
        return NoContent();
    }
}

public sealed record EraseBiometricsRequest(string Reason);
