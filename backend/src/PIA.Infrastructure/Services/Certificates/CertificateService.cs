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

        return await ToDtoAsync(certificate, profile, ct);
    }

    public async Task<CertificateDto> GetForInternAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);
        var certificate = await db.Certificates.AsNoTracking().FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);
        return await ToDtoAsync(certificate, profile, ct);
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
        var percentages = await ComputeAttendancePercentagesAsync(certificates.Select(c => c.InternProfile).ToList(), ct);
        return certificates.Select(c => BuildDto(c, c.InternProfile, percentages[c.InternProfileId])).ToList();
    }

    public async Task<CertificateDto> GenerateAsync(int internProfileId, GenerateCertificateRequest request, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);

        if (profile.VerificationStatus != VerificationStatus.Verified || clock.TodayInPakistan < profile.InternshipEndDate)
        {
            throw new BusinessRuleException(BusinessRuleCodes.CertificateNotEligible,
                "This intern is not yet eligible for a certificate - verification must be complete and the internship period must have ended.");
        }

        if (profile.GithubStatus != GithubStatus.Approved)
        {
            throw new BusinessRuleException(BusinessRuleCodes.CertificateGithubNotApproved,
                "This intern is not yet eligible for a certificate - their GitHub repository must be approved by their mentor first.");
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

        return await ToDtoAsync(certificate, profile, ct);
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

        return await ToDtoAsync(certificate, profile, ct);
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

        return await ToDtoAsync(certificate, profile, ct);
    }

    public async Task<CertificateDto> UploadAsync(int internProfileId, UploadCertificateRequest request, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);

        if (profile.GithubStatus != GithubStatus.Approved)
        {
            throw new BusinessRuleException(BusinessRuleCodes.CertificateGithubNotApproved,
                "This intern is not yet eligible for a certificate - their GitHub repository must be approved by their mentor first.");
        }

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

        return await ToDtoAsync(certificate, profile, ct);
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

    private async Task<CertificateDto> ToDtoAsync(Certificate? c, InternProfile profile, CancellationToken ct)
    {
        var percentages = await ComputeAttendancePercentagesAsync(new[] { profile }, ct);
        return BuildDto(c, profile, percentages[profile.Id]);
    }

    /// <summary>Attendance percentage per intern profile over their own internship-to-date window
    /// (Present+Late / Present+Late+Absent - holidays and approved leave don't count against
    /// them). Batched into one query regardless of how many profiles are asked for, so ListAsync
    /// doesn't pay an N+1 cost per certificate row.</summary>
    private async Task<Dictionary<int, double?>> ComputeAttendancePercentagesAsync(IReadOnlyList<InternProfile> profiles, CancellationToken ct)
    {
        var ids = profiles.Select(p => p.Id).ToList();
        var rows = await db.AttendanceDays.AsNoTracking()
            .Where(d => ids.Contains(d.InternProfileId))
            .Select(d => new { d.InternProfileId, d.WorkDate, d.Status })
            .ToListAsync(ct);

        var result = new Dictionary<int, double?>();
        var today = clock.TodayInPakistan;
        foreach (var profile in profiles)
        {
            var endInclusive = today < profile.InternshipEndDate ? today : profile.InternshipEndDate;
            var relevant = rows.Where(r => r.InternProfileId == profile.Id
                    && r.WorkDate >= profile.InternshipStartDate && r.WorkDate <= endInclusive
                    && r.Status != AttendanceStatus.Holiday && r.Status != AttendanceStatus.Leave)
                .ToList();

            result[profile.Id] = relevant.Count == 0
                ? null
                : Math.Round(relevant.Count(r => r.Status is AttendanceStatus.Present or AttendanceStatus.Late) * 100.0 / relevant.Count, 1);
        }
        return result;
    }

    /// <summary>Short, auto-derived performance remark shown next to the certificate - purely a
    /// display convenience computed from attendance percentage, not stored anywhere.</summary>
    private static string? DeriveRemark(double? percentage) => percentage switch
    {
        null => "Attendance record not yet available.",
        >= 95 => "Excellent attendance throughout the internship.",
        >= 85 => "Very good attendance record.",
        >= 75 => "Satisfactory attendance.",
        >= 60 => "Attendance was below expectations.",
        _ => "Attendance record needs significant improvement.",
    };

    private static CertificateDto BuildDto(Certificate? c, InternProfile profile, double? attendancePercentage) => new(
        profile.Id, profile.User.FullName, profile.InternCode, profile.User.Department?.Name,
        c?.CertificateNumber, (c?.Status ?? CertificateStatus.Locked).ToString(),
        c?.GeneratedFileId, c?.IssueDate, c?.RejectionReason,
        attendancePercentage, DeriveRemark(attendancePercentage));
}
