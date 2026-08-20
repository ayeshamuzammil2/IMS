namespace PIA.Application.Options;

/// <summary>Off by default and until a real device population's honest-failure rate has been
/// measured under FlagOnly - enforcing sight-unseen would lock out real interns on quirky-but-
/// legitimate devices. See the plan's grading rationale.</summary>
public enum PlayIntegrityMode
{
    Off,
    FlagOnly,
    Enforce,
}

public sealed class PlayIntegrityOptions
{
    public const string SectionName = "PlayIntegrity";

    public PlayIntegrityMode Mode { get; set; } = PlayIntegrityMode.Off;

    public string PackageName { get; set; } = "com.pia.internship";

    /// <summary>Path to a Google Cloud service account JSON key with the Play Integrity API
    /// enabled. Missing/absent file means IsConfigured=false regardless of Mode - the same
    /// graceful-degradation pattern used for Email/SMTP and the ONNX face provider.</summary>
    public string ServiceAccountJsonPath { get; set; } = "Assets/Secrets/play-integrity-service-account.json";
}
