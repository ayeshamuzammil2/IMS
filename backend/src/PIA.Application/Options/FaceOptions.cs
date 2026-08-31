namespace PIA.Application.Options;

public sealed class FaceOptions
{
    public const string SectionName = "Face";

    /// <summary>Folder (relative to the Infrastructure assembly, or absolute) holding the .onnx
    /// model files. Empty/missing files mean the provider runs in NotConfigured mode - the same
    /// graceful-degradation pattern as Email/SMTP.</summary>
    public string ModelsPath { get; set; } = "Assets/Models";

    public string EmbeddingModelFileName { get; set; } = "arcface_r100.onnx";
    public string PadModelFileName { get; set; } = "minifasnet.onnx";
    public string FaceDetectorModelFileName { get; set; } = "version-RFB-320.onnx";

    public int EmbeddingInputSize { get; set; } = 112;
    public int PadInputSize { get; set; } = 80;

    /// <summary>MiniFASNet crop scale - the ratio of crop width to detected face-box width. Getting
    /// this wrong silently halves accuracy against the reference implementation; unit-tested
    /// separately once real weights are available.</summary>
    public double PadCropScale { get; set; } = 2.7;

    /// <summary>Crop scale used for embedding extraction (face-match, not liveness) - deliberately
    /// separate from PadCropScale. Embedding models are far more sensitive to how much of the frame
    /// the face fills than PAD is: empirical testing against the bundled facenet.onnx showed cosine
    /// similarity for the SAME photo dropping from 1.0 (no margin) to ~0.52 once margin reached
    /// PadCropScale's 2.7x (face filling only ~37% of frame) - low enough to fail a genuine match
    /// against nothing but a framing difference. 1.3 keeps the face filling most of the crop (close
    /// to how facenet-pytorch's own MTCNN margin=0 convention frames a face) while still tolerating
    /// imperfect bounding boxes from either detector (client ML Kit for live capture, the bundled
    /// RFB-320 detector for the static approved photo). This value must be applied consistently
    /// everywhere an embedding is computed - the enrolled template, the enrollment cross-match, and
    /// every daily attendance comparison - or the same mismatch reappears.</summary>
    public double EmbeddingCropScale { get; set; } = 1.3;

    public double FaceDetectorConfidenceThreshold { get; set; } = 0.7;
    public double FaceDetectorNmsIouThreshold { get; set; } = 0.3;

    public double MatchThreshold { get; set; } = 0.62;
    public double PadLiveThreshold { get; set; } = 0.85;
    public double PadReplayHardFailThreshold { get; set; } = 0.4;

    public double EnrollmentCrossMatchThreshold { get; set; } = 0.55;
    public int EnrollmentRefreshCooldownDays { get; set; } = 30;

    public double ParallaxMinYawSwingDegrees { get; set; } = 15;
    public double ParallaxLiveResidualRatio { get; set; } = 0.015;
    public double ParallaxPlaneResidualRatio { get; set; } = 0.005;

    public double RiskReviewThreshold { get; set; } = 60;
    public double RiskHardFailThreshold { get; set; } = 80;
}