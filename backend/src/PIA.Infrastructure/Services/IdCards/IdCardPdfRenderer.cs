using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SkiaSharp;

namespace PIA.Infrastructure.Services.IdCards;

public interface IIdCardPdfRenderer
{
    byte[] Render(
        string fullName, string departmentName, string cardNumber, DateOnly validFrom, DateOnly validUntil,
        byte[] photoBytes, string designation, string? email, string? emergencyContactPhone);
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
    private static readonly SKColor LightGreenSk = new(0xA5, 0xD6, 0xA7);

    private static readonly byte[]? LogoBytes = LoadLogo();

    public byte[] Render(
        string fullName, string departmentName, string cardNumber, DateOnly validFrom, DateOnly validUntil,
        byte[] photoBytes, string designation, string? email, string? emergencyContactPhone)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var roundedPhoto = RoundedSquareCrop(photoBytes, size: 200, cornerRadius: 28, borderColor: LightGreenSk, borderWidth: 4);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                // The page IS the card (70x100mm) - there is no surrounding page beyond the card
                // frame itself, so PageColor here is already scoped to the card, not a full-screen fill.
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

                    col.Item().PaddingTop(6).AlignCenter().Height(25).Width(25).Image(roundedPhoto).FitArea();

                    col.Item().PaddingTop(6).AlignCenter().Text(fullName).FontSize(9).Bold();
                    col.Item().AlignCenter().Text(designation).FontSize(7).Italic().FontColor(MediumGreen);
                    if (!string.IsNullOrWhiteSpace(email))
                    {
                        col.Item().AlignCenter().Text(email).FontSize(6);
                    }
                    col.Item().AlignCenter().Text(departmentName).FontSize(7);
                    col.Item().AlignCenter().Text($"ID: {cardNumber}").FontSize(7);
                    if (!string.IsNullOrWhiteSpace(emergencyContactPhone))
                    {
                        col.Item().AlignCenter().Text($"Emergency: {emergencyContactPhone}").FontSize(6);
                    }
                    col.Item().AlignCenter().Text($"Valid: {validFrom:MMM yyyy} - {validUntil:MMM yyyy}").FontSize(6);
                });
            });
        });

        return document.GeneratePdf();
    }

    /// <summary>QuestPDF 2024.10.2 has no public rounded-image-clip API (verified against the
    /// installed package - only rectangular ClipOverflowArea/ClipRectangle exist internally), so the
    /// rounding is done here with SkiaSharp before the bytes ever reach QuestPDF: center-crop to a
    /// square, clip to a rounded-rect path, draw the source bitmap, then stroke a border on top.</summary>
    private static byte[] RoundedSquareCrop(byte[] sourceBytes, int size, float cornerRadius, SKColor borderColor, float borderWidth)
    {
        using var source = SKBitmap.Decode(sourceBytes);
        if (source is null)
        {
            return sourceBytes;
        }

        var cropSize = Math.Min(source.Width, source.Height);
        var srcRect = new SKRect(
            (source.Width - cropSize) / 2f, (source.Height - cropSize) / 2f,
            (source.Width - cropSize) / 2f + cropSize, (source.Height - cropSize) / 2f + cropSize);

        using var surface = SKSurface.Create(new SKImageInfo(size, size, SKColorType.Rgba8888, SKAlphaType.Premul));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.Transparent);

        var bounds = new SKRect(0, 0, size, size);
        using (var clipPath = new SKPath())
        {
            clipPath.AddRoundRect(bounds, cornerRadius, cornerRadius);
            canvas.Save();
            canvas.ClipPath(clipPath, antialias: true);
            using var imagePaint = new SKPaint { FilterQuality = SKFilterQuality.High, IsAntialias = true };
            canvas.DrawBitmap(source, srcRect, bounds, imagePaint);
            canvas.Restore();
        }

        using var borderPaint = new SKPaint
        {
            Style = SKPaintStyle.Stroke, Color = borderColor, StrokeWidth = borderWidth, IsAntialias = true,
        };
        canvas.DrawRoundRect(new SKRoundRect(bounds, cornerRadius, cornerRadius), borderPaint);

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private static byte[]? LoadLogo()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Assets", "Branding", "pia-logo.png");
        return File.Exists(path) ? File.ReadAllBytes(path) : null;
    }
}
