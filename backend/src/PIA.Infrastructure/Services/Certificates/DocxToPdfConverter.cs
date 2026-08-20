using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PIA.Application.Options;

namespace PIA.Infrastructure.Services.Certificates;

public interface IDocxToPdfConverter
{
    /// <summary>Returns null (never throws) on any failure - missing executable, non-zero exit,
    /// or timeout - so the caller can fall back to the built-in QuestPDF layout instead of the
    /// demo blocking on a ~700MB optional LibreOffice install.</summary>
    Task<byte[]?> TryConvertAsync(byte[] docxBytes, CancellationToken ct);
}

public sealed class LibreOfficeDocxToPdfConverter(
    IOptions<CertificateOptions> options,
    ILogger<LibreOfficeDocxToPdfConverter> logger) : IDocxToPdfConverter
{
    public async Task<byte[]?> TryConvertAsync(byte[] docxBytes, CancellationToken ct)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "pia-cert-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        try
        {
            var inputPath = Path.Combine(tempDir, "input.docx");
            await File.WriteAllBytesAsync(inputPath, docxBytes, ct);

            var psi = new ProcessStartInfo
            {
                FileName = options.Value.LibreOfficeExecutable,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            };
            psi.ArgumentList.Add("--headless");
            psi.ArgumentList.Add("--norestore");
            psi.ArgumentList.Add("--convert-to");
            psi.ArgumentList.Add("pdf");
            psi.ArgumentList.Add("--outdir");
            psi.ArgumentList.Add(tempDir);
            psi.ArgumentList.Add(inputPath);

            using var process = Process.Start(psi);
            if (process is null)
            {
                logger.LogWarning("LibreOffice process could not be started - falling back to built-in layout.");
                return null;
            }

            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(options.Value.ConversionTimeoutSeconds));
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
            try
            {
                await process.WaitForExitAsync(linked.Token);
            }
            catch (OperationCanceledException)
            {
                TryKill(process);
                logger.LogWarning("LibreOffice conversion timed out after {TimeoutSeconds}s - falling back to built-in layout.", options.Value.ConversionTimeoutSeconds);
                return null;
            }

            var outputPath = Path.Combine(tempDir, "input.pdf");
            if (process.ExitCode != 0 || !File.Exists(outputPath))
            {
                logger.LogWarning("LibreOffice conversion exited with code {ExitCode} - falling back to built-in layout.", process.ExitCode);
                return null;
            }

            return await File.ReadAllBytesAsync(outputPath, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "LibreOffice conversion failed - falling back to built-in layout.");
            return null;
        }
        finally
        {
            try { Directory.Delete(tempDir, recursive: true); } catch { /* best-effort cleanup */ }
        }
    }

    private static void TryKill(Process process)
    {
        try { process.Kill(entireProcessTree: true); } catch { /* already exited */ }
    }
}
