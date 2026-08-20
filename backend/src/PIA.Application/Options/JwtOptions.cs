using System.ComponentModel.DataAnnotations;

namespace PIA.Application.Options;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required, MinLength(64)]
    public string Key { get; set; } = string.Empty;

    [Required]
    public string Issuer { get; set; } = string.Empty;

    [Required]
    public string Audience { get; set; } = string.Empty;

    [Range(5, 180)]
    public int FullTokenLifetimeMinutes { get; set; } = 60;

    [Range(5, 30)]
    public int RestrictedTokenLifetimeMinutes { get; set; } = 15;

    [Range(1, 90)]
    public int RefreshTokenLifetimeDays { get; set; } = 14;
}
