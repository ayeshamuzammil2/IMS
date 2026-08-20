using System.Text.RegularExpressions;
using PIA.Domain.Exceptions;

namespace PIA.Domain.ValueObjects;

/// <summary>Pakistani CNIC, stored normalized as 13 digits with no dashes.</summary>
public sealed partial class Cnic : IEquatable<Cnic>
{
    public string Value { get; }

    private Cnic(string value) => Value = value;

    public static Cnic Parse(string input)
    {
        if (!TryParse(input, out var cnic, out var error))
        {
            throw new InvalidCnicException(error!);
        }
        return cnic;
    }

    public static bool TryParse(string? input, out Cnic result, out string? error)
    {
        result = null!;
        if (string.IsNullOrWhiteSpace(input))
        {
            error = "CNIC is required.";
            return false;
        }

        var digitsOnly = input.Replace("-", "").Replace(" ", "").Trim();

        if (!DigitsOnlyRegex().IsMatch(digitsOnly) || digitsOnly.Length != 13)
        {
            error = "CNIC must be exactly 13 digits (with or without dashes), e.g. 42101-1234567-1.";
            return false;
        }

        if (digitsOnly == new string(digitsOnly[0], 13))
        {
            error = "CNIC cannot consist of a single repeated digit.";
            return false;
        }

        result = new Cnic(digitsOnly);
        error = null;
        return true;
    }

    public string Formatted => $"{Value[..5]}-{Value[5..12]}-{Value[12..]}";

    public override string ToString() => Value;
    public bool Equals(Cnic? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => Equals(obj as Cnic);
    public override int GetHashCode() => Value.GetHashCode();

    [GeneratedRegex(@"^\d{13}$")]
    private static partial Regex DigitsOnlyRegex();
}
