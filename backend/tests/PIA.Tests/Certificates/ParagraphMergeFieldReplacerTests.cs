using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FluentAssertions;
using PIA.Infrastructure.Services.Certificates;
using Xunit;

namespace PIA.Tests.Certificates;

/// <summary>
/// Proves the specific failure mode this file exists to fix: Word splits a single visible
/// `{{InternName}}` token across multiple runs (autocorrect, spellcheck, a cursor pause mid-type),
/// and a naive whole-run string replace silently does nothing on a paragraph like that. Built by
/// hand-assembling split runs via the OpenXml SDK rather than a fixture .docx, so the exact
/// run-boundary being tested is visible in the test itself.
/// </summary>
public sealed class ParagraphMergeFieldReplacerTests
{
    private static byte[] BuildTestDocx()
    {
        using var stream = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(stream, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = new Body();

            // Placeholder split across three runs, exactly as Word does in practice:
            // run1="{{Intern"  run2="Name"  run3="}}"
            var splitParagraph = new Paragraph(
                new Run(new Text("{{Intern") { Space = SpaceProcessingModeValues.Preserve }),
                new Run(new Text("Name") { Space = SpaceProcessingModeValues.Preserve }),
                new Run(new Text("}}") { Space = SpaceProcessingModeValues.Preserve }));
            body.AppendChild(splitParagraph);

            // Single-run field, the easy case.
            var singleRunParagraph = new Paragraph(new Run(new Text("Certificate No: {{CertificateNumber}}")));
            body.AppendChild(singleRunParagraph);

            // No merge field at all - must be left completely untouched.
            var plainParagraph = new Paragraph(
                new Run(new Text("This is to certify that")),
                new Run(new Text(" the above.")));
            body.AppendChild(plainParagraph);

            mainPart.Document.AppendChild(body);
            mainPart.Document.Save();
        }
        return stream.ToArray();
    }

    [Fact]
    public void ExtractFieldNames_FindsFieldSplitAcrossRuns()
    {
        var bytes = BuildTestDocx();
        using var stream = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(stream, false);
        var body = doc.MainDocumentPart!.Document.Body!;

        var fields = MergeFieldExtractor.ExtractFieldNames(body);

        fields.Should().Contain("InternName");
        fields.Should().Contain("CertificateNumber");
        fields.Should().HaveCount(2);
    }

    [Fact]
    public void ReplaceAll_MergesSplitRunField_AndLeavesPlainParagraphUntouched()
    {
        var bytes = BuildTestDocx();
        using var stream = new MemoryStream(bytes);
        using (var doc = WordprocessingDocument.Open(stream, true))
        {
            var body = doc.MainDocumentPart!.Document.Body!;
            var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["InternName"] = "John Doe",
                ["CertificateNumber"] = "CERT-PIA-ERP-2026-0001",
            };

            ParagraphMergeFieldReplacer.ReplaceAll(body, data);
            doc.MainDocumentPart.Document.Save();

            var paragraphs = body.Elements<Paragraph>().ToList();

            MergeFieldExtractor.ReconstructParagraphText(paragraphs[0]).Should().Be("John Doe");
            paragraphs[0].Elements<Run>().Should().HaveCount(1, "the split runs must be folded into one after merging");

            MergeFieldExtractor.ReconstructParagraphText(paragraphs[1]).Should().Be("Certificate No: CERT-PIA-ERP-2026-0001");

            MergeFieldExtractor.ReconstructParagraphText(paragraphs[2]).Should().Be("This is to certify that the above.");
            paragraphs[2].Elements<Run>().Should().HaveCount(2, "a paragraph with no merge field must keep its original runs untouched");
        }
    }
}
