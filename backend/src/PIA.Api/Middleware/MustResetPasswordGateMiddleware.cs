using PIA.Api.Auth;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Services.Auth;

namespace PIA.Api.Middleware;

/// <summary>
/// Deny-by-default enforcement of the must-reset-password gate: a scope=pwd_reset token can only
/// reach endpoints explicitly marked [AllowPasswordResetScope]. v1's forced reset was enforced
/// client-side only - the issued JWT was fully privileged regardless. This middleware means a
/// new controller added later is automatically gated without anyone having to remember to guard it.
/// </summary>
public sealed class MustResetPasswordGateMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var user = context.User;
        if (user.Identity?.IsAuthenticated == true)
        {
            var scope = user.FindFirst(JwtClaimTypes.Scope)?.Value;
            if (scope == JwtClaimTypes.ScopePasswordReset)
            {
                var endpoint = context.GetEndpoint();
                var allowed = endpoint?.Metadata.GetMetadata<AllowPasswordResetScopeAttribute>() is not null;
                if (!allowed)
                {
                    throw new PasswordResetRequiredException("You must set a new password before using the app.");
                }
            }
        }

        await next(context);
    }
}
