using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Departments;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class DepartmentsController(IDepartmentService departments) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await departments.ListAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await departments.GetAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentRequest request, CancellationToken ct)
    {
        var created = await departments.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDepartmentRequest request, CancellationToken ct) =>
        Ok(await departments.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
    {
        await departments.DeactivateAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/reactivate")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Reactivate(int id, CancellationToken ct)
    {
        await departments.ReactivateAsync(id, ct);
        return NoContent();
    }
}
