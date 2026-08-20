using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Github;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/github")]
[Authorize(Policy = Policies.Intern)]
public sealed class GithubController(IGithubService githubService) : ControllerBase
{
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct) => Ok(await githubService.GetMyStatusAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitGithubRequest request, CancellationToken ct) =>
        Ok(await githubService.SubmitAsync(request, ct));
}
