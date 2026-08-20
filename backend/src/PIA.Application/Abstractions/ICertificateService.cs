using PIA.Application.Contracts.Certificates;

namespace PIA.Application.Abstractions;

/// <summary>Mentor/Admin-facing template management - upload validates OOXML and extracts merge
/// fields; preview renders with sample data and never touches a real Certificate row.</summary>
public interface ICertificateTemplateService
{
    Task<IReadOnlyList<CertificateTemplateDto>> ListAsync(CancellationToken ct);

    Task<CertificateTemplateDto> UploadAsync(UploadCertificateTemplateRequest request, CancellationToken ct);

    Task<GeneratedFileResult> PreviewAsync(int templateId, CancellationToken ct);
}

/// <summary>Per-intern certificate lifecycle: Generate (Mentor/Admin) -> Approve (Admin) -> Issue (Admin).</summary>
public interface ICertificateService
{
    Task<CertificateDto> GetMineAsync(CancellationToken ct);

    /// <summary>Mentor/Admin-facing - lets the UI decide whether to show Generate, Approve, or Issue for this intern.</summary>
    Task<CertificateDto> GetForInternAsync(int internProfileId, CancellationToken ct);

    /// <summary>Mentor/Admin oversight listing - only interns that already have a generated certificate row.</summary>
    Task<IReadOnlyList<CertificateDto>> ListAsync(int? departmentId, CancellationToken ct);

    Task<CertificateDto> GenerateAsync(int internProfileId, GenerateCertificateRequest request, CancellationToken ct);

    Task<CertificateDto> ApproveAsync(int internProfileId, CancellationToken ct);

    Task<CertificateDto> IssueAsync(int internProfileId, CancellationToken ct);
}
