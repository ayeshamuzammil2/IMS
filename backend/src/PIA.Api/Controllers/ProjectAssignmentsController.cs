using FluentValidation;
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

    [HttpPut("assignment/{assignmentId:int}")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> Update(int assignmentId, [FromForm] UpdateProjectAssignmentForm form, CancellationToken ct)
    {
        Stream? stream = form.File is not null ? form.File.OpenReadStream() : null;
        try
        {
            var request = new AssignProjectRequest(
                form.Title, form.Description, form.DueDate, stream, form.File?.FileName, form.File?.ContentType);
            return Ok(await projectService.UpdateAsync(assignmentId, request, ct));
        }
        finally
        {
            if (stream is not null) await stream.DisposeAsync();
        }
    }

    [HttpDelete("assignment/{assignmentId:int}")]
    public async Task<IActionResult> Delete(int assignmentId, CancellationToken ct)
    {
        await projectService.DeleteAsync(assignmentId, ct);
        return NoContent();
    }
}

public sealed class AssignProjectForm
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    public IFormFile? File { get; set; }
}

/// <summary>
/// Title, Description, DueDate, and File are all mandatory - a mentor can't leave a project
/// half-specified. Picked up automatically by FluentValidationActionFilter (runs against every
/// action argument with a registered IValidator&lt;T&gt;), even though AssignProjectForm is
/// [FromForm]-bound multipart data rather than a JSON body.
/// </summary>
public sealed class AssignProjectFormValidator : AbstractValidator<AssignProjectForm>
{
    public AssignProjectFormValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Title is required.");
        RuleFor(x => x.Description).NotEmpty().WithMessage("Description is required.");
        RuleFor(x => x.DueDate).NotNull().WithMessage("Due date is required.");
        RuleFor(x => x.File).NotNull().WithMessage("A file attachment is required.");
    }
}

/// <summary>Same shape as AssignProjectForm, but File is deliberately optional here - editing an
/// assignment should let a mentor update the title/description/due date without being forced to
/// re-attach a file every time. A file, if provided, replaces the existing attachment.</summary>
public sealed class UpdateProjectAssignmentForm
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    public IFormFile? File { get; set; }
}

public sealed class UpdateProjectAssignmentFormValidator : AbstractValidator<UpdateProjectAssignmentForm>
{
    public UpdateProjectAssignmentFormValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Title is required.");
        RuleFor(x => x.Description).NotEmpty().WithMessage("Description is required.");
        RuleFor(x => x.DueDate).NotNull().WithMessage("Due date is required.");
    }
}
