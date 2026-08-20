using PIA.Domain.Enums;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance.VideoReplay;

/// <summary>
/// Tracks the brightest point in a small ROI around the nose bridge across the same min/max-yaw
/// frame pair the parallax detector uses, then measures its residual motion after removing the
/// homography-predicted component. A screen's glare is baked into its content and slides exactly
/// with the homography (near-zero residual = Suspicious); a real convex nose's highlight decouples
/// from head rotation by roughly half the rotation angle (LiveConsistent).
/// </summary>
public sealed class SpecularTemporalAnalyzer : ISpecularTemporalAnalyzer
{
    private static readonly string[] PlanarLandmarks = ["leftEar", "rightEar", "leftCheek", "rightCheek"];
    private const string NearLandmark = "noseBase";
    private const double RoiFractionOfFaceWidth = 0.18;
    private const double MinHighlightContrast = 20; // brightest-vs-mean in the ROI, 0-255 scale

    public DetectorResult Analyze(IReadOnlyList<DetectorFrame> frames)
    {
        var withPose = frames.Where(f => f.Yaw is not null && f.Landmarks is not null).ToList();
        if (withPose.Count < 2)
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Inconclusive, null, "Not enough posed frames.");
        }

        var minYawFrame = withPose.MinBy(f => f.Yaw!.Value)!;
        var maxYawFrame = withPose.MaxBy(f => f.Yaw!.Value)!;
        var yawSwing = Math.Abs(maxYawFrame.Yaw!.Value - minYawFrame.Yaw!.Value);
        if (yawSwing < 10)
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Inconclusive, null, "Insufficient rotation to test.");
        }

        if (!TryGetPoints(minYawFrame, out var srcPlanar) || !TryGetPoints(maxYawFrame, out var dstPlanar))
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Inconclusive, null, "Required landmarks missing.");
        }

        var h = Homography.Fit4Point(srcPlanar, dstPlanar);
        if (h is null)
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Inconclusive, null, "Degenerate landmark geometry.");
        }

        var faceWidth = Math.Sqrt(Math.Pow(dstPlanar[0].X - dstPlanar[1].X, 2) + Math.Pow(dstPlanar[0].Y - dstPlanar[1].Y, 2));
        if (faceWidth < 1 || !minYawFrame.Landmarks!.TryGetValue(NearLandmark, out var srcNose) || !maxYawFrame.Landmarks!.TryGetValue(NearLandmark, out var dstNose))
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Inconclusive, null, "Face geometry unavailable.");
        }

        var roiRadius = faceWidth * RoiFractionOfFaceWidth;

        var srcHighlight = FindBrightestPoint(minYawFrame.Bitmap, srcNose, roiRadius, out var srcContrast);
        var dstHighlight = FindBrightestPoint(maxYawFrame.Bitmap, dstNose, roiRadius, out var dstContrast);

        if (srcContrast < MinHighlightContrast || dstContrast < MinHighlightContrast)
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Inconclusive, null, "No clear specular highlight under current lighting.");
        }

        var predicted = Homography.Apply(h, srcHighlight.X, srcHighlight.Y);
        var residualPx = Math.Sqrt(Math.Pow(predicted.X - dstHighlight.X, 2) + Math.Pow(predicted.Y - dstHighlight.Y, 2));
        var residualRatio = residualPx / faceWidth;

        if (residualRatio <= 0.01)
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Suspicious,
                residualRatio, $"Specular highlight tracks the homography almost exactly (residual {residualRatio:P2}).");
        }

        if (residualRatio >= 0.02 && residualRatio <= 0.25)
        {
            return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.LiveConsistent,
                residualRatio, $"Specular highlight decoupled from rotation (residual {residualRatio:P2}), consistent with a convex surface.");
        }

        return new DetectorResult(nameof(SpecularTemporalAnalyzer), DetectorVerdict.Inconclusive, residualRatio, "Residual in the ambiguous band.");
    }

    private static bool TryGetPoints(DetectorFrame frame, out List<(double X, double Y)> points)
    {
        points = [];
        foreach (var key in PlanarLandmarks)
        {
            if (frame.Landmarks is null || !frame.Landmarks.TryGetValue(key, out var p)) return false;
            points.Add(p);
        }
        return true;
    }

    private static (double X, double Y) FindBrightestPoint(SKBitmap bitmap, (double X, double Y) center, double radius, out double contrast)
    {
        var minX = Math.Max(0, (int)(center.X - radius));
        var maxX = Math.Min(bitmap.Width - 1, (int)(center.X + radius));
        var minY = Math.Max(0, (int)(center.Y - radius));
        var maxY = Math.Min(bitmap.Height - 1, (int)(center.Y + radius));

        double best = -1;
        var bestX = center.X;
        var bestY = center.Y;
        double sum = 0;
        var count = 0;

        for (var y = minY; y <= maxY; y++)
        {
            for (var x = minX; x <= maxX; x++)
            {
                var pixel = bitmap.GetPixel(x, y);
                var luma = 0.299 * pixel.Red + 0.587 * pixel.Green + 0.114 * pixel.Blue;
                sum += luma;
                count++;
                if (luma > best)
                {
                    best = luma;
                    bestX = x;
                    bestY = y;
                }
            }
        }

        contrast = count > 0 ? best - sum / count : 0;
        return (bestX, bestY);
    }
}
