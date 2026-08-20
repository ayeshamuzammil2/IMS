using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PIA.Api.Auth;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Auth;

namespace PIA.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, ICurrentUser currentUser) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var response = await authService.LoginAsync(request, ip, ct);
        return Ok(response);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-login")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var response = await authService.RefreshAsync(request, ip, ct);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize(Policy = Policies.AnyAuthenticated)]
    [AllowPasswordResetScope]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request, CancellationToken ct)
    {
        await authService.LogoutAsync(request, ct);
        return NoContent();
    }

    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        await authService.LogoutAllAsync(currentUser.UserId, ct);
        return NoContent();
    }

    [HttpPost("change-password")]
    [Authorize(Policy = Policies.AnyAuthenticated)]
    [AllowPasswordResetScope]
    public async Task<ActionResult<LoginResponse>> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var response = await authService.ChangePasswordAsync(currentUser.UserId, request, ip, ct);
        return Ok(response);
    }

    [HttpGet("me")]
    [Authorize(Policy = Policies.AnyAuthenticated)]
    [AllowPasswordResetScope]
    public async Task<ActionResult<MeResponse>> Me(CancellationToken ct)
    {
        var response = await authService.GetMeAsync(currentUser.UserId, ct);
        return Ok(response);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-forgot")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await authService.ForgotPasswordAsync(request, ct);
        // Always 200, regardless of whether the account exists - no enumeration.
        return Ok(new { message = "If that email is registered, a new password has been sent to it." });
    }
}
