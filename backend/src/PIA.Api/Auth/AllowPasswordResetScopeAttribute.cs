namespace PIA.Api.Auth;

/// <summary>
/// Opts an endpoint into being reachable with a restricted scope=pwd_reset token.
/// Only /auth/change-password, /auth/me, and /auth/logout carry this - everything else is
/// denied by MustResetPasswordGateMiddleware for a forced-reset user, deny-by-default.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class AllowPasswordResetScopeAttribute : Attribute;
