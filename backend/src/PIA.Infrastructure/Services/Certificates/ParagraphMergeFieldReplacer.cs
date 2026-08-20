using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Wordprocessing;

namespace PIA.Infrastructure.Services.Certificates;

/// <summary>
/// Fixes the specific failure mode that makes naive docx templating break on real Word files:
/// Word splits a single visible token like `{{InternName}}` across multiple `&lt;w:r&gt;` runs the
/// moment autocorrect, spellcheck, or a mid-type cursor pause touches it, so a straight
/// string-replace on any one run's text silently does nothing. This reconstructs each paragraph's
/// full text across all its runs, replaces tokens there, then folds the merged text back into the
/// paragraph's first run (keeping its formatting) and discards the rest of that paragraph's runs -
/// which is safe because a placeholder paragraph in a certificate template is never relying on
/// multiple distinct formatting spans within itself.
/// </summary>
public static class ParagraphMergeFieldReplacer
{
    public static void ReplaceAll(Body body, IReadOnlyDictionary<string, string> data)
    {
        foreach (var paragraph in body.Descendants<Paragraph>().ToList())
        {
            var runs = paragraph.Elements<Run>().ToList();
            if (runs.Count == 0) continue;

            var originalText = MergeFieldExtractor.ReconstructParagraphText(paragraph);
            if (!originalText.Contains("{{", StringComparison.Ordinal)) continue;

            var replacedText = MergeFieldExtractor.ReplaceTokens(originalText, data);

            var firstRun = runs[0];
            var firstText = firstRun.GetFirstChild<Text>();
            if (firstText is null)
            {
                firstText = new Text();
                firstRun.AppendChild(firstText);
            }
            firstText.Text = replacedText;
            firstText.Space = SpaceProcessingModeValues.Preserve;

            foreach (var extraText in firstRun.Elements<Text>().Skip(1).ToList())
            {
                extraText.Remove();
            }

            foreach (var run in runs.Skip(1))
            {
                run.Remove();
            }
        }
    }
}
