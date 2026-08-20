using PIA.Application.Options;
using PIA.Domain.Enums;
using Microsoft.Extensions.Options;

namespace PIA.Infrastructure.Services.Attendance.VideoReplay;

/// <summary>
/// Fits a homography on "far" (near-planar) landmarks between the lowest-yaw and highest-yaw
/// challenge frames, then checks how far the "near" landmark (nose base, which sits closer to the
/// camera on a real 3D face) drifts from that homography's prediction. A real face parallaxes;
/// a flat screen replay fits one homography almost perfectly regardless of the reported rotation.
/// </summary>
public sealed class ParallaxResidualDetector(IOptions<FaceOptions> options) : IParallaxResidualDetector
{
    private static readonly string[] PlanarLandmarks = ["leftEar", "rightEar", "leftCheek", "rightCheek"];
    private const string NearLandmark = "noseBase";

    public DetectorResult Analyze(IReadOnlyList<DetectorFrame> frames)
    {
        var withPose = frames.Where(f => f.Yaw is not null && f.Landmarks is not null).ToList();
        if (withPose.Count < 2)
        {
            return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.Inconclusive, null, "Not enough posed frames.");
        }

        var minYawFrame = withPose.MinBy(f => f.Yaw!.Value)!;
        var maxYawFrame = withPose.MaxBy(f => f.Yaw!.Value)!;
        var yawSwing = Math.Abs(maxYawFrame.Yaw!.Value - minYawFrame.Yaw!.Value);

        var opts = options.Value;
        if (yawSwing < opts.ParallaxMinYawSwingDegrees)
        {
            return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.Inconclusive,
                null, $"Yaw swing {yawSwing:F1} deg below the {opts.ParallaxMinYawSwingDegrees} deg minimum.");
        }

        if (!TryGetPoints(minYawFrame, PlanarLandmarks, out var srcPoints) ||
            !TryGetPoints(maxYawFrame, PlanarLandmarks, out var dstPoints) ||
            !minYawFrame.Landmarks!.TryGetValue(NearLandmark, out var srcNose) ||
            !maxYawFrame.Landmarks!.TryGetValue(NearLandmark, out var dstNose))
        {
            return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.Inconclusive, null, "Required landmarks missing.");
        }

        var h = Homography.Fit4Point(srcPoints, dstPoints);
        if (h is null)
        {
            return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.Inconclusive, null, "Degenerate landmark geometry.");
        }

        var predicted = Homography.Apply(h, srcNose.X, srcNose.Y);
        var residualPx = Math.Sqrt(Math.Pow(predicted.X - dstNose.X, 2) + Math.Pow(predicted.Y - dstNose.Y, 2));

        var faceWidth = Distance(dstPoints[0], dstPoints[1]); // leftEar to rightEar in the max-yaw frame
        if (faceWidth < 1)
        {
            return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.Inconclusive, null, "Face width could not be estimated.");
        }

        var residualRatio = residualPx / faceWidth;

        if (residualRatio >= opts.ParallaxLiveResidualRatio)
        {
            return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.LiveConsistent,
                residualRatio, $"Nose parallax residual {residualRatio:P1} of face width over {yawSwing:F1} deg swing.");
        }

        if (residualRatio <= opts.ParallaxPlaneResidualRatio)
        {
            return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.Suspicious,
                residualRatio, $"Face tracks a single plane (residual {residualRatio:P2}) despite a {yawSwing:F1} deg reported turn.");
        }

        return new DetectorResult(nameof(ParallaxResidualDetector), DetectorVerdict.Inconclusive,
            residualRatio, $"Residual {residualRatio:P2} in the ambiguous band.");
    }

    private static bool TryGetPoints(DetectorFrame frame, IReadOnlyList<string> keys, out List<(double X, double Y)> points)
    {
        points = [];
        foreach (var key in keys)
        {
            if (frame.Landmarks is null || !frame.Landmarks.TryGetValue(key, out var p))
            {
                return false;
            }
            points.Add(p);
        }
        return true;
    }

    private static double Distance((double X, double Y) a, (double X, double Y) b) =>
        Math.Sqrt(Math.Pow(a.X - b.X, 2) + Math.Pow(a.Y - b.Y, 2));
}
