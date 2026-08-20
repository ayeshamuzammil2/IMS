using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;
using PIA.Domain.Exceptions;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/attendance")]
public sealed class AttendanceController(
    IAttendanceService attendanceService,
    IAttendanceQueryService queryService) : ControllerBase
{
    [HttpGet("today")]
    [Authorize(Policy = Policies.Intern)]
    public async Task<IActionResult> Today(
        [FromQuery] decimal? latitude, [FromQuery] decimal? longitude, [FromQuery] decimal? accuracyMeters, CancellationToken ct) =>
        Ok(await attendanceService.GetTodayAsync(latitude, longitude, accuracyMeters, ct));

    [HttpPost("sessions")]
    [Authorize(Policy = Policies.Intern)]
    public async Task<IActionResult> CreateSession([FromBody] CreateAttendanceSessionRequest request, CancellationToken ct) =>
        Ok(await attendanceService.CreateSessionAsync(request, ct));

    [HttpPost("sessions/{sessionId:guid}/submit")]
    [Authorize(Policy = Policies.Intern)]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> Submit(Guid sessionId, [FromForm] SubmitAttendanceForm form, CancellationToken ct)
    {
        if (form.Frames.Count == 0)
        {
            throw new ValidationException("frames", "At least one frame is required.");
        }

        var frames = ChallengeFrameBinding.BuildFrames(form.Frames, form.TelemetryJson);
        try
        {
            var request = new SubmitAttendanceRequest(
                frames, form.Latitude, form.Longitude, form.AccuracyMeters,
                form.DeviceId, form.Mocked, form.DeviceModel, form.AppVersion, form.AttestationToken);

            return Ok(await attendanceService.SubmitAsync(sessionId, request, ct));
        }
        finally
        {
            foreach (var f in frames) await f.Content.DisposeAsync();
        }
    }

    [HttpGet("team-today")]
    [Authorize(Policy = Policies.AdminOrMentor)]
    public async Task<IActionResult> TeamToday([FromQuery] int? departmentId, [FromQuery] int? mentorId, CancellationToken ct) =>
        Ok(await queryService.GetTeamTodayAsync(departmentId, mentorId, ct));

    [HttpGet("history")]
    [Authorize(Policy = Policies.AdminOrMentor)]
    public async Task<IActionResult> History(
        [FromQuery] DateOnly startDate, [FromQuery] DateOnly endDate, [FromQuery] int? departmentId, [FromQuery] int? mentorId, CancellationToken ct) =>
        Ok(await queryService.GetHistoryAsync(startDate, endDate, departmentId, mentorId, ct));

}

public sealed class SubmitAttendanceForm
{
    public List<Microsoft.AspNetCore.Http.IFormFile> Frames { get; set; } = [];
    public string TelemetryJson { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public decimal AccuracyMeters { get; set; }
    public string DeviceId { get; set; } = string.Empty;
    public bool? Mocked { get; set; }
    public string? DeviceModel { get; set; }
    public string? AppVersion { get; set; }
    public string? AttestationToken { get; set; }
}
