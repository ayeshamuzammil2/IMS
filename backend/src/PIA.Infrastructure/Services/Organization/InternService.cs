using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Interns;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Domain.ValueObjects;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Organization;

public sealed class InternService(
    PiaDbContext db,
    ICurrentUser currentUser,
    IPasswordHasher hasher,
    ITempPasswordGenerator tempPasswordGenerator,
    IInternCodeGenerator codeGenerator,
    INotificationService notifications,
    IUserSecurityService security,
    IClock clock) : IInternService
{
    public async Task<IReadOnlyList<InternDto>> ListAsync(string? search, int? departmentId, int? mentorId, string? verificationStatus, bool? isActive, CancellationToken ct)
    {
        var query = db.InternProfiles.AsNoTracking()
            .Include(p => p.User).ThenInclude(u => u.Department)
            .Include(p => p.Mentor)
            .AsQueryable();

        if (currentUser.Role == UserRole.Mentor)
        {
            query = query.Where(p => p.MentorId == currentUser.UserId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p => p.User.FullName.Contains(term) || p.User.Email.Contains(term) || p.InternCode.Contains(term));
        }
        if (departmentId is { } deptId)
        {
            query = query.Where(p => p.User.DepartmentId == deptId);
        }
        if (mentorId is { } mid)
        {
            query = query.Where(p => p.MentorId == mid);
        }
        if (!string.IsNullOrWhiteSpace(verificationStatus) && Enum.TryParse<VerificationStatus>(verificationStatus, true, out var status))
        {
            query = query.Where(p => p.VerificationStatus == status);
        }
        if (isActive is { } active)
        {
            query = query.Where(p => p.User.IsActive == active);
        }

        var profiles = await query.OrderBy(p => p.User.FullName).ToListAsync(ct);
        return profiles.Select(ToDto).ToList();
    }

    public async Task<InternDto> GetAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await FindProfileAsync(internProfileId, ct);
        EnsureMentorCanAccess(profile);
        return ToDto(profile);
    }

    public async Task<InternDto> CreateAsync(CreateInternRequest request, CancellationToken ct)
    {
        var email = EmailAddress.Parse(request.Email);
        var cnic = Cnic.Parse(request.Cnic);

        var mentor = await ResolveEffectiveMentorAsync(request.MentorId, ct);
        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == mentor.DepartmentId, ct)
            ?? throw new BusinessRuleException("DEPARTMENT_NOT_FOUND", "The mentor's department was not found or is inactive.");

        if (await db.Users.AnyAsync(u => u.Email == email.Value, ct))
        {
            throw new ConflictException($"An account with email '{email.Value}' already exists.");
        }
        if (await db.Users.AnyAsync(u => u.Cnic == cnic.Value, ct))
        {
            throw new ConflictException("An account with this CNIC already exists.");
        }

        var internCode = await codeGenerator.GenerateAsync(department.Id, department.Code, ct);
        var tempPassword = tempPasswordGenerator.Generate();

        var user = new User
        {
            Role = UserRole.Intern,
            FullName = request.FullName,
            Email = email.Value,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : PakistanPhone.Parse(request.Phone).Value,
            Cnic = cnic.Value,
            PasswordHash = hasher.Hash(tempPassword),
            MustResetPassword = true,
            DepartmentId = department.Id,
            IsActive = true,
            CreatedAtUtc = clock.UtcNow,
            Department = department,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        var profile = new InternProfile
        {
            UserId = user.Id,
            MentorId = mentor.Id,
            InternCode = internCode,
            InternshipStartDate = request.InternshipStartDate,
            InternshipEndDate = request.InternshipEndDate,
            DailyStartTime = request.DailyStartTime,
            DailyEndTime = request.DailyEndTime,
            UniversityName = request.UniversityName,
            DegreeProgram = request.DegreeProgram,
            CreatedAtUtc = clock.UtcNow,
        };
        db.InternProfiles.Add(profile);
        await db.SaveChangesAsync(ct);

        await notifications.NotifyUserAsync(user.Id, NotificationTemplates.AccountCreatedIntern, new Dictionary<string, object?>
        {
            ["full_name"] = user.FullName,
            ["mentor_name"] = mentor.FullName,
            ["department_name"] = department.Name,
            ["start_date"] = request.InternshipStartDate.ToString("d MMM yyyy"),
            ["end_date"] = request.InternshipEndDate.ToString("d MMM yyyy"),
            ["daily_start_time"] = request.DailyStartTime.ToString("h:mm tt"),
            ["daily_end_time"] = request.DailyEndTime.ToString("h:mm tt"),
            ["temp_password"] = tempPassword,
        }, ct);

        profile.User = user;
        profile.Mentor = mentor;
        return ToDto(profile);
    }

    public async Task<InternDto> UpdateAsync(int internProfileId, UpdateInternRequest request, CancellationToken ct)
    {
        var profile = await db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department).Include(p => p.Mentor)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        EnsureMentorCanAccess(profile);

        profile.User.FullName = request.FullName;
        profile.User.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : PakistanPhone.Parse(request.Phone).Value;
        profile.InternshipStartDate = request.InternshipStartDate;
        profile.InternshipEndDate = request.InternshipEndDate;
        profile.DailyStartTime = request.DailyStartTime;
        profile.DailyEndTime = request.DailyEndTime;
        profile.UniversityName = request.UniversityName;
        profile.DegreeProgram = request.DegreeProgram;

        if (currentUser.Role == UserRole.Admin && request.MentorId is { } newMentorId && newMentorId != profile.MentorId)
        {
            var newMentor = await db.Users.Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.Id == newMentorId && u.Role == UserRole.Mentor && u.IsActive, ct)
                ?? throw new BusinessRuleException("MENTOR_NOT_FOUND", "Selected mentor was not found or is inactive.");
            profile.MentorId = newMentor.Id;
            profile.User.DepartmentId = newMentor.DepartmentId;
            profile.User.Department = newMentor.Department;
            profile.Mentor = newMentor;
        }

        await db.SaveChangesAsync(ct);
        return ToDto(profile);
    }

    public async Task DeleteAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await db.InternProfiles.Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        EnsureMentorCanAccess(profile);

        var hasActivity =
            await db.AttendanceDays.AnyAsync(a => a.InternProfileId == internProfileId, ct) ||
            await db.InternDocuments.AnyAsync(d => d.InternProfileId == internProfileId, ct) ||
            await db.FaceTemplates.AnyAsync(f => f.InternProfileId == internProfileId, ct) ||
            await db.GithubSubmissions.AnyAsync(g => g.InternProfileId == internProfileId, ct) ||
            await db.ProjectAssignments.AnyAsync(a => a.InternProfileId == internProfileId, ct);

        if (hasActivity)
        {
            throw new ConflictException("This intern already has attendance, documents, or other activity recorded. Deactivate the account instead of deleting it.");
        }

        db.InternProfiles.Remove(profile);
        db.Users.Remove(profile.User);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeactivateAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await FindProfileAsync(internProfileId, ct);
        EnsureMentorCanAccess(profile);

        profile.User.IsActive = false;
        profile.User.DeactivatedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        await security.InvalidateAsync(profile.UserId, "Intern deactivated", ct);

        await notifications.NotifyUserAsync(profile.UserId, NotificationTemplates.AccountDeactivated,
            new Dictionary<string, object?> { ["full_name"] = profile.User.FullName }, ct);
    }

    public async Task ReactivateAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await FindProfileAsync(internProfileId, ct);
        EnsureMentorCanAccess(profile);

        profile.User.IsActive = true;
        profile.User.DeactivatedAtUtc = null;
        await db.SaveChangesAsync(ct);
    }

    public async Task ResetPasswordAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await FindProfileAsync(internProfileId, ct);
        EnsureMentorCanAccess(profile);

        var tempPassword = tempPasswordGenerator.Generate();
        profile.User.PasswordHash = hasher.Hash(tempPassword);
        profile.User.MustResetPassword = true;
        profile.User.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync(ct);
        await security.InvalidateAsync(profile.UserId, "Password reset by admin/mentor", ct);

        await notifications.NotifyUserAsync(profile.UserId, NotificationTemplates.PasswordResetByAdmin, new Dictionary<string, object?>
        {
            ["full_name"] = profile.User.FullName,
            ["temp_password"] = tempPassword,
        }, ct);
    }

    private async Task<User> ResolveEffectiveMentorAsync(int? requestedMentorId, CancellationToken ct)
    {
        if (currentUser.Role == UserRole.Mentor)
        {
            return await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct)
                ?? throw new NotFoundException(nameof(User), currentUser.UserId);
        }

        if (requestedMentorId is not { } mentorId)
        {
            throw new BusinessRuleException("MENTOR_REQUIRED", "A mentor must be selected for this intern.");
        }

        return await db.Users.FirstOrDefaultAsync(u => u.Id == mentorId && u.Role == UserRole.Mentor && u.IsActive, ct)
            ?? throw new BusinessRuleException("MENTOR_NOT_FOUND", "Selected mentor was not found or is inactive.");
    }

    private void EnsureMentorCanAccess(InternProfile profile)
    {
        if (currentUser.Role == UserRole.Mentor && profile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only manage interns assigned to you.");
        }
    }

    private async Task<InternProfile> FindProfileAsync(int internProfileId, CancellationToken ct) =>
        await db.InternProfiles.Include(p => p.User).ThenInclude(u => u.Department).Include(p => p.Mentor)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
        ?? throw new NotFoundException(nameof(InternProfile), internProfileId);

    private static InternDto ToDto(InternProfile p) => new(
        p.Id, p.UserId, p.User.FullName, p.User.Email, p.User.Phone, p.User.Cnic,
        p.InternCode, p.User.DepartmentId ?? 0, p.User.Department?.Name ?? string.Empty,
        p.MentorId, p.Mentor.FullName,
        p.InternshipStartDate, p.InternshipEndDate, p.DailyStartTime, p.DailyEndTime,
        p.UniversityName, p.DegreeProgram,
        p.VerificationStatus.ToString(), p.User.IsActive);
}
