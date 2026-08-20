using Microsoft.AspNetCore.Mvc;
using PIA.Api.Auth;
using PIA.Application.Abstractions;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public sealed class NotificationsController(INotificationQueryService notifications, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool unreadOnly = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var result = await notifications.ListAsync(currentUser.UserId, unreadOnly, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        var count = await notifications.GetUnreadCountAsync(currentUser.UserId, ct);
        return Ok(new { count });
    }

    [HttpPut("{id:long}/read")]
    public async Task<IActionResult> MarkRead(long id, CancellationToken ct)
    {
        await notifications.MarkReadAsync(currentUser.UserId, id, ct);
        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await notifications.MarkAllReadAsync(currentUser.UserId, ct);
        return NoContent();
    }
}
