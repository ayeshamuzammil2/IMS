using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Files;

public sealed class LocalFileStorage(PiaDbContext db, IOptions<FileStorageOptions> options, IClock clock, ILogger<LocalFileStorage> logger)
    : IFileStorage
{
    private static readonly Dictionary<string, string> ContentTypeToExtension = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["application/pdf"] = ".pdf",
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] = ".docx",
    };

    private static readonly HashSet<FileCategory> ImageCategories =
    [
        FileCategory.ProfilePhoto, FileCategory.AttendanceSelfie, FileCategory.AttendanceChallengeFrame,
    ];

    public async Task<StoredFile> SaveAsync(FileSaveRequest request, CancellationToken ct)
    {
        var limits = options.Value.Limits.GetValueOrDefault(request.Category)
            ?? throw new BusinessRuleException(BusinessRuleCodes.InvalidFileType, "This upload category is not configured.");

        using var buffer = new MemoryStream();
        await request.Content.CopyToAsync(buffer, ct);
        if (buffer.Length == 0)
        {
            throw new BusinessRuleException(BusinessRuleCodes.CorruptFile, "The uploaded file is empty.");
        }
        if (buffer.Length > limits.MaxSizeBytes)
        {
            throw new BusinessRuleException(BusinessRuleCodes.FileTooLarge,
                $"File exceeds the maximum allowed size of {limits.MaxSizeBytes / (1024 * 1024)} MB.");
        }

        buffer.Position = 0;
        var header = new byte[16];
        var read = await buffer.ReadAsync(header.AsMemory(0, Math.Min(16, (int)buffer.Length)), ct);
        buffer.Position = 0;

        var sniffedType = MagicByteSniffer.Sniff(header[..read], buffer);
        if (sniffedType is null || !ContentTypeToExtension.TryGetValue(sniffedType, out var extension))
        {
            throw new BusinessRuleException(BusinessRuleCodes.InvalidFileType,
                "The file's actual content does not match any allowed type (JPEG, PNG, PDF, or DOCX).");
        }
        if (!limits.AllowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
        {
            throw new BusinessRuleException(BusinessRuleCodes.InvalidFileType,
                $"Files of type {extension} are not allowed for this upload.");
        }

        byte[] finalBytes;
        string finalContentType;
        string finalExtension;
        if (ImageCategories.Contains(request.Category))
        {
            // Always re-encoded to JPEG regardless of the original sniffed type (JPEG or PNG both
            // accepted as input) - strips EXIF/GPS, caps dimensions, and gives one canonical output
            // format. The extension/content-type must reflect THIS, not the pre-normalization sniff.
            finalBytes = NormalizeImage(buffer);
            finalContentType = "image/jpeg";
            finalExtension = ".jpg";
        }
        else
        {
            buffer.Position = 0;
            finalBytes = buffer.ToArray();
            finalContentType = sniffedType;
            finalExtension = extension;
        }

        var sha256 = Convert.ToHexString(SHA256.HashData(finalBytes));
        var fileId = Guid.NewGuid();
        var now = clock.UtcNow;
        var relativePath = Path.Combine(
            request.Category.ToString(), now.Year.ToString(), now.Month.ToString("D2"), $"{fileId:N}{finalExtension}");
        var fullPath = Path.Combine(options.Value.RootPath, relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        var rootFull = Path.GetFullPath(options.Value.RootPath);
        var targetFull = Path.GetFullPath(fullPath);
        if (!targetFull.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
        {
            // Should be unreachable (path is built entirely from a Guid + a fixed enum name),
            // but guard against path traversal regardless of how the path was assembled.
            throw new BusinessRuleException(BusinessRuleCodes.CorruptFile, "Invalid storage path.");
        }

        await File.WriteAllBytesAsync(targetFull, finalBytes, ct);

        var storedFile = new StoredFile
        {
            Id = fileId,
            Category = request.Category,
            OwnerUserId = request.OwnerUserId,
            UploadedByUserId = request.UploadedByUserId,
            StorageKey = relativePath.Replace('\\', '/'),
            OriginalFileName = SanitizeDisplayName(request.OriginalFileName),
            ContentType = finalContentType,
            SizeBytes = finalBytes.LongLength,
            Sha256 = sha256,
            IsDeleted = false,
            CreatedAtUtc = now,
        };

        db.StoredFiles.Add(storedFile);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Stored file {FileId} ({Category}, {Size} bytes)", fileId, request.Category, finalBytes.Length);
        return storedFile;
    }

    public async Task<Stream> OpenReadAsync(Guid fileId, CancellationToken ct)
    {
        var file = await db.StoredFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == fileId && !f.IsDeleted, ct)
            ?? throw new NotFoundException(nameof(StoredFile), fileId);

        var fullPath = Path.Combine(options.Value.RootPath, file.StorageKey);
        if (!File.Exists(fullPath))
        {
            throw new NotFoundException(nameof(StoredFile), fileId);
        }

        var bytes = await File.ReadAllBytesAsync(fullPath, ct);
        return new MemoryStream(bytes);
    }

    public async Task<StoredFile?> GetMetadataAsync(Guid fileId, CancellationToken ct) =>
        await db.StoredFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == fileId && !f.IsDeleted, ct);

    public async Task SoftDeleteAsync(Guid fileId, CancellationToken ct)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == fileId, ct);
        if (file is null) return;

        file.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    public async Task PurgeAsync(Guid fileId, CancellationToken ct)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == fileId, ct);
        if (file is null) return;

        var fullPath = Path.Combine(options.Value.RootPath, file.StorageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        file.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Purged file {FileId} ({Category}) past its retention window", fileId, file.Category);
    }

    private static byte[] NormalizeImage(MemoryStream buffer)
    {
        buffer.Position = 0;
        using var original = SKBitmap.Decode(buffer);
        if (original is null)
        {
            throw new BusinessRuleException(BusinessRuleCodes.CorruptFile, "The image could not be decoded.");
        }

        const int maxDimension = 1280;
        var scale = Math.Min(1.0, maxDimension / (double)Math.Max(original.Width, original.Height));
        var targetWidth = Math.Max(1, (int)(original.Width * scale));
        var targetHeight = Math.Max(1, (int)(original.Height * scale));

        using var resized = scale < 1.0
            ? original.Resize(new SKImageInfo(targetWidth, targetHeight), SKFilterQuality.High)
            : original.Copy();
        using var image = SKImage.FromBitmap(resized ?? original);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 85);
        return data.ToArray();
    }

    private static string SanitizeDisplayName(string originalFileName)
    {
        var name = Path.GetFileName(originalFileName);
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(name.Where(c => !invalid.Contains(c)).ToArray());
        return cleaned.Length > 0 ? cleaned[..Math.Min(cleaned.Length, 255)] : "file";
    }
}
