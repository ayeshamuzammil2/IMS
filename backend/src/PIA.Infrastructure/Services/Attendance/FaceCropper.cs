using PIA.Application.Contracts.Attendance;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Crop-scale reproduction for MiniFASNet/embedding preprocessing - the crop is `scale` times the
/// larger bounding-box dimension, centered on the box. Getting this scale wrong (the plan calls
/// out 2.7 specifically) silently degrades accuracy with no visible error, which is why it is a
/// single, obviously-named constant (FaceOptions.PadCropScale) rather than buried inline.
/// </summary>
public static class FaceCropper
{
    public static byte[]? CropAligned(SKBitmap source, BoundingBoxDto bbox, double scale)
    {
        var cx = bbox.X + bbox.Width / 2;
        var cy = bbox.Y + bbox.Height / 2;
        var cropSize = Math.Max(bbox.Width, bbox.Height) * scale;
        var half = cropSize / 2;

        var left = (int)Math.Round(cx - half);
        var top = (int)Math.Round(cy - half);
        var size = (int)Math.Round(cropSize);

        left = Math.Clamp(left, 0, Math.Max(0, source.Width - 1));
        top = Math.Clamp(top, 0, Math.Max(0, source.Height - 1));
        size = Math.Min(size, Math.Min(source.Width - left, source.Height - top));
        if (size <= 4) return null;

        using var cropped = new SKBitmap(size, size);
        using (var canvas = new SKCanvas(cropped))
        {
            canvas.DrawBitmap(source, new SKRect(left, top, left + size, top + size), new SKRect(0, 0, size, size));
        }

        using var image = SKImage.FromBitmap(cropped);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 90);
        return data.ToArray();
    }
}
