using PIA.Domain.Enums;

namespace PIA.Application.Options;

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    public string RootPath { get; set; } = "App_Data/storage";

    public Dictionary<FileCategory, CategoryLimits> Limits { get; set; } = new()
    {
        [FileCategory.ProfilePhoto] = new CategoryLimits { MaxSizeBytes = 3 * 1024 * 1024, AllowedExtensions = [".jpg", ".jpeg", ".png"] },
        [FileCategory.CnicScan] = new CategoryLimits { MaxSizeBytes = 8 * 1024 * 1024, AllowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"] },
        [FileCategory.Resume] = new CategoryLimits { MaxSizeBytes = 8 * 1024 * 1024, AllowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"] },
        [FileCategory.ReferenceLetter] = new CategoryLimits { MaxSizeBytes = 8 * 1024 * 1024, AllowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"] },
        [FileCategory.AttendanceSelfie] = new CategoryLimits { MaxSizeBytes = 3 * 1024 * 1024, AllowedExtensions = [".jpg", ".jpeg", ".png"] },
        [FileCategory.AttendanceChallengeFrame] = new CategoryLimits { MaxSizeBytes = 1 * 1024 * 1024, AllowedExtensions = [".jpg", ".jpeg", ".png"] },
        [FileCategory.ProjectFile] = new CategoryLimits { MaxSizeBytes = 20 * 1024 * 1024, AllowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"] },
        [FileCategory.CertificateTemplate] = new CategoryLimits { MaxSizeBytes = 5 * 1024 * 1024, AllowedExtensions = [".docx"] },
        [FileCategory.GeneratedCertificate] = new CategoryLimits { MaxSizeBytes = 10 * 1024 * 1024, AllowedExtensions = [".pdf"] },
        [FileCategory.GeneratedIdCard] = new CategoryLimits { MaxSizeBytes = 10 * 1024 * 1024, AllowedExtensions = [".pdf"] },
    };

    public sealed class CategoryLimits
    {
        public long MaxSizeBytes { get; set; }
        public string[] AllowedExtensions { get; set; } = [];
    }
}
