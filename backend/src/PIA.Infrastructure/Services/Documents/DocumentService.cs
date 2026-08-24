using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Documents;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;
using SkiaSharp;

namespace PIA.Infrastructure.Services.Documents;

public sealed class DocumentService(
    PiaDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    IVerificationRecomputer verificationRecomputer,
    IClock clock) : IDocumentService
{
    public async Task<InternDashboardDto> GetMyDashboardAsync(CancellationToken ct)
    {
        var profile = await LoadOwnProfileAsync(ct);
        var documents = await db.InternDocuments.AsNoTracking()
            .Where(d => d.InternProfileId == profile.Id)
            .OrderByDescending(d => d.Version)
            .ToListAsync(ct);

        var latestPerType = documents.GroupBy(d => d.DocumentType).Select(g => g.First()).ToList();

        return new InternDashboardDto(
            profile.Id, profile.User.FullName, profile.User.Email, profile.User.Phone, profile.User.Cnic,
            profile.InternCode, profile.User.Department?.Name ?? string.Empty, profile.Mentor.FullName,
            profile.InternshipStartDate, profile.InternshipEndDate, profile.DailyStartTime, profile.DailyEndTime,
            profile.UniversityName, profile.DegreeProgram,
            profile.VerificationStatus.ToString(), profile.ProfilePhotoStatus.ToString(), profile.ApprovedPhotoFileId,
            profile.Address, profile.EmergencyContactName, profile.EmergencyContactPhone, profile.BloodGroup,
            profile.SelfDetailsSubmitted,
            latestPerType.Select(ToDto).ToList());
    }

    public async Task<DocumentDto> UploadAsync(UploadDocumentRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<DocumentType>(request.DocumentType, true, out var documentType) || documentType == DocumentType.Cnic)
        {
            throw new ValidationException("documentType",
                "Must be one of ProfilePhoto, CnicFront, CnicBack, Resume, ReferenceLetter, ExtraDocument.");
        }

        var profile = await LoadOwnProfileAsync(ct);

        using var buffer = new MemoryStream();
        await request.Content.CopyToAsync(buffer, ct);
        var bytes = buffer.ToArray();

        if (documentType == DocumentType.ProfilePhoto)
        {
            using var bitmap = SKBitmap.Decode(bytes);
            if (bitmap is null)
            {
                throw new BusinessRuleException(BusinessRuleCodes.CorruptFile, "The photo could not be processed. Please try again.");
            }

            var (isValid, reason) = PassportBackgroundValidator.Validate(bitmap);
            if (!isValid)
            {
                throw new BusinessRuleException("INVALID_PHOTO_BACKGROUND", reason);
            }
        }

        var storedFile = await fileStorage.SaveAsync(new FileSaveRequest(
            new MemoryStream(bytes), request.FileName, request.ContentType, CategoryFor(documentType),
            profile.UserId, profile.UserId), ct);

        var nextVersion = 1 + (await db.InternDocuments
            .Where(d => d.InternProfileId == profile.Id && d.DocumentType == documentType)
            .Select(d => (int?)d.Version).MaxAsync(ct) ?? 0);

        var document = new InternDocument
        {
            InternProfileId = profile.Id,
            DocumentType = documentType,
            FileId = storedFile.Id,
            Version = nextVersion,
            Status = DocumentStatus.Pending,
            UploadedAtUtc = clock.UtcNow,
        };
        db.InternDocuments.Add(document);
        await db.SaveChangesAsync(ct);

        await verificationRecomputer.RecomputeAsync(profile.Id, ct);

        return ToDto(document);
    }

    public async Task<DocumentDto> SubmitExtraLinkAsync(SubmitExtraDocumentLinkRequest request, CancellationToken ct)
    {
        var url = request.Url.Trim();
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed) || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            throw new ValidationException("url", "Must be a valid http(s) URL.");
        }

        var profile = await LoadOwnProfileAsync(ct);

        var nextVersion = 1 + (await db.InternDocuments
            .Where(d => d.InternProfileId == profile.Id && d.DocumentType == DocumentType.ExtraDocument)
            .Select(d => (int?)d.Version).MaxAsync(ct) ?? 0);

        var document = new InternDocument
        {
            InternProfileId = profile.Id,
            DocumentType = DocumentType.ExtraDocument,
            FileId = null,
            ExternalLinkUrl = url,
            Version = nextVersion,
            Status = DocumentStatus.Pending,
            UploadedAtUtc = clock.UtcNow,
        };
        db.InternDocuments.Add(document);
        await db.SaveChangesAsync(ct);

        return ToDto(document);
    }

    /// <summary>Address/EmergencyContact*/BloodGroup are the only fields an intern may edit about
    /// themselves (core profile fields stay admin/mentor-only) - this is a repeatable update, not a
    /// one-time submission gate, so ProfileLocked is intentionally never set here anymore.</summary>
    public async Task SubmitSelfDetailsAsync(SubmitSelfDetailsRequest request, CancellationToken ct)
    {
        var profile = await LoadOwnProfileAsync(ct);

        var tracked = await db.InternProfiles.FirstAsync(p => p.Id == profile.Id, ct);
        tracked.Address = request.Address;
        tracked.EmergencyContactName = request.EmergencyContactName;
        tracked.EmergencyContactPhone = request.EmergencyContactPhone;
        tracked.BloodGroup = request.BloodGroup;
        tracked.SelfDetailsSubmitted = true;
        tracked.SelfDetailsSubmittedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private async Task<InternProfile> LoadOwnProfileAsync(CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns have documents.");
        return await db.InternProfiles.AsNoTracking()
            .Include(p => p.User).ThenInclude(u => u.Department)
            .Include(p => p.Mentor)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
    }

    private static FileCategory CategoryFor(DocumentType type) => type switch
    {
        DocumentType.ProfilePhoto => FileCategory.ProfilePhoto,
        DocumentType.Cnic or DocumentType.CnicFront or DocumentType.CnicBack => FileCategory.CnicScan,
        DocumentType.Resume => FileCategory.Resume,
        DocumentType.ReferenceLetter => FileCategory.ReferenceLetter,
        DocumentType.ExtraDocument => FileCategory.ExtraDocument,
        _ => throw new ArgumentOutOfRangeException(nameof(type)),
    };

    private static DocumentDto ToDto(InternDocument d) => new(
        d.Id, d.DocumentType.ToString(), d.FileId, d.ExternalLinkUrl, d.Version, d.Status.ToString(), d.Remarks,
        d.UploadedAtUtc, d.ReviewedByUserId, d.ReviewedAtUtc);
}
