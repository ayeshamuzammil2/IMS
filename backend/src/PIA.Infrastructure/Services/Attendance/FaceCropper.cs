using System.Linq;
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
        var desiredHalf = Math.Max(bbox.Width, bbox.Height) * scale / 2;

        // Clamping left/top independently (the old approach) can silently shift the crop off the
        // face center whenever the desired half-size doesn't fit within the image on one side -
        // extremely common for selfies where the face already fills most of the frame. Instead,
        // shrink the half-size symmetrically so the crop is guaranteed to stay centered on the
        // face (possibly with less margin than the requested scale), which is far closer to what
        // the model was trained on than a full-size but decentered crop.
        var maxHalf = new[] { cx, cy, source.Width - cx, source.Height - cy }.Min();
        var half = Math.Min(desiredHalf, maxHalf);

        var size = (int)Math.Round(half * 2);
        var left = (int)Math.Round(cx - half);
        var top = (int)Math.Round(cy - half);
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