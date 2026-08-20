using PIA.Domain.Enums;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance.VideoReplay;

/// <summary>One decoded challenge frame plus the client-reported telemetry for it - the shared
/// input every video-replay/geometry detector works from. Infrastructure-internal (not part of
/// the Application abstraction surface) since only AttendanceService consumes these.</summary>
public sealed record DetectorFrame(
    int Index,
    SKBitmap Bitmap,
    double TimestampMs,
    string Action,
    double? Yaw,
    double? Pitch,
    double? Roll,
    IReadOnlyDictionary<string, (double X, double Y)>? Landmarks);

public sealed record DetectorResult(string DetectorName, DetectorVerdict Verdict, double? Score, string Detail);

/// <summary>Reuses the head-turn challenge frames for free - no added capture time. Requires a
/// minimum yaw swing between frames to be conclusive; returns Inconclusive otherwise.</summary>
public interface IParallaxResidualDetector
{
    DetectorResult Analyze(IReadOnlyList<DetectorFrame> frames);
}

/// <summary>Tracks a specular highlight against the same homography the parallax detector fits -
/// a screen's glare slides exactly with the homography (Suspicious); a real convex surface's
/// highlight decouples from head rotation (LiveConsistent).</summary>
public interface ISpecularTemporalAnalyzer
{
    DetectorResult Analyze(IReadOnlyList<DetectorFrame> frames);
}

/// <summary>Row-mean luminance -> detrend -> FFT, looking for a stable periodic peak in the
/// 6-30 cycles/frame-height hard-fail band (Pakistan 50Hz mains lands at 2.0-3.3, explicitly
/// excluded from the hard-fail range).</summary>
public interface IRollingShutterBandingDetector
{
    DetectorResult Analyze(DetectorFrame frame);
}

/// <summary>Skin-masked smooth-patch power-spectrum peakiness, on luma and Cr-Cb chroma - notches
/// out the JPEG encoder's own 8x8 comb before scoring.</summary>
public interface IMoireDetector
{
    DetectorResult Analyze(DetectorFrame frame);
}

/// <summary>Block-boundary phase analysis - flags a re-encode grid landing at a non-period-8 /
/// non-zero-phase offset, which is what a re-imaged replay's original encoding leaves behind.
/// Most meaningful on a raw sensor frame; degrades to Inconclusive on an already-normalized JPEG
/// that matches our own pipeline's encoder signature.</summary>
public interface ICompressionForensicsDetector
{
    DetectorResult Analyze(DetectorFrame frame);
}
