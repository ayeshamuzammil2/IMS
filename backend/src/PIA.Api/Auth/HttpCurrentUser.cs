using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using PIA.Application.Abstractions;
using PIA.Domain.Enums;
using PIA.Infrastructure.Services.Auth;

namespace PIA.Api.Auth;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public int UserId => int.Parse(Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? throw new InvalidOperationException("No authenticated user in context."));

    public UserRole Role => Enum.Parse<UserRole>(Principal?.FindFirstValue(ClaimTypes.Role)
        ?? throw new InvalidOperationException("No authenticated user in context."));

    public string Email => Principal?.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

    public int? DepartmentId => int.TryParse(Principal?.FindFirstValue(JwtClaimTypes.DepartmentId), out var id) ? id : null;

    public int? InternProfileId => int.TryParse(Principal?.FindFirstValue(JwtClaimTypes.InternProfileId), out var id) ? id : null;

    public string Scope => Principal?.FindFirstValue(JwtClaimTypes.Scope) ?? string.Empty;

    public string SecurityStamp => Principal?.FindFirstValue(JwtClaimTypes.SecurityStamp) ?? string.Empty;

    public string Jti => Principal?.FindFirstValue(JwtRegisteredClaimNames.Jti) ?? string.Empty;
}

public sealed class HttpCorrelationContext(IHttpContextAccessor accessor) : ICorrelationContext
{
    public string CorrelationId => accessor.HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString("N");

    public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public string? UserAgent
    {
        get
        {
            var value = accessor.HttpContext?.Request.Headers.UserAgent.ToString();
            return string.IsNullOrEmpty(value) ? null : value[..Math.Min(value.Length, 256)];
        }
    }
}
