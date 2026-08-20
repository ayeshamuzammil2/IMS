using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Simple 8x8 average-hash (aHash) - not a security-grade perceptual hash, but enough to catch a
/// submitted attendance photo being reused verbatim or through a mild recompression/resize, which
/// is exactly what AttendanceMedia.Phash exists for (stage 7 of the verification pipeline).
/// </summary>
public static class PerceptualHash
{
    public static ulong Compute(SKBitmap bitmap)
    {
        using var small = bitmap.Resize(new SKImageInfo(8, 8, SKColorType.Gray8), SKFilterQuality.Medium)
            ?? throw new InvalidOperationException("Image could not be resized for perceptual hashing.");

        var pixels = new byte[64];
        for (var y = 0; y < 8; y++)
        {
            for (var x = 0; x < 8; x++)
            {
                pixels[y * 8 + x] = small.GetPixel(x, y).Red; // Gray8: R = G = B
            }
        }

        var average = pixels.Average(p => p);
        ulong hash = 0;
        for (var i = 0; i < 64; i++)
        {
            if (pixels[i] >= average)
            {
                hash |= 1UL << i;
            }
        }
        return hash;
    }

    public static int HammingDistance(ulong a, ulong b) => System.Numerics.BitOperations.PopCount(a ^ b);
}
