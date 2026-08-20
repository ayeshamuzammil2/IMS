using PIA.Application.Contracts.Certificates;
using PIA.Domain.Enums;

namespace PIA.Infrastructure.Services.Certificates;

public sealed record RenderedCertificate(GeneratedFileResult File, CertificateRenderedBy RenderedBy);

/// <summary>Infrastructure-internal - shared between CertificateTemplateService (preview, sample
/// data) and CertificateService (real generation, real data) so the merge+convert+fallback
/// pipeline has exactly one implementation regardless of which side triggered it.</summary>
public interface ICertificateDocxRenderer
{
    Task<RenderedCertificate> RenderAsync(
        Guid templateFileId, IReadOnlyDictionary<string, string> data, string outputFileNameWithoutExtension, CancellationToken ct);
}
