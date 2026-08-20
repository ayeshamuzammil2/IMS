using Google.Apis.Auth.OAuth2;
using Google.Apis.PlayIntegrity.v1;
using Google.Apis.PlayIntegrity.v1.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Options;

namespace PIA.Infrastructure.Services.DeviceIntegrity;

/// <summary>
/// Real Google Play Integrity API client (Google.Apis.PlayIntegrity.v1, verified against the
/// actual installed package - DecodeIntegrityToken, not a guessed shape). Requires a Google Cloud
/// service account JSON key with the Play Integrity API enabled and linked to the app's Play
/// Console listing; without one, IsConfigured is false and every call degrades to NotConfigured.
/// A "pass" requires the app to be Play-recognized AND the device to meet at least basic
/// integrity - deliberately not requiring the strict MEETS_STRONG_INTEGRITY tier, which many
/// legitimate older/budget Android devices in the field cannot satisfy.
/// </summary>
public sealed class GooglePlayIntegrityVerifier : IPlayIntegrityVerifier
{
    private readonly PlayIntegrityOptions _options;
    private readonly ILogger<GooglePlayIntegrityVerifier> _logger;
    private readonly Lazy<PlayIntegrityService?> _service;

    public GooglePlayIntegrityVerifier(IOptions<PlayIntegrityOptions> options, ILogger<GooglePlayIntegrityVerifier> logger)
    {
        _options = options.Value;
        _logger = logger;
        _service = new Lazy<PlayIntegrityService?>(BuildService);
    }

    public bool IsConfigured => _options.Mode != PlayIntegrityMode.Off && File.Exists(_options.ServiceAccountJsonPath);

    public async Task<PlayIntegrityVerdict> VerifyAsync(string? attestationToken, CancellationToken ct)
    {
        if (!IsConfigured)
        {
            return PlayIntegrityVerdict.NotConfigured;
        }
        if (string.IsNullOrWhiteSpace(attestationToken))
        {
            return PlayIntegrityVerdict.TokenMissing;
        }

        var service = _service.Value;
        if (service is null)
        {
            return PlayIntegrityVerdict.NotConfigured;
        }

        try
        {
            var response = await service.V1
                .DecodeIntegrityToken(new DecodeIntegrityTokenRequest { IntegrityToken = attestationToken }, _options.PackageName)
                .ExecuteAsync(ct);

            var appVerdict = response.TokenPayloadExternal?.AppIntegrity?.AppRecognitionVerdict;
            var deviceVerdicts = response.TokenPayloadExternal?.DeviceIntegrity?.DeviceRecognitionVerdict ?? new List<string>();

            var appOk = appVerdict == "PLAY_RECOGNIZED";
            var deviceOk = deviceVerdicts.Contains("MEETS_DEVICE_INTEGRITY") || deviceVerdicts.Contains("MEETS_BASIC_INTEGRITY");

            return appOk && deviceOk ? PlayIntegrityVerdict.Verified : PlayIntegrityVerdict.Failed;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Play Integrity token decode failed - treating as Failed.");
            return PlayIntegrityVerdict.Failed;
        }
    }

    private PlayIntegrityService? BuildService()
    {
        if (!File.Exists(_options.ServiceAccountJsonPath))
        {
            return null;
        }

        var credential = GoogleCredential.FromFile(_options.ServiceAccountJsonPath)
            .CreateScoped([PlayIntegrityService.Scope.Playintegrity]);

        return new PlayIntegrityService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "PIA Internship System",
        });
    }
}
