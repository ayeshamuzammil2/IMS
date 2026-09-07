using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.IdCards;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.IdCards;

public sealed class IdCardService(
    PiaDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    IIdCardPdfRenderer renderer,
    INotificationService notifications,
    IClock clock) : IIdCardService
{
    public async Task<IdCardDto> GetMineAsync(CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns have an ID card.");
        var profile = await db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department).AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        var card = await db.IdCards.AsNoTracking().FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);

        return ToDto(card, profile);
    }

    public async Task<IdCardDto> GetForInternAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);
        var card = await db.IdCards.AsNoTracking().FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);
        return ToDto(card, profile);
    }

    public async Task<IReadOnlyList<IdCardDto>> ListAsync(int? departmentId, CancellationToken ct)
    {
        var cardQuery = db.IdCards.AsNoTracking()
            .Include(c => c.InternProfile).ThenInclude(p => p.User).ThenInclude(u => u.Department)
            .AsQueryable();

        if (currentUser.Role == UserRole.Mentor)
        {
            cardQuery = cardQuery.Where(c => c.InternProfile.MentorId == currentUser.UserId);
        }
        else if (departmentId is { } deptId)
        {
            cardQuery = cardQuery.Where(c => c.InternProfile.User.DepartmentId == deptId);
        }

        var cards = await cardQuery.OrderBy(c => c.InternProfile.User.Department!.Name).ThenBy(c => c.InternProfile.User.FullName).ToListAsync(ct);
        return cards.Select(c => ToDto(c, c.InternProfile)).ToList();
    }

    public async Task<IdCardDto> SubmitAsync(int internProfileId, SubmitIdCardRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Designation))
        {
            throw new BusinessRuleException(BusinessRuleCodes.DesignationRequired,
                "Designation is required before an ID card can be previewed or generated.");
        }

        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);

        // An ID card carries the intern's address/emergency contact/blood group - all of which
        // come from self-details. Generating one before the intern has submitted them would bake
        // in blank/stale data, so this must gate generation the same way the approved-photo check
        // does below.
        if (!profile.SelfDetailsSubmitted)
        {
            throw new BusinessRuleException(BusinessRuleCodes.IdCardSelfDetailsRequired,
                "Cannot generate an ID card: this intern has not submitted their self details yet.");
        }

        if (profile.ApprovedPhotoFileId is not { } photoFileId)
        {
            throw new BusinessRuleException(BusinessRuleCodes.IdCardNoPhoto,
                "Cannot generate an ID card: this intern has no approved profile photo yet.");
        }

        await using var photoStream = await fileStorage.OpenReadAsync(photoFileId, ct);
        using var photoBuffer = new MemoryStream();
        await photoStream.CopyToAsync(photoBuffer, ct);

        var pdfBytes = renderer.Render(
            profile.User.FullName, profile.User.Department?.Name ?? string.Empty,
            $"ID-{profile.InternCode}", profile.InternshipStartDate, profile.InternshipEndDate, photoBuffer.ToArray(),
            request.Designation, profile.User.Email, profile.EmergencyContactPhone);

        var storedFile = await fileStorage.SaveAsync(new FileSaveRequest(
            new MemoryStream(pdfBytes), $"idcard-{profile.InternCode}.pdf", "application/pdf",
            FileCategory.GeneratedIdCard, profile.UserId, currentUser.UserId), ct);

        var card = await db.IdCards.FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct);
        if (card is null)
        {
            card = new IdCard
            {
                InternProfileId = internProfileId,
                CardNumber = $"ID-{profile.InternCode}",
                CreatedAtUtc = clock.UtcNow,
            };
            db.IdCards.Add(card);
        }

        card.BloodGroup = profile.BloodGroup;
        card.EmergencyContactName = profile.EmergencyContactName;
        card.EmergencyContactPhone = profile.EmergencyContactPhone;
        card.Address = profile.Address;
        card.Designation = request.Designation;
        card.ValidUntil = profile.InternshipEndDate;
        card.GeneratedFileId = storedFile.Id;
        card.Status = IdCardStatus.PendingApproval;
        card.SubmittedAtUtc = clock.UtcNow;
        card.RejectionReason = null;
        await db.SaveChangesAsync(ct);

        return ToDto(card, profile);
    }

    public async Task<IdCardDto> ApproveAsync(int internProfileId, CancellationToken ct)
    {
        var (card, profile) = await LoadCardAsync(internProfileId, ct);
        if (card.Status != IdCardStatus.PendingApproval)
        {
            throw new ConflictException("Only an ID card pending approval can be approved.");
        }

        card.Status = IdCardStatus.Approved;
        card.ApprovedByUserId = currentUser.UserId;
        card.ApprovedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        return ToDto(card, profile);
    }

    public async Task<IdCardDto> IssueAsync(int internProfileId, CancellationToken ct)
    {
        var (card, profile) = await LoadCardAsync(internProfileId, ct);
        if (card.Status != IdCardStatus.Approved)
        {
            throw new ConflictException("Only an approved ID card can be issued.");
        }

        card.Status = IdCardStatus.Issued;
        card.IssuedByUserId = currentUser.UserId;
        card.IssuedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        await notifications.NotifyUserAsync(profile.UserId, NotificationTemplates.IdCardIssued, new Dictionary<string, object?>(), ct);

        return ToDto(card, profile);
    }

    public async Task DeleteAsync(int internProfileId, CancellationToken ct)
    {
        await LoadProfileWithScopeCheckAsync(internProfileId, ct);
        var card = await db.IdCards.FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct)
            ?? throw new NotFoundException(nameof(IdCard), internProfileId);

        if (card.Status == IdCardStatus.Issued && currentUser.Role == UserRole.Mentor)
        {
            throw new ForbiddenException("An issued ID card can only be deleted by an administrator.");
        }

        if (card.GeneratedFileId is { } fileId)
        {
            await fileStorage.SoftDeleteAsync(fileId, ct);
        }

        db.IdCards.Remove(card);
        await db.SaveChangesAsync(ct);
    }

    private async Task<(IdCard Card, InternProfile Profile)> LoadCardAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department).FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        var card = await db.IdCards.FirstOrDefaultAsync(c => c.InternProfileId == internProfileId, ct)
            ?? throw new NotFoundException(nameof(IdCard), internProfileId);
        return (card, profile);
    }

    private async Task<InternProfile> LoadProfileWithScopeCheckAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await db.InternProfiles
            .Include(p => p.User).ThenInclude(u => u.Department)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        if (currentUser.Role == UserRole.Mentor && profile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only manage ID cards for your own interns.");
        }
        return profile;
    }

    private static IdCardDto ToDto(IdCard? c, InternProfile profile) => new(
        profile.Id, profile.User.FullName, profile.InternCode, profile.User.Department?.Name,
        c?.CardNumber, (c?.Status ?? IdCardStatus.Draft).ToString(),
        c?.GeneratedFileId, c?.ValidUntil, c?.RejectionReason,
        c?.Designation, profile.User.Email, c?.EmergencyContactPhone ?? profile.EmergencyContactPhone,
        profile.ApprovedPhotoFileId);
}