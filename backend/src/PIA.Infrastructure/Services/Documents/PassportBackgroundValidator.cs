using SkiaSharp;

namespace PIA.Infrastructure.Services.Documents;

/// <summary>
/// Server-side authority for profile-photo background validation - ports the border-sampling idea
/// from v1's client-side backgroundCheck.js into a real, non-bypassable server check. Samples
/// pixels around the image's outer margin, converts the average to HSV, and accepts only
/// low-saturation light backgrounds (white/light-gray studio backdrop) or blue-hued backgrounds
/// (the other common passport-photo backdrop) - anything else (red, green, patterned, etc.) is
/// rejected with a human-readable reason.
/// </summary>
public static class PassportBackgroundValidator
{
    public static (bool IsValid, string Reason) Validate(SKBitmap bitmap)
    {
        var borderPixels = SampleBorderPixels(bitmap);
        if (borderPixels.Count == 0)
        {
            return (false, "Could not sample the photo's background.");
        }

        double rSum = 0, gSum = 0, bSum = 0;
        foreach (var p in borderPixels)
        {
            rSum += p.Red;
            gSum += p.Green;
            bSum += p.Blue;
        }
        var n = borderPixels.Count;
        var (h, s, v) = RgbToHsv(rSum / n, gSum / n, bSum / n);

        var isWhiteish = s < 0.15 && v > 0.75;
        var isBlueish = h is >= 190 and <= 250 && v > 0.35;

        if (isWhiteish || isBlueish)
        {
            return (true, "OK");
        }

        return (false,
            $"The background does not look like a plain white or blue passport-style backdrop " +
            $"(detected hue {h:F0} deg, saturation {s:P0}, brightness {v:P0}). Please retake the photo against a plain white or blue background.");
    }

    private static List<SKColor> SampleBorderPixels(SKBitmap bitmap)
    {
        var pixels = new List<SKColor>();
        if (bitmap.Width < 4 || bitmap.Height < 4) return pixels;

        var marginX = Math.Max(1, bitmap.Width / 20);
        var marginY = Math.Max(1, bitmap.Height / 20);
        var stepX = Math.Max(1, bitmap.Width / 40);
        var stepY = Math.Max(1, bitmap.Height / 40);

        for (var x = 0; x < bitmap.Width; x += stepX)
        {
            pixels.Add(bitmap.GetPixel(x, 0));
            pixels.Add(bitmap.GetPixel(x, marginY));
            pixels.Add(bitmap.GetPixel(x, bitmap.Height - 1));
            pixels.Add(bitmap.GetPixel(x, bitmap.Height - 1 - marginY));
        }
        for (var y = 0; y < bitmap.Height; y += stepY)
        {
            pixels.Add(bitmap.GetPixel(0, y));
            pixels.Add(bitmap.GetPixel(marginX, y));
            pixels.Add(bitmap.GetPixel(bitmap.Width - 1, y));
            pixels.Add(bitmap.GetPixel(bitmap.Width - 1 - marginX, y));
        }
        return pixels;
    }

    private static (double H, double S, double V) RgbToHsv(double r, double g, double b)
    {
        r /= 255; g /= 255; b /= 255;
        var max = Math.Max(r, Math.Max(g, b));
        var min = Math.Min(r, Math.Min(g, b));
        var delta = max - min;

        double h = 0;
        if (delta > 1e-6)
        {
            if (max == r) h = 60 * (((g - b) / delta) % 6);
            else if (max == g) h = 60 * (((b - r) / delta) + 2);
            else h = 60 * (((r - g) / delta) + 4);
        }
        if (h < 0) h += 360;

        var s = max <= 0 ? 0 : delta / max;
        var v = max;
        return (h, s, v);
    }
}
