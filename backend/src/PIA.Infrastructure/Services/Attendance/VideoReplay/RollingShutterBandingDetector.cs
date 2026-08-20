using PIA.Domain.Enums;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance.VideoReplay;

/// <summary>
/// Row-mean luminance -> moving-average detrend -> DFT, looking for a stable periodic peak.
/// Pakistan's 50Hz mains flicker bands real faces at ~2.0-3.3 cycles/frame-height, so the
/// hard-fail band is restricted to 6-30 (a display refresh can't land below that without an
/// implausible sensor readout time); 3.2-6.0 is a soft contributor only.
/// </summary>
public sealed class RollingShutterBandingDetector : IRollingShutterBandingDetector
{
    private const int MaxRows = 512; // bounds the DFT cost regardless of input resolution
    private const double HardFailMinCycles = 6.0;
    private const double HardFailMaxCycles = 30.0;
    private const double SoftMinCycles = 3.2;
    private const double SoftMaxCycles = 6.0;

    public DetectorResult Analyze(DetectorFrame frame)
    {
        var bitmap = frame.Bitmap;
        if (bitmap.Height < 32)
        {
            return new DetectorResult(nameof(RollingShutterBandingDetector), DetectorVerdict.Inconclusive, null, "Frame too small.");
        }

        var rowMeans = ComputeRowMeans(bitmap, MaxRows);
        var detrended = Detrend(rowMeans, Math.Max(3, rowMeans.Length / 8));
        var spectrum = DiscreteFourierMagnitude(detrended);

        // spectrum[k] corresponds to k cycles across the (possibly downsampled) row count.
        var meanMag = spectrum.Length > 1 ? spectrum.Skip(1).Average() : 0;
        if (meanMag < 1e-6)
        {
            return new DetectorResult(nameof(RollingShutterBandingDetector), DetectorVerdict.Inconclusive, null, "Flat frame - no spectral content.");
        }

        var hardBandPeak = PeakInBand(spectrum, HardFailMinCycles, HardFailMaxCycles);
        var softBandPeak = PeakInBand(spectrum, SoftMinCycles, SoftMaxCycles);

        var hardSnr = hardBandPeak / meanMag;
        var softSnr = softBandPeak / meanMag;

        const double hardThreshold = 6.0;
        const double softThreshold = 4.0;

        if (hardSnr >= hardThreshold)
        {
            return new DetectorResult(nameof(RollingShutterBandingDetector), DetectorVerdict.Suspicious,
                hardSnr, $"Periodic banding at display-refresh frequency (SNR {hardSnr:F1}).");
        }

        if (softSnr >= softThreshold)
        {
            return new DetectorResult(nameof(RollingShutterBandingDetector), DetectorVerdict.Suspicious,
                softSnr * 0.5, $"Weak banding near the mains-flicker band (SNR {softSnr:F1}) - soft signal only.");
        }

        return new DetectorResult(nameof(RollingShutterBandingDetector), DetectorVerdict.LiveConsistent, hardSnr, "No display-refresh banding detected.");
    }

    private static double[] ComputeRowMeans(SKBitmap bitmap, int maxRows)
    {
        var height = bitmap.Height;
        var width = bitmap.Width;
        var step = Math.Max(1, height / maxRows);
        var rows = new List<double>();

        for (var y = 0; y < height; y += step)
        {
            double sum = 0;
            for (var x = 0; x < width; x += Math.Max(1, width / 128))
            {
                var p = bitmap.GetPixel(x, y);
                sum += 0.299 * p.Red + 0.587 * p.Green + 0.114 * p.Blue;
            }
            rows.Add(sum);
        }
        return rows.ToArray();
    }

    private static double[] Detrend(double[] signal, int windowSize)
    {
        var result = new double[signal.Length];
        for (var i = 0; i < signal.Length; i++)
        {
            var lo = Math.Max(0, i - windowSize);
            var hi = Math.Min(signal.Length - 1, i + windowSize);
            double sum = 0;
            for (var j = lo; j <= hi; j++) sum += signal[j];
            var localMean = sum / (hi - lo + 1);
            result[i] = signal[i] - localMean;
        }
        return result;
    }

    /// <summary>O(n^2) DFT magnitude - fine at n &lt;= 512 for a one-off per-attempt computation.</summary>
    private static double[] DiscreteFourierMagnitude(double[] signal)
    {
        var n = signal.Length;
        var half = n / 2;
        var magnitude = new double[half];

        for (var k = 0; k < half; k++)
        {
            double re = 0, im = 0;
            for (var t = 0; t < n; t++)
            {
                var angle = -2 * Math.PI * k * t / n;
                re += signal[t] * Math.Cos(angle);
                im += signal[t] * Math.Sin(angle);
            }
            magnitude[k] = Math.Sqrt(re * re + im * im) / n;
        }
        return magnitude;
    }

    private static double PeakInBand(double[] spectrum, double minCycles, double maxCycles)
    {
        // spectrum index k directly represents k cycles over the analyzed row count.
        var lo = Math.Max(1, (int)Math.Floor(minCycles));
        var hi = Math.Min(spectrum.Length - 1, (int)Math.Ceiling(maxCycles));
        if (lo > hi) return 0;

        double peak = 0;
        for (var k = lo; k <= hi; k++) peak = Math.Max(peak, spectrum[k]);
        return peak;
    }
}
