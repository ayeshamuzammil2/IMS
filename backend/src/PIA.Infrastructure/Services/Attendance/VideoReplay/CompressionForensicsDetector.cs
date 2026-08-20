using PIA.Domain.Enums;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance.VideoReplay;

/// <summary>
/// Looks for an 8-pixel-period JPEG block grid at a phase offset other than 0 - our own capture
/// pipeline always re-encodes at period-8/phase-0, so a DIFFERENT phase means the frame carries a
/// foreign encoder's block grid, i.e. it was JPEG-compressed once already before reaching us (the
/// signature a screen-replayed, pre-encoded video leaves behind). Most meaningful on a raw sensor
/// frame; on an already-normalized JPEG matching our own signature this correctly reports
/// Inconclusive rather than fabricating a verdict it can't support.
/// </summary>
public sealed class CompressionForensicsDetector : ICompressionForensicsDetector
{
    private const int Period = 8;
    private const double ConfidenceThreshold = 3.0;

    public DetectorResult Analyze(DetectorFrame frame)
    {
        var bitmap = frame.Bitmap;
        if (bitmap.Width < Period * 4 || bitmap.Height < Period * 4)
        {
            return new DetectorResult(nameof(CompressionForensicsDetector), DetectorVerdict.Inconclusive, null, "Frame too small to analyze.");
        }

        var luma = ToLuma(bitmap);
        var (hPhase, hConfidence) = DetectBoundaryPhase(luma, bitmap.Width, bitmap.Height, horizontal: true);
        var (vPhase, vConfidence) = DetectBoundaryPhase(luma, bitmap.Width, bitmap.Height, horizontal: false);

        if (hConfidence < ConfidenceThreshold && vConfidence < ConfidenceThreshold)
        {
            return new DetectorResult(nameof(CompressionForensicsDetector), DetectorVerdict.LiveConsistent,
                Math.Max(hConfidence, vConfidence), "No periodic block grid detected.");
        }

        if (hPhase == 0 && vPhase == 0)
        {
            return new DetectorResult(nameof(CompressionForensicsDetector), DetectorVerdict.Inconclusive,
                Math.Max(hConfidence, vConfidence), "Block grid matches our own capture pipeline's alignment - not discriminative here.");
        }

        if (hConfidence >= ConfidenceThreshold && vConfidence >= ConfidenceThreshold)
        {
            return new DetectorResult(nameof(CompressionForensicsDetector), DetectorVerdict.Suspicious,
                Math.Min(hConfidence, vConfidence),
                $"Foreign JPEG block grid detected (phase {hPhase}h/{vPhase}v) - frame was compressed before reaching this pipeline.");
        }

        return new DetectorResult(nameof(CompressionForensicsDetector), DetectorVerdict.Inconclusive,
            Math.Max(hConfidence, vConfidence), "Ambiguous single-axis grid signal.");
    }

    private static double[,] ToLuma(SKBitmap bitmap)
    {
        var w = bitmap.Width;
        var h = bitmap.Height;
        var luma = new double[h, w];
        for (var y = 0; y < h; y++)
        {
            for (var x = 0; x < w; x++)
            {
                var p = bitmap.GetPixel(x, y);
                luma[y, x] = 0.299 * p.Red + 0.587 * p.Green + 0.114 * p.Blue;
            }
        }
        return luma;
    }

    private static (int Phase, double Confidence) DetectBoundaryPhase(double[,] luma, int width, int height, bool horizontal)
    {
        var length = horizontal ? width : height;
        var otherLength = horizontal ? height : width;
        var energy = new double[Period];

        for (var offset = 0; offset < length - 1; offset++)
        {
            double diffSum = 0;
            for (var j = 0; j < otherLength; j++)
            {
                var a = horizontal ? luma[j, offset] : luma[offset, j];
                var b = horizontal ? luma[j, offset + 1] : luma[offset + 1, j];
                diffSum += Math.Abs(a - b);
            }
            energy[offset % Period] += diffSum;
        }

        var mean = energy.Average();
        if (mean < 1e-6) return (0, 0);

        var bestPhase = 0;
        var bestEnergy = energy[0];
        for (var p = 1; p < Period; p++)
        {
            if (energy[p] > bestEnergy)
            {
                bestEnergy = energy[p];
                bestPhase = p;
            }
        }

        return (bestPhase, bestEnergy / mean);
    }
}
