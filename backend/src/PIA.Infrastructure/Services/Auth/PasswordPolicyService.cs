using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Domain.Exceptions;

namespace PIA.Infrastructure.Services.Auth;

public sealed class PasswordPolicyService(IOptions<PasswordPolicyOptions> options, IPasswordHasher hasher) : IPasswordPolicyService
{
    // A representative sample, not the full "top 10,000" - swap CommonPasswords.txt (one per
    // line, loaded at startup) for the full list before a production deployment.
    private static readonly HashSet<string> CommonPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password1", "12345678", "123456789", "qwerty123", "letmein", "admin123",
        "welcome1", "iloveyou", "monkey123", "football", "abc12345", "passw0rd", "trustno1",
        "sunshine", "princess", "dragon123", "master123", "login123", "starwars", "whatever",
        "qwertyuiop", "1q2w3e4r5t", "zaq12wsx", "administrator", "changeme", "internship",
    };

    public void Validate(string password, string? email = null, string? fullName = null, string? currentPasswordHash = null)
    {
        var opts = options.Value;
        var errors = new List<string>();

        if (string.IsNullOrEmpty(password) || password.Length < opts.MinLength)
        {
            errors.Add($"Password must be at least {opts.MinLength} characters long.");
        }
        if (password?.Length > opts.MaxLength)
        {
            errors.Add($"Password must be at most {opts.MaxLength} characters long.");
        }
        if (opts.RequireUppercase && (password is null || !password.Any(char.IsUpper)))
        {
            errors.Add("Password must contain at least one uppercase letter.");
        }
        if (opts.RequireLowercase && (password is null || !password.Any(char.IsLower)))
        {
            errors.Add("Password must contain at least one lowercase letter.");
        }
        if (opts.RequireDigit && (password is null || !password.Any(char.IsDigit)))
        {
            errors.Add("Password must contain at least one digit.");
        }
        if (opts.RequireSymbol && (password is null || password.All(char.IsLetterOrDigit)))
        {
            errors.Add("Password must contain at least one special character.");
        }

        if (!string.IsNullOrEmpty(password) && CommonPasswords.Contains(password))
        {
            errors.Add("This password is too common. Please choose a less predictable password.");
        }

        if (!string.IsNullOrEmpty(password))
        {
            var localPart = email?.Split('@').FirstOrDefault();
            if (!string.IsNullOrEmpty(localPart) && password.Contains(localPart, StringComparison.OrdinalIgnoreCase))
            {
                errors.Add("Password must not contain your email address.");
            }

            var nameParts = fullName?.Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? [];
            if (nameParts.Any(part => part.Length >= 3 && password.Contains(part, StringComparison.OrdinalIgnoreCase)))
            {
                errors.Add("Password must not contain your name.");
            }
        }

        if (!string.IsNullOrEmpty(password) && currentPasswordHash is not null && hasher.Verify(password, currentPasswordHash))
        {
            errors.Add("New password must be different from the current password.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationException("password", string.Join(" ", errors));
        }
    }
}
