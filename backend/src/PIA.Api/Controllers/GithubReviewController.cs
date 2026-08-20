using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Github;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/github/review")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class GithubReviewController(IGithubReviewService reviewService) : ControllerBase
{
    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(CancellationToken ct) => Ok(await reviewService.GetPendingAsync(ct));

    [HttpPost("{submissionId:int}/decide")]
    public async Task<IActionResult> Decide(int submissionId, [FromBody] ReviewGithubRequest request, CancellationToken ct)
    {
        await reviewService.DecideAsync(submissionId, request, ct);
        return NoContent();
    }
}
