using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/idcards")]
[Authorize(Policy = Policies.Intern)]
public sealed class IdCardsController(IIdCardService idCardService) : ControllerBase
{
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken ct) => Ok(await idCardService.GetMineAsync(ct));
}
