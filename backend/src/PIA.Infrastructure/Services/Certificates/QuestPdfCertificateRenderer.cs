using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PIA.Infrastructure.Services.Certificates;

public interface IQuestPdfCertificateRenderer
{
    byte[] Render(IReadOnlyDictionary<string, string> data);
}

/// <summary>Built-in fallback layout used whenever LibreOffice can't render the mentor's actual
/// .docx template - ported from v1's PdfGeneratorService.GenerateCertificate with the same PIA
/// green theme, driven by the same merge-field dictionary as the real docx path.</summary>
public sealed class QuestPdfCertificateRenderer : IQuestPdfCertificateRenderer
{
    private const string PrimaryGreen = "#1B5E20";
    private const string MediumGreen = "#66BB6A";

    private static readonly byte[]? LogoBytes = LoadLogo();

    public byte[] Render(IReadOnlyDictionary<string, string> data)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        string Field(string key) => data.TryGetValue(key, out var value) ? value : string.Empty;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(0);
                page.PageColor(Colors.White);

                page.Content().Padding(30).Border(3).BorderColor(PrimaryGreen).Padding(30).Column(col =>
                {
                    if (LogoBytes is not null)
                    {
                        col.Item().AlignCenter().Height(60).Image(LogoBytes).FitHeight();
                        col.Item().Height(10);
                    }

                    col.Item().AlignCenter().Text("PAKISTAN INTERNATIONAL AIRLINES")
                        .FontSize(22).Bold().FontColor(PrimaryGreen);

                    col.Item().AlignCenter().Text("Certificate of Internship Completion")
                        .FontSize(16).FontColor(MediumGreen);

                    col.Item().PaddingTop(30).AlignCenter().Text("This is to certify that").FontSize(12);

                    col.Item().AlignCenter().PaddingTop(10).Text(Field(CertificateMergeFields.InternName))
                        .FontSize(26).Bold().FontColor(PrimaryGreen);

                    col.Item().AlignCenter().PaddingTop(10).Text(
                        $"has successfully completed the internship program at PIA " +
                        $"from {Field(CertificateMergeFields.StartDate)} to {Field(CertificateMergeFields.EndDate)}."
                    ).FontSize(12).AlignCenter();

                    col.Item().PaddingTop(40).Row(row =>
                    {
                        row.RelativeItem().AlignCenter().Text($"Certificate No: {Field(CertificateMergeFields.CertificateNumber)}").FontSize(10);
                        row.RelativeItem().AlignCenter().Text($"Issue Date: {Field(CertificateMergeFields.IssueDate)}").FontSize(10);
                    });
                });
            });
        });

        return document.GeneratePdf();
    }

    private static byte[]? LoadLogo()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Assets", "Branding", "pia-logo.png");
        return File.Exists(path) ? File.ReadAllBytes(path) : null;
    }
}
