using PIA.Application.Contracts.Attendance;

namespace PIA.Application.Abstractions;

/// <summary>
/// Server-side face detection for images that don't already carry a client-supplied bounding box -
/// most importantly the static, mentor-approved profile photo, which is uploaded once through a
/// plain file picker rather than the live-camera + on-device face-detector pipeline that live
/// attendance/enrollment captures go through.
///
/// This exists specifically to fix a real bug: without it, the approved photo was fed to
/// IFaceVerificationProvider.ExtractEmbeddingAsync completely uncropped, while every live capture
/// was cropped tightly around the detected face. Embedding models are highly sensitive to how much
/// of the frame the face fills - comparing an uncropped photo against a tightly-cropped live frame
/// can score a genuine same-person match well below any reasonable threshold, purely from the
/// framing mismatch, with nothing wrong with either photo. Detecting the face here lets the caller
/// crop both images with FaceCropper using the same scale before ever calling ExtractEmbeddingAsync.
/// </summary>
public interface IFaceDetector
{
    bool IsConfigured { get; }

    /// <summary>Returns the single highest-confidence face bounding box in the image, or null if
    /// no face was found above the confidence threshold (or the detector isn't configured).</summary>
    Task<BoundingBoxDto?> DetectFaceAsync(byte[] imageBytes, CancellationToken ct);
}