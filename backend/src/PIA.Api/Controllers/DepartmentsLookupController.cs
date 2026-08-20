using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;

namespace PIA.Api.Controllers;

/// <summary>
/// Split from DepartmentsController deliberately - [Authorize] attributes at class and action
/// level are AND-combined, not overridden, so a class-level AdminOrMentor policy would silently
/// narrow an action-level AnyRole override back down to AdminOrMentor. Any policy that isn't a
/// subset of the controller's class-level policy needs its own controller, not an attribute override.
/// </summary>
[ApiController]
[Route("api/departments")]
[Authorize(Policy = Policies.AnyRole)]
public sealed class DepartmentsLookupController(IDepartmentService departments) : ControllerBase
{
    [HttpGet("lookup")]
    public async Task<IActionResult> Lookup(CancellationToken ct) => Ok(await departments.LookupAsync(ct));
}
