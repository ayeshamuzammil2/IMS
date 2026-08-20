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

    public int EmbeddingInputSize { get; set; } = 112;
    public int PadInputSize { get; set; } = 80;

    /// <summary>MiniFASNet crop scale - the ratio of crop width to detected face-box width. Getting
    /// this wrong silently halves accuracy against the reference implementation; unit-tested
    /// separately once real weights are available.</summary>
    public double PadCropScale { get; set; } = 2.7;

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
