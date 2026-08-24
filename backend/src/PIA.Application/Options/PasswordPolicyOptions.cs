namespace PIA.Application.Options;

public sealed class PasswordPolicyOptions
{
    public const string SectionName = "PasswordPolicy";

    public int MinLength { get; set; } = 8;
    public int MaxLength { get; set; } = 128;
    public bool RequireUppercase { get; set; } = true;
    public bool RequireLowercase { get; set; } = true;
    public bool RequireDigit { get; set; } = true;
    public bool RequireSymbol { get; set; } = true;
}

public sealed class LoginLockoutOptions
{
    public const string SectionName = "LoginLockout";

    public int MaxFailedAttempts { get; set; } = 5;
    public int InitialLockoutMinutes { get; set; } = 15;
    public int MaxLockoutMinutes { get; set; } = 60;
}
