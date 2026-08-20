using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Documents;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/documents/review")]
[Authorize(Policy = Policies.AdminOrMentor)]
public sealed class DocumentReviewController(IDocumentReviewService reviewService) : ControllerBase
{
    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(CancellationToken ct) => Ok(await reviewService.GetPendingAsync(ct));

    [HttpPost("{documentId:int}/decide")]
    public async Task<IActionResult> Decide(int documentId, [FromBody] ReviewDocumentRequest request, CancellationToken ct)
    {
        await reviewService.DecideAsync(documentId, request, ct);
        return NoContent();
    }
}
