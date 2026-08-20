namespace PIA.Application.Abstractions;

public enum PlayIntegrityVerdict
{
    /// <summary>No service account configured, or Mode=Off - the caller should treat this exactly
    /// like the pre-Phase-9 hardcoded stub (record it, never block on it).</summary>
    NotConfigured,

    /// <summary>Configured and enabled, but the client didn't send a token (e.g. an older app
    /// build, or an iOS client - Play Integrity is Android-only).</summary>
    TokenMissing,

    Verified,
    Failed,
}

/// <summary>Wraps Google Play Integrity's DecodeIntegrityToken call behind the same
/// IsConfigured-gated pattern as IFaceVerificationProvider - a missing service account key
/// degrades to NotConfigured rather than crashing the attendance flow.</summary>
public interface IPlayIntegrityVerifier
{
    bool IsConfigured { get; }

    Task<PlayIntegrityVerdict> VerifyAsync(string? attestationToken, CancellationToken ct);
}
