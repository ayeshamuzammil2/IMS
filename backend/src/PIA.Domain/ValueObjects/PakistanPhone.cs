using System.Text.RegularExpressions;
using PIA.Domain.Exceptions;

namespace PIA.Domain.ValueObjects;

/// <summary>Pakistani mobile number, stored normalized as +923XXXXXXXXX.</summary>
public sealed partial class PakistanPhone : IEquatable<PakistanPhone>
{
    public string Value { get; }

    private PakistanPhone(string value) => Value = value;

    public static PakistanPhone Parse(string input)
    {
        if (!TryParse(input, out var phone, out var error))
        {
            throw new InvalidPhoneException(error!);
        }
        return phone;
    }

    public static bool TryParse(string? input, out PakistanPhone result, out string? error)
    {
        result = null!;
        if (string.IsNullOrWhiteSpace(input))
        {
            error = "Phone number is required.";
            return false;
        }

        var normalized = input.Replace(" ", "").Replace("-", "").Trim();

        // Accept 03XXXXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX -> canonical +923XXXXXXXXX
        if (normalized.StartsWith("+92"))
        {
            normalized = normalized[3..];
        }
        else if (normalized.StartsWith("92") && normalized.Length == 12)
        {
            normalized = normalized[2..];
        }
        else if (normalized.StartsWith("0"))
        {
            normalized = normalized[1..];
        }

        if (!MobileRegex().IsMatch(normalized))
        {
            error = "Phone number must be a valid Pakistani mobile number, e.g. 03001234567.";
            return false;
        }

        result = new PakistanPhone($"+92{normalized}");
        error = null;
        return true;
    }

    public override string ToString() => Value;
    public bool Equals(PakistanPhone? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => Equals(obj as PakistanPhone);
    public override int GetHashCode() => Value.GetHashCode();

    // 10 digits after the leading 0/92 is stripped: 3XXYYYYYYY (network code 3xx + 7 digits)
    [GeneratedRegex(@"^3\d{9}$")]
    private static partial Regex MobileRegex();
}
