namespace PIA.Application.Options;

public sealed class CertificateOptions
{
    public const string SectionName = "Certificates";

    /// <summary>Executable name or absolute path for LibreOffice headless conversion. When it
    /// cannot be found/fails/times out, generation falls back to the built-in QuestPDF layout -
    /// the same graceful-degradation pattern as Email/SMTP and the ONNX face provider.</summary>
    public string LibreOfficeExecutable { get; set; } = "soffice";

    public int ConversionTimeoutSeconds { get; set; } = 30;
}
