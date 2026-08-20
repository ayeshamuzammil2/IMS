namespace PIA.Application.Abstractions;

public sealed record FaceEmbeddingResult(float[] Embedding, string ModelId, string ModelVersion);

public sealed record PadResult(double LiveProbability, double PrintAttackProbability, double ReplayAttackProbability);

/// <summary>
/// Server-authoritative face embedding + passive anti-spoofing. Behind this interface so AWS
/// Rekognition (Phase 9) is a config swap, not a rewrite - and so a missing/unlicensed model file
/// degrades to IsConfigured=false rather than crashing, the same pattern already used for Email.
/// Input is always an aligned, pre-cropped face JPEG - alignment/cropping is the caller's job so
/// this interface never needs to know about bounding boxes, landmarks, or image libraries.
/// </summary>
public interface IFaceVerificationProvider
{
    bool IsConfigured { get; }

    Task<FaceEmbeddingResult?> ExtractEmbeddingAsync(byte[] alignedFaceJpegBytes, CancellationToken ct);

    Task<PadResult?> EvaluateLivenessAsync(byte[] alignedFaceJpegBytes, CancellationToken ct);
}
