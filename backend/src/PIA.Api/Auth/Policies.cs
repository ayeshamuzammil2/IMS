using Microsoft.AspNetCore.Authorization;
using PIA.Domain.Enums;
using PIA.Infrastructure.Services.Auth;

namespace PIA.Api.Auth;

public static class Policies
{
    public const string Admin = nameof(Admin);
    public const string Mentor = nameof(Mentor);
    public const string Intern = nameof(Intern);
    public const string AdminOrMentor = nameof(AdminOrMentor);
    public const string AnyRole = nameof(AnyRole);

    /// <summary>
    /// No scope requirement at all - used ONLY on the handful of endpoints also marked
    /// [AllowPasswordResetScope] (change-password, me, logout), so both a fully-privileged
    /// session and a restricted first-login session can reach them. MustResetPasswordGateMiddleware
    /// is what actually keeps a restricted token from reaching anything else.
    /// </summary>
    public const string AnyAuthenticated = nameof(AnyAuthenticated);

    public static void AddPiaPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(Admin, p => p.RequireClaim(JwtClaimTypes.Scope, JwtClaimTypes.ScopeFull)
            .RequireRole(UserRole.Admin.ToString()));
        options.AddPolicy(Mentor, p => p.RequireClaim(JwtClaimTypes.Scope, JwtClaimTypes.ScopeFull)
            .RequireRole(UserRole.Mentor.ToString()));
        options.AddPolicy(Intern, p => p.RequireClaim(JwtClaimTypes.Scope, JwtClaimTypes.ScopeFull)
            .RequireRole(UserRole.Intern.ToString()));
        options.AddPolicy(AdminOrMentor, p => p.RequireClaim(JwtClaimTypes.Scope, JwtClaimTypes.ScopeFull)
            .RequireRole(UserRole.Admin.ToString(), UserRole.Mentor.ToString()));
        options.AddPolicy(AnyRole, p => p.RequireClaim(JwtClaimTypes.Scope, JwtClaimTypes.ScopeFull)
            .RequireAuthenticatedUser());
        options.AddPolicy(AnyAuthenticated, p => p.RequireAuthenticatedUser());

        // Deny-by-default: any endpoint without an explicit [Authorize] falls back to requiring
        // a full-scope authenticated user. This alone would have prevented v1's unguarded
        // PUT /api/tasks/{id}/status.
        options.FallbackPolicy = options.GetPolicy(AnyRole);
    }
}
