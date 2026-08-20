using System.Security.Cryptography;
using PIA.Application.Abstractions;

namespace PIA.Infrastructure.Services.Auth;

public sealed class TempPasswordGenerator : ITempPasswordGenerator
{
    private const string Uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O - avoid visual ambiguity
    private const string Lowercase = "abcdefghijkmnpqrstuvwxyz";
    private const string Digits = "23456789";
    private const string Symbols = "!@#$%^&*?";
    private const int Length = 12;

    public string Generate()
    {
        var all = Uppercase + Lowercase + Digits + Symbols;
        Span<char> result = stackalloc char[Length];

        // Guarantee at least one of each required class, then fill the rest randomly.
        result[0] = PickFrom(Uppercase);
        result[1] = PickFrom(Lowercase);
        result[2] = PickFrom(Digits);
        result[3] = PickFrom(Symbols);
        for (var i = 4; i < Length; i++)
        {
            result[i] = PickFrom(all);
        }

        Shuffle(result);
        return new string(result);
    }

    private static char PickFrom(string alphabet) => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];

    private static void Shuffle(Span<char> chars)
    {
        for (var i = chars.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }
    }
}
