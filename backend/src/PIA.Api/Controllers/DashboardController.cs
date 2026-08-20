using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] int? departmentId, CancellationToken ct) =>
        Ok(await dashboardService.GetSummaryAsync(departmentId, ct));
}
