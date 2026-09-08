using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;

namespace PIA.Api.Controllers;

/// <summary>
/// Manual human-review step for face enrollment: an enrollment that already passed the automatic
/// liveness/cross-match checks (see FaceEnrollmentService.SubmitAsync) sits at
/// FaceEnrollmentStatus.Pending until a mentor/admin looks at the captured photo here and
/// explicitly approves or rejects it. Attendance stays locked the whole time (AttendanceService
/// only treats FaceEnrollmentStatus.Active as ready).
/// </summary>
[ApiController]
[Route("api/attendance/enrollment/review")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class FaceEnrollmentReviewController(IFaceEnrollmentService enrollmentService) : ControllerBase
{
    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(CancellationToken ct) => Ok(await enrollmentService.GetPendingReviewsAsync(ct));

    [HttpGet("{internProfileId:int}")]
    public async Task<IActionResult> GetDetail(int internProfileId, CancellationToken ct) =>
        Ok(await enrollmentService.GetReviewDetailAsync(internProfileId, ct));

    [HttpPost("{internProfileId:int}/decide")]
    public async Task<IActionResult> Decide(int internProfileId, [FromBody] DecideFaceEnrollmentRequest request, CancellationToken ct)
    {
        await enrollmentService.DecideReviewAsync(internProfileId, request, ct);
        return NoContent();
    }
}
