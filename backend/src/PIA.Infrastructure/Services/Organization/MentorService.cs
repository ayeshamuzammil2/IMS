using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Mentors;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Domain.ValueObjects;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Organization;

public sealed class MentorService(
    PiaDbContext db,
    IPasswordHasher hasher,
    ITempPasswordGenerator tempPasswordGenerator,
    INotificationService notifications,
    IUserSecurityService security,
    IClock clock) : IMentorService
{
    public async Task<IReadOnlyList<MentorDto>> ListAsync(string? search, int? departmentId, bool? isActive, CancellationToken ct)
    {
        var query = db.Users.AsNoTracking().Include(u => u.Department).Where(u => u.Role == UserRole.Mentor);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u => u.FullName.Contains(term) || u.Email.Contains(term));
        }
        if (departmentId is { } deptId)
        {
            query = query.Where(u => u.DepartmentId == deptId);
        }
        if (isActive is { } active)
        {
            query = query.Where(u => u.IsActive == active);
        }

        var mentors = await query.OrderBy(u => u.FullName).ToListAsync(ct);
        var mentorIds = mentors.Select(m => m.Id).ToList();
        var internCounts = await db.InternProfiles.AsNoTracking()
            .Where(p => mentorIds.Contains(p.MentorId))
            .GroupBy(p => p.MentorId)
            .Select(g => new { MentorId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.MentorId, g => g.Count, ct);

        return mentors.Select(m => ToDto(m, internCounts.GetValueOrDefault(m.Id))).ToList();
    }

    public async Task<MentorDto> GetAsync(int id, CancellationToken ct)
    {
        var mentor = await db.Users.AsNoTracking().Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor, ct)
            ?? throw new NotFoundException(nameof(User), id);

        var internCount = await db.InternProfiles.CountAsync(p => p.MentorId == id, ct);
        return ToDto(mentor, internCount);
    }

    public async Task<MentorDto> CreateAsync(CreateMentorRequest request, CancellationToken ct)
    {
        var email = EmailAddress.Parse(request.Email);
        var cnic = Cnic.Parse(request.Cnic);

        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId && d.IsActive, ct)
            ?? throw new BusinessRuleException("DEPARTMENT_NOT_FOUND", "Selected department was not found or is inactive.");

        if (await db.Users.AnyAsync(u => u.Email == email.Value, ct))
        {
            throw new ConflictException($"An account with email '{email.Value}' already exists.");
        }
        if (await db.Users.AnyAsync(u => u.Cnic == cnic.Value, ct))
        {
            throw new ConflictException("An account with this CNIC already exists.");
        }

        var tempPassword = tempPasswordGenerator.Generate();
        var mentor = new User
        {
            Role = UserRole.Mentor,
            FullName = request.FullName,
            Email = email.Value,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : PakistanPhone.Parse(request.Phone).Value,
            Cnic = cnic.Value,
            PasswordHash = hasher.Hash(tempPassword),
            MustResetPassword = true,
            DepartmentId = department.Id,
            IsActive = true,
            CreatedAtUtc = clock.UtcNow,
        };
        db.Users.Add(mentor);
        await db.SaveChangesAsync(ct);

        await notifications.NotifyUserAsync(mentor.Id, NotificationTemplates.AccountCreatedMentor, new Dictionary<string, object?>
        {
            ["full_name"] = mentor.FullName,
            ["department_name"] = department.Name,
            ["temp_password"] = tempPassword,
        }, ct);

        return ToDto(mentor, department.Name, 0);
    }

    public async Task<MentorDto> UpdateAsync(int id, UpdateMentorRequest request, CancellationToken ct)
    {
        var mentor = await db.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor, ct)
            ?? throw new NotFoundException(nameof(User), id);

        mentor.FullName = request.FullName;
        mentor.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : PakistanPhone.Parse(request.Phone).Value;
        await db.SaveChangesAsync(ct);

        var internCount = await db.InternProfiles.CountAsync(p => p.MentorId == id, ct);
        return ToDto(mentor, internCount);
    }

    public async Task DeactivateAsync(int id, CancellationToken ct)
    {
        var mentor = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor, ct)
            ?? throw new NotFoundException(nameof(User), id);

        var hasActiveInterns = await db.InternProfiles.AnyAsync(p => p.MentorId == id && p.User.IsActive, ct);
        if (hasActiveInterns)
        {
            throw new ConflictException("This mentor still has active interns assigned. Reassign them to another mentor first.");
        }

        mentor.IsActive = false;
        mentor.DeactivatedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        await security.InvalidateAsync(id, "Mentor deactivated", ct);

        await notifications.NotifyUserAsync(id, NotificationTemplates.AccountDeactivated,
            new Dictionary<string, object?> { ["full_name"] = mentor.FullName }, ct);
    }

    public async Task ReactivateAsync(int id, CancellationToken ct)
    {
        var mentor = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor, ct)
            ?? throw new NotFoundException(nameof(User), id);

        mentor.IsActive = true;
        mentor.DeactivatedAtUtc = null;
        await db.SaveChangesAsync(ct);
    }

    public async Task ResetPasswordAsync(int id, CancellationToken ct)
    {
        var mentor = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor, ct)
            ?? throw new NotFoundException(nameof(User), id);

        var tempPassword = tempPasswordGenerator.Generate();
        mentor.PasswordHash = hasher.Hash(tempPassword);
        mentor.MustResetPassword = true;
        mentor.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync(ct);
        await security.InvalidateAsync(id, "Password reset by admin", ct);

        await notifications.NotifyUserAsync(id, NotificationTemplates.PasswordResetByAdmin, new Dictionary<string, object?>
        {
            ["full_name"] = mentor.FullName,
            ["temp_password"] = tempPassword,
        }, ct);
    }

    public async Task TransferAsync(int id, TransferMentorRequest request, CancellationToken ct)
    {
        var mentor = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor, ct)
            ?? throw new NotFoundException(nameof(User), id);

        var newDepartment = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.NewDepartmentId && d.IsActive, ct)
            ?? throw new BusinessRuleException("DEPARTMENT_NOT_FOUND", "Selected department was not found or is inactive.");

        mentor.DepartmentId = newDepartment.Id;
        await db.SaveChangesAsync(ct);

        await notifications.NotifyUserAsync(id, NotificationTemplates.DepartmentTransferred,
            new Dictionary<string, object?> { ["department_name"] = newDepartment.Name }, ct);
    }

    private static MentorDto ToDto(User mentor, int internCount) =>
        ToDto(mentor, mentor.Department?.Name ?? string.Empty, internCount);

    private static MentorDto ToDto(User mentor, string departmentName, int internCount) => new(
        mentor.Id, mentor.FullName, mentor.Email, mentor.Phone, mentor.Cnic,
        mentor.DepartmentId ?? 0, departmentName, mentor.IsActive, internCount);
}
