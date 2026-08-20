using Microsoft.Extensions.Options;
using PIA.Application.Options;

namespace PIA.Api.Options;

/// <summary>
/// Fails startup (not just a warning) if the JWT key is missing, too short, or matches a known
/// placeholder. v1's placeholder key was >=32 chars and therefore "worked" - meaning anyone who
/// read the repo could forge an Admin token on a default deploy. Startup failure is the only
/// acceptable behaviour here.
/// </summary>
public sealed class JwtOptionsValidator : IValidateOptions<JwtOptions>
{
    private static readonly string[] KnownPlaceholders =
    [
        "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY_AT_LEAST_32_CHARS",
        "your-secret-key-here",
        "changeme",
    ];

    public ValidateOptionsResult Validate(string? name, JwtOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Key))
        {
            return ValidateOptionsResult.Fail("Jwt:Key is required. Set it via user-secrets or an environment variable - never in appsettings.json.");
        }
        if (options.Key.Length < 64)
        {
            return ValidateOptionsResult.Fail($"Jwt:Key must be at least 64 characters (got {options.Key.Length}).");
        }
        if (KnownPlaceholders.Any(p => options.Key.Contains(p, StringComparison.OrdinalIgnoreCase)))
        {
            return ValidateOptionsResult.Fail("Jwt:Key matches a known placeholder value. Generate a real random secret.");
        }
        if (string.IsNullOrWhiteSpace(options.Issuer) || string.IsNullOrWhiteSpace(options.Audience))
        {
            return ValidateOptionsResult.Fail("Jwt:Issuer and Jwt:Audience are required.");
        }

        return ValidateOptionsResult.Success;
    }
}
