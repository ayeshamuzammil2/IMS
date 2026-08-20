using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PIA.Infrastructure.Services.IdCards;

public interface IIdCardPdfRenderer
{
    byte[] Render(string fullName, string departmentName, string cardNumber, DateOnly validFrom, DateOnly validUntil, byte[] photoBytes);
}

/// <summary>
/// Ported from v1's PdfGeneratorService.GenerateIdCard, fixing the one thing that made v1's card
/// unusable as an actual ID card: v1 rendered a blank white box where the photo belongs
/// (`// profile image placeholder`, no image call). This embeds the intern's real approved
/// profile photo bytes - the caller is responsible for having already checked one exists
/// (IdCardService throws IDCARD_NO_PHOTO before ever calling this).
/// </summary>
public sealed class IdCardPdfRenderer : IIdCardPdfRenderer
{
    private const string PrimaryGreen = "#1B5E20";
    private const string MediumGreen = "#66BB6A";
    private const string LightGreen = "#A5D6A7";
    private const string PaleGreen = "#E8F5E9";

    private static readonly byte[]? LogoBytes = LoadLogo();

    public byte[] Render(string fullName, string departmentName, string cardNumber, DateOnly validFrom, DateOnly validUntil, byte[] photoBytes)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(70, 100, Unit.Millimetre);
                page.Margin(4);
                page.PageColor(PaleGreen);

                page.Content().Column(col =>
                {
                    if (LogoBytes is not null)
                    {
                        col.Item().AlignCenter().Height(16).Image(LogoBytes).FitHeight();
                        col.Item().Height(3);
                    }

                    col.Item().AlignCenter().Text("PIA").FontSize(12).Bold().FontColor(PrimaryGreen);
                    col.Item().AlignCenter().Text("Internee ID Card").FontSize(7).FontColor(MediumGreen);

                    col.Item().PaddingTop(6).AlignCenter().Height(25).Width(25)
                        .Border(1).BorderColor(LightGreen).Image(photoBytes).FitArea();

                    col.Item().PaddingTop(6).AlignCenter().Text(fullName).FontSize(9).Bold();
                    col.Item().AlignCenter().Text(departmentName).FontSize(7);
                    col.Item().AlignCenter().Text($"ID: {cardNumber}").FontSize(7);
                    col.Item().AlignCenter().Text($"Valid: {validFrom:MMM yyyy} - {validUntil:MMM yyyy}").FontSize(6);
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
