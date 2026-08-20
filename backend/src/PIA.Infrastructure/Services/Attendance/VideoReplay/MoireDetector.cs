using PIA.Domain.Enums;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance.VideoReplay;

/// <summary>
/// Crops smooth-skin patches (forehead, cheeks, chin), requires a high skin-mask fraction so
/// textured clothing/hair/background is never analysed, then scores 2D power-spectrum peakiness
/// on luma and Cr-Cb chroma - RGB-subpixel displays alias differently per channel, so chroma
/// moire is often the stronger tell. Notches out the JPEG encoder's own 8x8 comb before scoring.
/// </summary>
public sealed class MoireDetector : IMoireDetector
{
    private const int PatchSize = 32;
    private const double MinSkinFraction = 0.85;
    private const double SuspiciousPeakiness = 6.0;

    public DetectorResult Analyze(DetectorFrame frame)
    {
        var patches = ExtractPatchCenters(frame);
        if (patches.Count == 0)
        {
            return new DetectorResult(nameof(MoireDetector), DetectorVerdict.Inconclusive, null, "No landmark-anchored patches available.");
        }

        var peakinessScores = new List<double>();
        var analyzed = 0;

        foreach (var (cx, cy) in patches)
        {
            var patch = CropPatch(frame.Bitmap, cx, cy, PatchSize);
            if (patch is null) continue;

            var (skinFraction, luma, chroma) = ExtractChannels(patch);
            if (skinFraction < MinSkinFraction) continue;

            analyzed++;
            peakinessScores.Add(Peakiness(luma));
            peakinessScores.Add(Peakiness(chroma));
        }

        if (analyzed == 0)
        {
            return new DetectorResult(nameof(MoireDetector), DetectorVerdict.Inconclusive, null, "No patch met the skin-fraction threshold.");
        }

        var maxPeakiness = peakinessScores.Max();
        if (maxPeakiness >= SuspiciousPeakiness)
        {
            return new DetectorResult(nameof(MoireDetector), DetectorVerdict.Suspicious, maxPeakiness,
                $"Screen-like moire pattern detected (peakiness {maxPeakiness:F1}) across {analyzed} skin patch(es).");
        }

        return new DetectorResult(nameof(MoireDetector), DetectorVerdict.LiveConsistent, maxPeakiness, $"No moire pattern across {analyzed} skin patch(es).");
    }

    private static List<(double X, double Y)> ExtractPatchCenters(DetectorFrame frame)
    {
        var points = new List<(double X, double Y)>();
        if (frame.Landmarks is null) return points;

        if (frame.Landmarks.TryGetValue("leftEye", out var le) && frame.Landmarks.TryGetValue("rightEye", out var re))
        {
            var foreheadY = Math.Min(le.Y, re.Y) - Math.Abs(re.X - le.X) * 0.5;
            points.Add(((le.X + re.X) / 2, foreheadY));
        }
        if (frame.Landmarks.TryGetValue("leftCheek", out var lc)) points.Add(lc);
        if (frame.Landmarks.TryGetValue("rightCheek", out var rc)) points.Add(rc);
        if (frame.Landmarks.TryGetValue("mouthBottom", out var mb)) points.Add((mb.X, mb.Y + Math.Abs(mb.Y) * 0.05 + 20));

        return points;
    }

    private static SKBitmap? CropPatch(SKBitmap source, double cx, double cy, int size)
    {
        var half = size / 2;
        var x = (int)cx - half;
        var y = (int)cy - half;
        if (x < 0 || y < 0 || x + size >= source.Width || y + size >= source.Height) return null;

        var info = new SKImageInfo(size, size);
        var patch = new SKBitmap(info);
        using var canvas = new SKCanvas(patch);
        var srcRect = new SKRect(x, y, x + size, y + size);
        var dstRect = new SKRect(0, 0, size, size);
        canvas.DrawBitmap(source, srcRect, dstRect);
        return patch;
    }

    private static (double SkinFraction, double[,] Luma, double[,] Chroma) ExtractChannels(SKBitmap patch)
    {
        var luma = new double[PatchSize, PatchSize];
        var chroma = new double[PatchSize, PatchSize];
        var skinCount = 0;

        for (var y = 0; y < PatchSize; y++)
        {
            for (var x = 0; x < PatchSize; x++)
            {
                var p = patch.GetPixel(x, y);
                double r = p.Red, g = p.Green, b = p.Blue;

                var y2 = 0.299 * r + 0.587 * g + 0.114 * b;
                var cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                var cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

                luma[y, x] = y2;
                chroma[y, x] = cr - cb;

                if (cb is >= 77 and <= 127 && cr is >= 133 and <= 173) skinCount++;
            }
        }

        return ((double)skinCount / (PatchSize * PatchSize), luma, chroma);
    }

    /// <summary>2D power-spectrum peakiness in a mid-frequency annulus, excluding DC and the
    /// JPEG 8x8 block-grid bins (multiples of PatchSize/8 in both axes).</summary>
    private static double Peakiness(double[,] channel)
    {
        var power = Fft2DPower(channel);
        var n = PatchSize;
        var jpegStride = n / 8;

        double sum = 0, max = 0;
        var count = 0;

        for (var ky = 0; ky < n; ky++)
        {
            for (var kx = 0; kx < n; kx++)
            {
                if (kx == 0 && ky == 0) continue; // DC
                if (kx % jpegStride == 0 && ky % jpegStride == 0) continue; // JPEG comb

                var radius = Math.Sqrt(Wrap(kx, n) * Wrap(kx, n) + Wrap(ky, n) * Wrap(ky, n));
                if (radius < 2 || radius > n / 2.5) continue; // mid-frequency annulus only

                var val = power[ky, kx];
                sum += val;
                count++;
                if (val > max) max = val;
            }
        }

        var mean = count > 0 ? sum / count : 0;
        return mean > 1e-9 ? max / mean : 0;
    }

    private static int Wrap(int k, int n) => k <= n / 2 ? k : k - n;

    private static double[,] Fft2DPower(double[,] input)
    {
        var n = input.GetLength(0);
        var re = new double[n, n];
        var im = new double[n, n];

        // Row-wise DFT then column-wise DFT (separable 2D DFT), O(n^3) - fine at n=32.
        for (var y = 0; y < n; y++)
        {
            for (var kx = 0; kx < n; kx++)
            {
                double sr = 0, si = 0;
                for (var x = 0; x < n; x++)
                {
                    var angle = -2 * Math.PI * kx * x / n;
                    sr += input[y, x] * Math.Cos(angle);
                    si += input[y, x] * Math.Sin(angle);
                }
                re[y, kx] = sr;
                im[y, kx] = si;
            }
        }

        var power = new double[n, n];
        for (var kx = 0; kx < n; kx++)
        {
            for (var ky = 0; ky < n; ky++)
            {
                double sr = 0, si = 0;
                for (var y = 0; y < n; y++)
                {
                    var angle = -2 * Math.PI * ky * y / n;
                    var cos = Math.Cos(angle);
                    var sin = Math.Sin(angle);
                    sr += re[y, kx] * cos - im[y, kx] * sin;
                    si += re[y, kx] * sin + im[y, kx] * cos;
                }
                power[ky, kx] = (sr * sr + si * si) / (n * n * n * n);
            }
        }

        return power;
    }
}
