using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Wordprocessing;

namespace PIA.Infrastructure.Services.Certificates;

/// <summary>
/// Reads the merge-field names (`{{FieldName}}`) referenced by a .docx template. Reconstructs
/// each paragraph's full text across all its runs first - Word routinely splits a single
/// `{{InternName}}` token across 2-3 runs whenever the user's cursor paused mid-type or
/// autocorrect touched it, so scanning run-by-run silently misses most real templates.
/// </summary>
public static partial class MergeFieldExtractor
{
    [GeneratedRegex(@"\{\{\s*([A-Za-z0-9_]+)\s*\}\}")]
    private static partial Regex FieldTokenPattern();

    public static IReadOnlyList<string> ExtractFieldNames(Body body)
    {
        var found = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var paragraph in body.Descendants<Paragraph>())
        {
            var text = ReconstructParagraphText(paragraph);
            foreach (Match match in FieldTokenPattern().Matches(text))
            {
                var name = match.Groups[1].Value;
                if (seen.Add(name)) found.Add(name);
            }
        }

        return found;
    }

    public static string ReplaceTokens(string text, IReadOnlyDictionary<string, string> data) =>
        FieldTokenPattern().Replace(text, match => data.TryGetValue(match.Groups[1].Value, out var value) ? value : string.Empty);

    public static string ReconstructParagraphText(Paragraph paragraph)
    {
        var sb = new StringBuilder();
        foreach (var run in paragraph.Elements<Run>())
        {
            foreach (var text in run.Elements<Text>())
            {
                sb.Append(text.Text);
            }
        }
        return sb.ToString();
    }
}
