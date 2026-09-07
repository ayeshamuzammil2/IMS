using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Certificates;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Certificates;

public sealed class CertificateService(
    PiaDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    ICertificateDocxRenderer renderer,
    INotificationService notifications,
    IClock clock) : ICertificateService
{
    public async Task<CertificateDto> GetMineAsync(CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns have a certificate.");
        var profile = await db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department).AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        var certificate = await db.Certificates.AsNoTracking().FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);

        return ToDto(certificate, profile);
    }

    public async Task<CertificateDto> GetForInternAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);
        var certificate = await db.Certificates.AsNoTracking().FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);
        return ToDto(certificate, profile);
    }

    public async Task<IReadOnlyList<CertificateDto>> ListAsync(int? departmentId, CancellationToken ct)
    {
        var certQuery = db.Certificates.AsNoTracking()
            .Include(c => c.InternProfile).ThenInclude(p => p.User).ThenInclude(u => u.Department)
            .AsQueryable();

        if (currentUser.Role == UserRole.Mentor)
        {
            certQuery = certQuery.Where(c => c.InternProfile.MentorId == currentUser.UserId);
        }
        else if (departmentId is { } deptId)
        {
            certQuery = certQuery.Where(c => c.InternProfile.User.DepartmentId == deptId);
        }

        var certificates = await certQuery.OrderBy(c => c.InternProfile.User.Department!.Name).ThenBy(c => c.InternProfile.User.FullName).ToListAsync(ct);
        return certificates.Select(c => ToDto(c, c.InternProfile)).ToList();
    }

    public async Task<CertificateDto> GenerateAsync(int internProfileId, GenerateCertificateRequest request, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);

        if (profile.VerificationStatus != VerificationStatus.Verified || clock.TodayInPakistan < profile.InternshipEndDate)
        {
            throw new BusinessRuleException(BusinessRuleCodes.CertificateNotEligible,
                "This intern is not yet eligible for a certificate - verification must be complete and the internship period must have ended.");
        }

        var template = await db.CertificateTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TemplateId, ct)
            ?? throw new NotFoundException(nameof(CertificateTemplate), request.TemplateId);

        var certificate = await db.Certificates.FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);
        var certificateNumber = certificate?.CertificateNumber ?? $"CERT-{profile.InternCode}";

        var data = CertificateMergeFields.BuildRealData(profile, certificateNumber, clock.TodayInPakistan);
        var rendered = await renderer.RenderAsync(template.FileId, data, $"certificate-{profile.InternCode}", ct);

        var storedFile = await fileStorage.SaveAsync(new FileSaveRequest(
            new MemoryStream(rendered.File.Content), rendered.File.FileName, rendered.File.ContentType,
            FileCategory.GeneratedCertificate, profile.UserId, currentUser.UserId), ct);

        if (certificate is null)
        {
            certificate = new Certificate
            {
                InternProfileId = internProfileId,
                CertificateNumber = certificateNumber,
                CreatedAtUtc = clock.UtcNow,
            };
            db.Certificates.Add(certificate);
        }

        certificate.TemplateId = template.Id;
        certificate.GeneratedFileId = storedFile.Id;
        certificate.RenderedBy = rendered.RenderedBy;
        certificate.Status = CertificateStatus.PendingApproval;
        certificate.RejectionReason = null;
        await db.SaveChangesAsync(ct);

        return ToDto(certificate, profile);
    }

    public async Task<CertificateDto> ApproveAsync(int internProfileId, CancellationToken ct)
    {
        var (certificate, profile) = await LoadCertificateAsync(internProfileId, ct);
        if (certificate.Status != CertificateStatus.PendingApproval)
        {
            throw new ConflictException("Only a certificate pending approval can be approved.");
        }

        certificate.Status = CertificateStatus.Approved;
        certificate.ApprovedByUserId = currentUser.UserId;
        certificate.ApprovedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        return ToDto(certificate, profile);
    }

    public async Task<CertificateDto> IssueAsync(int internProfileId, CancellationToken ct)
    {
        var (certificate, profile) = await LoadCertificateAsync(internProfileId, ct);
        if (certificate.Status != CertificateStatus.Approved)
        {
            throw new ConflictException("Only an approved certificate can be issued.");
        }

        certificate.Status = CertificateStatus.Issued;
        certificate.IssuedByUserId = currentUser.UserId;
        certificate.IssuedAtUtc = clock.UtcNow;
        certificate.IssueDate = clock.TodayInPakistan;
        await db.SaveChangesAsync(ct);

        await notifications.NotifyUserAsync(profile.UserId, NotificationTemplates.CertificateIssued, new Dictionary<string, object?>(), ct);

        return ToDto(certificate, profile);
    }

    public async Task<CertificateDto> UploadAsync(int internProfileId, UploadCertificateRequest request, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);
        var certificate = await db.Certificates.FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);

        // A Mentor can fix/replace a certificate up until it's Issued - past that point it's a
        // final, handed-out document and only Admin may touch it.
        if (certificate?.Status == CertificateStatus.Issued && currentUser.Role == UserRole.Mentor)
        {
            throw new ForbiddenException("An issued certificate can only be edited by an administrator.");
        }

        var storedFile = await fileStorage.SaveAsync(new FileSaveRequest(
            request.Content, request.FileName, request.ContentType,
            FileCategory.GeneratedCertificate, profile.UserId, currentUser.UserId), ct);

        var certificateNumber = certificate?.CertificateNumber ?? $"CERT-{profile.InternCode}";

        if (certificate is null)
        {
            certificate = new Certificate
            {
                InternProfileId = internProfileId,
                CertificateNumber = certificateNumber,
                CreatedAtUtc = clock.UtcNow,
            };
            db.Certificates.Add(certificate);
        }

        certificate.GeneratedFileId = storedFile.Id;
        certificate.RenderedBy = CertificateRenderedBy.BuiltInLayout;
        certificate.Status = CertificateStatus.PendingApproval;
        certificate.RejectionReason = null;
        await db.SaveChangesAsync(ct);

        return ToDto(certificate, profile);
    }

    public async Task DeleteAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);
        var certificate = await db.Certificates.FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct)
            ?? throw new NotFoundException(nameof(Certificate), internProfileId);

        if (certificate.Status == CertificateStatus.Issued && currentUser.Role == UserRole.Mentor)
        {
            throw new ForbiddenException("An issued certificate can only be deleted by an administrator.");
        }

        if (certificate.GeneratedFileId is { } fileId)
        {
            await fileStorage.SoftDeleteAsync(fileId, ct);
        }

        db.Certificates.Remove(certificate);
        await db.SaveChangesAsync(ct);
    }

    private async Task<(Certificate Certificate, InternProfile Profile)> LoadCertificateAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department).FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        var certificate = await db.Certificates.FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct)
            ?? throw new NotFoundException(nameof(Certificate), internProfileId);
        return (certificate, profile);
    }

    private async Task<InternProfile> LoadProfileWithScopeCheckAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await db.InternProfiles
            .Include(p => p.User).ThenInclude(u => u.Department)
            .Include(p => p.Mentor)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        if (currentUser.Role == UserRole.Mentor && profile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only manage certificates for your own interns.");
        }
        return profile;
    }

    private static CertificateDto ToDto(Certificate? c, InternProfile profile) => new(
        profile.Id, profile.User.FullName, profile.InternCode, profile.User.Department?.Name,
        c?.CertificateNumber, (c?.Status ?? CertificateStatus.Locked).ToString(),
        c?.GeneratedFileId, c?.IssueDate, c?.RejectionReason);
}
