using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Projects;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/projects/intern")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class ProjectAssignmentsController(IProjectAssignmentService projectService) : ControllerBase
{
    [HttpGet("{internProfileId:int}")]
    public async Task<IActionResult> GetForIntern(int internProfileId, CancellationToken ct) =>
        Ok(await projectService.GetForInternAsync(internProfileId, ct));

    [HttpPost("{internProfileId:int}")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> Assign(int internProfileId, [FromForm] AssignProjectForm form, CancellationToken ct)
    {
        Stream? stream = form.File is not null ? form.File.OpenReadStream() : null;
        try
        {
            var request = new AssignProjectRequest(
                form.Title, form.Description, form.DueDate, stream, form.File?.FileName, form.File?.ContentType);
            return Ok(await projectService.AssignAsync(internProfileId, request, ct));
        }
        finally
        {
            if (stream is not null) await stream.DisposeAsync();
        }
    }
}

public sealed class AssignProjectForm
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    public IFormFile? File { get; set; }
}
