using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/attendance/review")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class AttendanceReviewController(IAttendanceReviewService reviewService) : ControllerBase
{
    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(CancellationToken ct) => Ok(await reviewService.GetPendingReviewsAsync(ct));

    [HttpPost("{attendanceDayId:long}/decide")]
    public async Task<IActionResult> Decide(long attendanceDayId, [FromBody] ReviewDecisionRequest request, CancellationToken ct)
    {
        await reviewService.DecideReviewAsync(attendanceDayId, request, ct);
        return NoContent();
    }

    [HttpPost("overrides/{internProfileId:int}")]
    public async Task<IActionResult> RequestOverride(int internProfileId, [FromBody] RequestOverrideRequest request, CancellationToken ct) =>
        Ok(await reviewService.RequestOverrideAsync(internProfileId, request, ct));

    [HttpGet("overrides/pending")]
    public async Task<IActionResult> GetPendingOverrides(CancellationToken ct) => Ok(await reviewService.GetPendingOverridesAsync(ct));

    [HttpPost("overrides/{overrideId:long}/decide")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> DecideOverride(long overrideId, [FromBody] DecideOverrideRequest request, CancellationToken ct)
    {
        await reviewService.DecideOverrideAsync(overrideId, request, ct);
        return NoContent();
    }
}
