using System.Linq;
using PIA.Application.Contracts.Attendance;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Crop-scale reproduction for MiniFASNet/embedding preprocessing - the crop is `scale` times the
/// bounding-box WIDTH, anchored from the box's top edge, centered horizontally. Getting this scale
/// wrong (the plan calls out 2.7 specifically) silently degrades accuracy with no visible error,
/// which is why it is a single, obviously-named constant (FaceOptions.PadCropScale) rather than
/// buried inline.
///
/// Width (not height, and not max(width,height)) is deliberately used as the size basis: real
/// enrollment data showed the server-side face detector's box height gets inflated well past the
/// actual face for hijab/scarf-covered heads - one real approved photo detected as
/// width=335,height=451, a ~1.35x elongation from the scarf drape being picked up as part of the
/// "face" region. Using height (or max) as the crop basis in that case zooms out far more than
/// intended and shifts the vertical center down into the neck/scarf, silently wrecking embedding
/// similarity even for a genuine match. ML Kit's live-capture boxes are already close to square, so
/// this change is a no-op for them - it only fixes the case where the two dimensions disagree.
/// </summary>
public static class FaceCropper
{
    public static byte[]? CropAligned(SKBitmap source, BoundingBoxDto bbox, double scale)
    {
        var cx = bbox.X + bbox.Width / 2;
        // Anchored from the box's top edge using width for the vertical extent too, rather than
        // bbox.Height/2 - the top edge (forehead) is reliably detected, it's the bottom edge that
        // runs long when a scarf or hijab is picked up as part of the face region.
        var cy = bbox.Y + bbox.Width / 2;
        var desiredHalf = bbox.Width * scale / 2;

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