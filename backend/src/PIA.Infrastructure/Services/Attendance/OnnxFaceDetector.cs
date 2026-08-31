using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;
using PIA.Application.Options;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// version-RFB-320.onnx from the Ultra-Light-Fast-Generic-Face-Detector-1MB project
/// (https://github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB, MIT licensed). Used only
/// to locate a face bounding box in the static, uploaded approved profile photo, so it can be
/// cropped with FaceCropper the same way every live-capture frame already is before either goes
/// into IFaceVerificationProvider.ExtractEmbeddingAsync - see IFaceDetector's doc comment for why
/// that consistency matters.
///
/// Preprocessing (RGB order, resize to 320x240, mean=127, scale=1/128, CHW) and the box-decode/NMS
/// steps below are copied from the project's own detect_imgs_onnx.py reference script - the model's
/// "boxes" output is already anchor-decoded corner-form coordinates normalized to [0,1], not raw SSD
/// regression deltas, so no separate prior-box decoding step is needed here.
/// </summary>
public sealed class OnnxFaceDetector : IFaceDetector, IDisposable
{
    private const int InputWidth = 320;
    private const int InputHeight = 240;

    private readonly FaceOptions _options;
    private readonly ILogger<OnnxFaceDetector> _logger;
    private readonly Lazy<InferenceSession?> _session;

    public OnnxFaceDetector(IOptions<FaceOptions> options, ILogger<OnnxFaceDetector> logger)
    {
        _options = options.Value;
        _logger = logger;
        _session = new Lazy<InferenceSession?>(TryCreateSession);
    }

    private string ModelPath =>
        Path.Combine(
            Path.IsPathRooted(_options.ModelsPath) ? _options.ModelsPath : Path.Combine(AppContext.BaseDirectory, _options.ModelsPath),
            _options.FaceDetectorModelFileName);

    public bool IsConfigured => File.Exists(ModelPath);

    public Task<BoundingBoxDto?> DetectFaceAsync(byte[] imageBytes, CancellationToken ct)
    {
        var session = _session.Value;
        if (session is null) return Task.FromResult<BoundingBoxDto?>(null);

        using var bitmap = SKBitmap.Decode(imageBytes);
        if (bitmap is null)
        {
            _logger.LogWarning("Face detector: could not decode {ByteCount} bytes as an image.", imageBytes.Length);
            return Task.FromResult<BoundingBoxDto?>(null);
        }

        using var resized = bitmap.Resize(new SKImageInfo(InputWidth, InputHeight), SKFilterQuality.High) ?? bitmap;
        var tensor = new DenseTensor<float>([1, 3, InputHeight, InputWidth]);
        for (var y = 0; y < InputHeight; y++)
        {
            for (var x = 0; x < InputWidth; x++)
            {
                var pixel = resized.GetPixel(x, y);
                // RGB order, mean=127 scale=1/128 - matches detect_imgs_onnx.py exactly.
                tensor[0, 0, y, x] = (pixel.Red - 127) / 128f;
                tensor[0, 1, y, x] = (pixel.Green - 127) / 128f;
                tensor[0, 2, y, x] = (pixel.Blue - 127) / 128f;
            }
        }

        var inputName = session.InputMetadata.Keys.First();
        using var results = session.Run([NamedOnnxValue.CreateFromTensor(inputName, tensor)]);
        var resultList = results.ToList();
        // Outputs are named "scores" [1,N,2] and "boxes" [1,N,4] in the reference model, in that order.
        var scoresTensor = resultList[0].AsTensor<float>();
        var boxesTensor = resultList[1].AsTensor<float>();

        var numPriors = scoresTensor.Dimensions[1];
        var candidates = new List<(float X1, float Y1, float X2, float Y2, float Score)>();
        for (var i = 0; i < numPriors; i++)
        {
            var faceScore = scoresTensor[0, i, 1]; // index 0 = background, index 1 = face
            if (faceScore > _options.FaceDetectorConfidenceThreshold)
            {
                candidates.Add((boxesTensor[0, i, 0], boxesTensor[0, i, 1], boxesTensor[0, i, 2], boxesTensor[0, i, 3], faceScore));
            }
        }

        if (candidates.Count == 0) return Task.FromResult<BoundingBoxDto?>(null);

        var picked = HardNms(candidates, _options.FaceDetectorNmsIouThreshold);
        var best = picked.OrderByDescending(c => c.Score).First();

        var x1 = best.X1 * bitmap.Width;
        var y1 = best.Y1 * bitmap.Height;
        var x2 = best.X2 * bitmap.Width;
        var y2 = best.Y2 * bitmap.Height;

        return Task.FromResult<BoundingBoxDto?>(new BoundingBoxDto(x1, y1, x2 - x1, y2 - y1));
    }

    /// <summary>Greedy NMS matching vision.utils.box_utils_numpy.hard_nms exactly (highest score
    /// first, discard anything overlapping it above the IoU threshold, repeat).</summary>
    private static List<(float X1, float Y1, float X2, float Y2, float Score)> HardNms(
        List<(float X1, float Y1, float X2, float Y2, float Score)> boxes, double iouThreshold)
    {
        var remaining = boxes.OrderBy(b => b.Score).ToList();
        var picked = new List<(float X1, float Y1, float X2, float Y2, float Score)>();

        while (remaining.Count > 0)
        {
            var current = remaining[^1];
            picked.Add(current);
            remaining.RemoveAt(remaining.Count - 1);
            remaining.RemoveAll(b => Iou(current, b) > iouThreshold);
        }

        return picked;
    }

    private static double Iou((float X1, float Y1, float X2, float Y2, float Score) a, (float X1, float Y1, float X2, float Y2, float Score) b)
    {
        var overlapX1 = Math.Max(a.X1, b.X1);
        var overlapY1 = Math.Max(a.Y1, b.Y1);
        var overlapX2 = Math.Min(a.X2, b.X2);
        var overlapY2 = Math.Min(a.Y2, b.Y2);
        var overlapArea = Math.Max(0, overlapX2 - overlapX1) * Math.Max(0, overlapY2 - overlapY1);
        var areaA = Math.Max(0, a.X2 - a.X1) * Math.Max(0, a.Y2 - a.Y1);
        var areaB = Math.Max(0, b.X2 - b.X1) * Math.Max(0, b.Y2 - b.Y1);
        return overlapArea / (areaA + areaB - overlapArea + 1e-5);
    }

    private InferenceSession? TryCreateSession()
    {
        if (!File.Exists(ModelPath))
        {
            _logger.LogWarning("Face detector model not found at {Path} - approved-photo cropping will fall back to using the whole photo.", ModelPath);
            return null;
        }

        try
        {
            return new InferenceSession(ModelPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load face detector ONNX model at {Path}.", ModelPath);
            return null;
        }
    }

    public void Dispose()
    {
        if (_session.IsValueCreated) _session.Value?.Dispose();
    }
}