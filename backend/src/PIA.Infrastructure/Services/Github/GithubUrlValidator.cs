using System.Text.RegularExpressions;

namespace PIA.Infrastructure.Services.Github;

/// <summary>
/// Format-only validation against github.com, deliberately never a server-side fetch of the
/// submitted URL - that would be a classic SSRF vector (an intern-controlled URL reaching an
/// internal HttpClient). The regex is anchored end-to-end so lookalike hosts
/// (github.com.evil.com, github.com@evil.com) and query/fragment smuggling cannot pass.
/// </summary>
public static partial class GithubUrlValidator
{
    [GeneratedRegex(@"^https://github\.com/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9_.-]{1,100}/?$")]
    private static partial Regex RepoUrlPattern();

    public static bool IsValid(string url) => RepoUrlPattern().IsMatch(url.Trim());
}
