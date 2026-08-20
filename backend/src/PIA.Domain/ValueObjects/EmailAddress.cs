using System.Text.RegularExpressions;
using PIA.Domain.Exceptions;

namespace PIA.Domain.ValueObjects;

/// <summary>A syntactically valid, lowercase-normalized email address. Deliverability is verified separately (MX lookup + OTP receipt), not here.</summary>
public sealed partial class EmailAddress : IEquatable<EmailAddress>
{
    public string Value { get; }

    private EmailAddress(string value) => Value = value;

    public static EmailAddress Parse(string input)
    {
        if (!TryParse(input, out var email, out var error))
        {
            throw new InvalidEmailException(error!);
        }
        return email;
    }

    public static bool TryParse(string? input, out EmailAddress result, out string? error)
    {
        result = null!;
        if (string.IsNullOrWhiteSpace(input))
        {
            error = "Email is required.";
            return false;
        }

        var trimmed = input.Trim();
        if (trimmed.Length > 254 || !EmailRegex().IsMatch(trimmed))
        {
            error = "Email address is not valid.";
            return false;
        }

        result = new EmailAddress(trimmed.ToLowerInvariant());
        error = null;
        return true;
    }

    public string Domain => Value[(Value.IndexOf('@') + 1)..];

    public override string ToString() => Value;
    public bool Equals(EmailAddress? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => Equals(obj as EmailAddress);
    public override int GetHashCode() => Value.GetHashCode();

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")]
    private static partial Regex EmailRegex();
}
