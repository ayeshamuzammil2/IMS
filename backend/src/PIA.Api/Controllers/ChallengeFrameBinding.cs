using System.Text.Json;
using Microsoft.AspNetCore.Http;
using PIA.Application.Contracts.Attendance;
using PIA.Domain.Exceptions;

namespace PIA.Api.Controllers;

/// <summary>Shared multipart-to-contract translation for both the attendance submit and
/// enrollment submit endpoints - frames and telemetry are paired by position (frame i corresponds
/// to telemetry[i]), which is the simplest contract for the client to satisfy.</summary>
internal static class ChallengeFrameBinding
{
    // The mobile client sends camelCase JSON (standard JS/RN convention); System.Text.Json's
    // default Deserialize() is case-sensitive PascalCase and would silently bind everything to
    // null/default instead of throwing, so this must be explicit rather than relying on the
    // ASP.NET Core pipeline's own (differently-configured) JSON options.
    private static readonly JsonSerializerOptions TelemetryJsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static List<SubmitChallengeFrame> BuildFrames(IReadOnlyList<IFormFile> files, string telemetryJson)
    {
        List<ChallengeFrameTelemetryDto>? telemetry;
        try
        {
            telemetry = JsonSerializer.Deserialize<List<ChallengeFrameTelemetryDto>>(telemetryJson, TelemetryJsonOptions);
        }
        catch (JsonException)
        {
            throw new ValidationException("telemetryJson", "Telemetry JSON was malformed.");
        }
        telemetry ??= [];

        var frames = new List<SubmitChallengeFrame>();
        for (var i = 0; i < files.Count; i++)
        {
            var file = files[i];
            var meta = i < telemetry.Count
                ? telemetry[i]
                : new ChallengeFrameTelemetryDto(i, 0, "Unknown", null, null, null, null, null, null, null, null, null);
            frames.Add(new SubmitChallengeFrame(file.OpenReadStream(), file.FileName, file.ContentType, meta));
        }
        return frames;
    }
}
