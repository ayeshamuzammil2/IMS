using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Mentors;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/mentors")]
[Authorize(Policy = Policies.Admin)]
public sealed class MentorsController(IMentorService mentors) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] int? departmentId, [FromQuery] bool? isActive, CancellationToken ct) =>
        Ok(await mentors.ListAsync(search, departmentId, isActive, ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await mentors.GetAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMentorRequest request, CancellationToken ct)
    {
        var created = await mentors.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMentorRequest request, CancellationToken ct) =>
        Ok(await mentors.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await mentors.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
    {
        await mentors.DeactivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/reactivate")]
    public async Task<IActionResult> Reactivate(int id, CancellationToken ct)
    {
        await mentors.ReactivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetMentorPasswordRequest request, CancellationToken ct)
    {
        await mentors.ResetPasswordAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/transfer")]
    public async Task<IActionResult> Transfer(int id, [FromBody] TransferMentorRequest request, CancellationToken ct)
    {
        await mentors.TransferAsync(id, request, ct);
        return NoContent();
    }
}
