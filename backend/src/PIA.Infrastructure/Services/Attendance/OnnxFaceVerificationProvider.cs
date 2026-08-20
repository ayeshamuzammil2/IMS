using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Direct Microsoft.ML.OnnxRuntime usage (no third-party face-processing wrapper) so the exact
/// preprocessing contract - input size, channel order, normalization - is fully documented and
/// owned here rather than reverse-engineered from an unfamiliar library. Model files are NOT
/// bundled (ArcFace-family weights are commonly non-commercial-only; see Assets/Models/README.md)
/// - if they are missing, IsConfigured is false and every call returns null, exactly like
/// SmtpEmailSender's "not configured" fallback. AWS Rekognition (Phase 9) is the production
/// answer if a commercially-clear embedding model can't be sourced.
/// </summary>
public sealed class OnnxFaceVerificationProvider : IFaceVerificationProvider, IDisposable
{
    private readonly FaceOptions _options;
    private readonly ILogger<OnnxFaceVerificationProvider> _logger;
    private readonly Lazy<InferenceSession?> _embeddingSession;
    private readonly Lazy<InferenceSession?> _padSession;

    public OnnxFaceVerificationProvider(IOptions<FaceOptions> options, ILogger<OnnxFaceVerificationProvider> logger)
    {
        _options = options.Value;
        _logger = logger;
        _embeddingSession = new Lazy<InferenceSession?>(() => TryCreateSession(EmbeddingModelPath));
        _padSession = new Lazy<InferenceSession?>(() => TryCreateSession(PadModelPath));
    }

    private string EmbeddingModelPath => Path.Combine(ResolveModelsRoot(), _options.EmbeddingModelFileName);
    private string PadModelPath => Path.Combine(ResolveModelsRoot(), _options.PadModelFileName);

    public bool IsConfigured => File.Exists(EmbeddingModelPath) && File.Exists(PadModelPath);

    public Task<FaceEmbeddingResult?> ExtractEmbeddingAsync(byte[] alignedFaceJpegBytes, CancellationToken ct)
    {
        var session = _embeddingSession.Value;
        if (session is null) return Task.FromResult<FaceEmbeddingResult?>(null);

        var size = _options.EmbeddingInputSize;
        var tensor = ToChwTensor(alignedFaceJpegBytes, size, mean: 127.5f, scale: 1 / 128f);
        var inputName = session.InputMetadata.Keys.First();

        using var results = session.Run([NamedOnnxValue.CreateFromTensor(inputName, tensor)]);
        var output = results.First().AsEnumerable<float>().ToArray();

        var norm = MathF.Sqrt(output.Sum(v => v * v));
        if (norm > 1e-6f)
        {
            for (var i = 0; i < output.Length; i++) output[i] /= norm;
        }

        return Task.FromResult<FaceEmbeddingResult?>(new FaceEmbeddingResult(output, "arcface", "r100-v1"));
    }

    public Task<PadResult?> EvaluateLivenessAsync(byte[] alignedFaceJpegBytes, CancellationToken ct)
    {
        var session = _padSession.Value;
        if (session is null) return Task.FromResult<PadResult?>(null);

        var size = _options.PadInputSize;
        var tensor = ToChwTensor(alignedFaceJpegBytes, size, mean: 0f, scale: 1 / 255f);
        var inputName = session.InputMetadata.Keys.First();

        using var results = session.Run([NamedOnnxValue.CreateFromTensor(inputName, tensor)]);
        var logits = results.First().AsEnumerable<float>().ToArray();
        var softmax = Softmax(logits);

        // MiniFASNet reference ordering: [live, print-attack, replay-attack].
        var live = softmax.Length > 0 ? softmax[0] : 0;
        var print = softmax.Length > 1 ? softmax[1] : 0;
        var replay = softmax.Length > 2 ? softmax[2] : 0;

        return Task.FromResult<PadResult?>(new PadResult(live, print, replay));
    }

    private InferenceSession? TryCreateSession(string path)
    {
        if (!File.Exists(path))
        {
            _logger.LogWarning("Face model not found at {Path} - face verification runs in NotConfigured mode.", path);
            return null;
        }

        try
        {
            return new InferenceSession(path);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load ONNX model at {Path}.", path);
            return null;
        }
    }

    private string ResolveModelsRoot() =>
        Path.IsPathRooted(_options.ModelsPath) ? _options.ModelsPath : Path.Combine(AppContext.BaseDirectory, _options.ModelsPath);

    private static DenseTensor<float> ToChwTensor(byte[] jpegBytes, int size, float mean, float scale)
    {
        using var bitmap = SKBitmap.Decode(jpegBytes) ?? throw new InvalidOperationException("Face crop could not be decoded.");
        using var resized = bitmap.Resize(new SKImageInfo(size, size), SKFilterQuality.High) ?? bitmap;

        var tensor = new DenseTensor<float>([1, 3, size, size]);
        for (var y = 0; y < size; y++)
        {
            for (var x = 0; x < size; x++)
            {
                var pixel = resized.GetPixel(x, y);
                tensor[0, 0, y, x] = (pixel.Red - mean) * scale;
                tensor[0, 1, y, x] = (pixel.Green - mean) * scale;
                tensor[0, 2, y, x] = (pixel.Blue - mean) * scale;
            }
        }
        return tensor;
    }

    private static float[] Softmax(float[] logits)
    {
        if (logits.Length == 0) return logits;
        var max = logits.Max();
        var exp = logits.Select(v => MathF.Exp(v - max)).ToArray();
        var sum = exp.Sum();
        return sum > 0 ? exp.Select(v => v / sum).ToArray() : exp;
    }

    public void Dispose()
    {
        if (_embeddingSession.IsValueCreated) _embeddingSession.Value?.Dispose();
        if (_padSession.IsValueCreated) _padSession.Value?.Dispose();
    }
}
