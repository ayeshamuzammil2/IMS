using DocumentFormat.OpenXml.Packaging;

namespace PIA.Infrastructure.Services.Files;

public static class MagicByteSniffer
{
    /// <summary>
    /// Sniffs the real content type from file bytes rather than trusting the client-declared
    /// type or extension - the actual defence against a renamed .exe or a polyglot file.
    /// Returns null if the content doesn't match any known signature.
    /// </summary>
    public static string? Sniff(byte[] header, Stream fullContentForZipCheck)
    {
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (header.Length >= 8 &&
            header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
        {
            return "image/png";
        }

        if (header.Length >= 5 &&
            header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46 && header[4] == 0x2D)
        {
            return "application/pdf";
        }

        // ZIP signature (PK..) - could be a .docx, but could also be a renamed .zip/.xlsx/.pptx.
        // Only classify as docx if it genuinely has a MainDocumentPart.
        if (header.Length >= 4 && header[0] == 0x50 && header[1] == 0x4B && (header[2] == 0x03 || header[2] == 0x05 || header[2] == 0x07))
        {
            if (IsGenuineDocx(fullContentForZipCheck))
            {
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            }
            return null;
        }

        return null;
    }

    private static bool IsGenuineDocx(Stream content)
    {
        var position = content.Position;
        try
        {
            content.Position = 0;
            using var doc = WordprocessingDocument.Open(content, false);
            return doc.MainDocumentPart is not null;
        }
        catch
        {
            return false;
        }
        finally
        {
            content.Position = position;
        }
    }
}
