using DocumentFormat.OpenXml.Packaging;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Certificates;
using PIA.Domain.Enums;

namespace PIA.Infrastructure.Services.Certificates;

public sealed class CertificateDocxRenderer(
    IFileStorage fileStorage,
    IDocxToPdfConverter converter,
    IQuestPdfCertificateRenderer fallbackRenderer) : ICertificateDocxRenderer
{
    public async Task<RenderedCertificate> RenderAsync(
        Guid templateFileId, IReadOnlyDictionary<string, string> data, string outputFileNameWithoutExtension, CancellationToken ct)
    {
        await using var templateStream = await fileStorage.OpenReadAsync(templateFileId, ct);
        using var buffer = new MemoryStream();
        await templateStream.CopyToAsync(buffer, ct);

        // MemoryStream(byte[]) wraps the array directly and is NOT resizable, which breaks the
        // moment OpenXml rewrites the zip's central directory to a different size than the
        // original - must start from an empty, growable buffer instead.
        using var editable = new MemoryStream();
        buffer.Position = 0;
        await buffer.CopyToAsync(editable, ct);
        editable.Position = 0;

        using (var wordDoc = WordprocessingDocument.Open(editable, true))
        {
            var body = wordDoc.MainDocumentPart!.Document.Body!;
            ParagraphMergeFieldReplacer.ReplaceAll(body, data);
            wordDoc.MainDocumentPart.Document.Save();
        }
        var mergedDocxBytes = editable.ToArray();

        var pdfBytes = await converter.TryConvertAsync(mergedDocxBytes, ct);
        var renderedBy = CertificateRenderedBy.DocxTemplate;
        if (pdfBytes is null)
        {
            pdfBytes = fallbackRenderer.Render(data);
            renderedBy = CertificateRenderedBy.BuiltInLayout;
        }

        return new RenderedCertificate(new GeneratedFileResult(pdfBytes, $"{outputFileNameWithoutExtension}.pdf", "application/pdf"), renderedBy);
    }
}
