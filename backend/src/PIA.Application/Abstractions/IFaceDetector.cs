using PIA.Application.Contracts.Attendance;

namespace PIA.Application.Abstractions;

/// <summary>
/// Server-side face detection, run directly against the actual image bytes being cropped so the
/// resulting bounding box is always in the same coordinate space as the bitmap it's used on.
///
/// Originally added for just the static, mentor-approved profile photo (uploaded once through a
/// plain file picker, so it never carries a client-reported bounding box the way live captures do)
/// to fix a real bug: without it, the approved photo was fed to
/// IFaceVerificationProvider.ExtractEmbeddingAsync completely uncropped, while every live capture
/// was cropped tightly around the detected face - a framing mismatch severe enough to fail a
/// genuine same-person match on its own.
///
/// Now also used for live enrollment/attendance captures themselves: the client-reported bounding
/// box in ChallengeFrameTelemetryDto is measured against VisionCamera's face-detector analysis
/// frame, which runs at a different resolution than the still photo captured alongside it. Using
/// that box to crop the still photo lands on an unrelated region of the image instead of the face
/// (confirmed via mismatched crop dimensions and a debug crop that showed background, not a face).
/// Detecting the face directly in each submitted photo avoids that coordinate-space mismatch
/// entirely, regardless of what resolution the client's preview/analysis frame happened to be. The
/// client-reported box is kept only as a fallback for when this detector's model isn't installed.
/// </summary>
public interface IFaceDetector
{
    bool IsConfigured { get; }

    /// <summary>Returns the single highest-confidence face bounding box in the image, or null if
    /// no face was found above the confidence threshold (or the detector isn't configured).</summary>
    Task<BoundingBoxDto?> DetectFaceAsync(byte[] imageBytes, CancellationToken ct);
}