using Microsoft.AspNetCore.Mvc;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Chat;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/chat")]
public sealed class ChatController(IChatService chat) : ControllerBase
{
    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts(CancellationToken ct) => Ok(await chat.GetContactsAsync(ct));

    [HttpGet("{otherUserId:int}/messages")]
    public async Task<IActionResult> GetMessages(int otherUserId, CancellationToken ct) =>
        Ok(await chat.GetMessagesAsync(otherUserId, ct));

    [HttpPost("{otherUserId:int}/messages")]
    public async Task<IActionResult> SendMessage(int otherUserId, [FromBody] SendChatMessageRequest request, CancellationToken ct) =>
        Ok(await chat.SendAsync(otherUserId, request, ct));
}
