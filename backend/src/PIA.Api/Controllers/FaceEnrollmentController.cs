using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/attendance/enrollment")]
[Authorize(Policy = Policies.Intern)]
public sealed class FaceEnrollmentController(IFaceEnrollmentService enrollmentService) : ControllerBase
{
    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateEnrollmentSessionRequest request, CancellationToken ct) =>
        Ok(await enrollmentService.CreateSessionAsync(request, ct));

    [HttpPost("sessions/{sessionId:guid}/submit")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> Submit(Guid sessionId, [FromForm] SubmitEnrollmentForm form, CancellationToken ct)
    {
        var frames = ChallengeFrameBinding.BuildFrames(form.Frames, form.TelemetryJson);
        try
        {
            var request = new SubmitEnrollmentRequest(frames, form.DeviceId, form.ConsentAcknowledged);
            return Ok(await enrollmentService.SubmitAsync(sessionId, request, ct));
        }
        finally
        {
            foreach (var f in frames) await f.Content.DisposeAsync();
        }
    }
}

public sealed class SubmitEnrollmentForm
{
    public List<IFormFile> Frames { get; set; } = [];
    public string TelemetryJson { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public bool ConsentAcknowledged { get; set; }
}
