using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;

namespace PIA.Api.Controllers;

/// <summary>Manual trigger for demoing/testing without waiting for a job's schedule. One route per
/// job name rather than a reflection-based dispatcher - each job has a different (or absent)
/// parameter shape, so a truly generic invoker would just push that mismatch into query-string
/// parsing instead of removing it.</summary>
[ApiController]
[Route("api/admin/jobs")]
[Authorize(Policy = Policies.Admin)]
public sealed class AdminJobsController(IAutoAbsentJob autoAbsentJob, IMediaRetentionJob mediaRetentionJob, IClock clock) : ControllerBase
{
    [HttpPost("{name}/run")]
    public async Task<IActionResult> Run(string name, [FromQuery] DateOnly? date, CancellationToken ct)
    {
        switch (name)
        {
            case "auto-absent":
            {
                var target = date ?? clock.TodayInPakistan;
                var processed = await autoAbsentJob.RunAsync(target, JobTrigger.Manual, ct);
                return Ok(new { job = name, processed, date = target });
            }
            case "media-retention":
            {
                var processed = await mediaRetentionJob.RunAsync(JobTrigger.Manual, ct);
                return Ok(new { job = name, processed });
            }
            default:
                throw new NotFoundException("Job", name);
        }
    }
}
