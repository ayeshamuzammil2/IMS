using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/certificates")]
[Authorize(Policy = Policies.Intern)]
public sealed class CertificatesController(ICertificateService certificateService) : ControllerBase
{
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken ct) => Ok(await certificateService.GetMineAsync(ct));
}
