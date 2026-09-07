using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Projects;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Projects;

public sealed class ProjectAssignmentService(
    PiaDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    INotificationService notifications,
    IClock clock) : IProjectAssignmentService
{
    public async Task<IReadOnlyList<ProjectAssignmentDto>> GetMineAsync(CancellationToken ct)
    {
        var internProfileId = currentUser.InternProfileId ?? throw new ForbiddenException("Only interns have project assignments.");
        var rows = await db.ProjectAssignments.AsNoTracking()
            .Where(p => p.InternProfileId == internProfileId)
            .OrderByDescending(p => p.AssignedAtUtc)
            .ToListAsync(ct);
        return rows.Select(r => ToDto(r, null, null)).ToList();
    }

    public async Task<IReadOnlyList<ProjectAssignmentDto>> GetForInternAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);
        var rows = await db.ProjectAssignments.AsNoTracking()
            .Where(p => p.InternProfileId == internProfileId)
            .OrderByDescending(p => p.AssignedAtUtc)
            .ToListAsync(ct);
        return rows.Select(r => ToDto(r, profile.User.FullName, profile.InternCode)).ToList();
    }

    public async Task<ProjectAssignmentDto> AssignAsync(int internProfileId, AssignProjectRequest request, CancellationToken ct)
    {
        var profile = await LoadProfileWithScopeCheckAsync(internProfileId, ct);

        Guid? fileId = null;
        if (request.Content is not null)
        {
            var stored = await fileStorage.SaveAsync(new FileSaveRequest(
                request.Content, request.FileName ?? "project-brief", request.ContentType, FileCategory.ProjectFile,
                profile.UserId, currentUser.UserId), ct);
            fileId = stored.Id;
        }

        var assignment = new ProjectAssignment
        {
            InternProfileId = internProfileId,
            AssignedByUserId = currentUser.UserId,
            Title = request.Title,
            Description = request.Description,
            FileId = fileId,
            DueDate = request.DueDate,
            Status = ProjectAssignmentStatus.Assigned,
            AssignedAtUtc = clock.UtcNow,
        };
        db.ProjectAssignments.Add(assignment);
        await db.SaveChangesAsync(ct);

        await notifications.NotifyUserAsync(profile.UserId, NotificationTemplates.ProjectAssigned,
            new Dictionary<string, object?> { ["title"] = request.Title }, ct);

        return ToDto(assignment, profile.User.FullName, profile.InternCode);
    }

    public async Task<ProjectAssignmentDto> UpdateAsync(int assignmentId, AssignProjectRequest request, CancellationToken ct)
    {
        var assignment = await db.ProjectAssignments.FirstOrDefaultAsync(a => a.Id == assignmentId, ct)
            ?? throw new NotFoundException(nameof(ProjectAssignment), assignmentId);

        // Same scope check as assigning/deleting: a Mentor may only edit assignments that belong
        // to their own mentees; Admin can edit any.
        var profile = await LoadProfileWithScopeCheckAsync(assignment.InternProfileId, ct);

        if (request.Content is not null)
        {
            if (assignment.FileId is not null)
            {
                await fileStorage.SoftDeleteAsync(assignment.FileId.Value, ct);
            }

            var stored = await fileStorage.SaveAsync(new FileSaveRequest(
                request.Content, request.FileName ?? "project-brief", request.ContentType, FileCategory.ProjectFile,
                profile.UserId, currentUser.UserId), ct);
            assignment.FileId = stored.Id;
        }

        assignment.Title = request.Title;
        assignment.Description = request.Description;
        assignment.DueDate = request.DueDate;
        await db.SaveChangesAsync(ct);

        return ToDto(assignment, profile.User.FullName, profile.InternCode);
    }

    public async Task DeleteAsync(int assignmentId, CancellationToken ct)
    {
        var assignment = await db.ProjectAssignments.FirstOrDefaultAsync(a => a.Id == assignmentId, ct)
            ?? throw new NotFoundException(nameof(ProjectAssignment), assignmentId);

        // Reuses the same scope check as assigning: a Mentor may only delete assignments that
        // belong to their own mentees; Admin can delete any.
        await LoadProfileWithScopeCheckAsync(assignment.InternProfileId, ct);

        if (assignment.FileId is not null)
        {
            await fileStorage.SoftDeleteAsync(assignment.FileId.Value, ct);
        }

        db.ProjectAssignments.Remove(assignment);
        await db.SaveChangesAsync(ct);
    }

    private async Task<InternProfile> LoadProfileWithScopeCheckAsync(int internProfileId, CancellationToken ct)
    {
        var profile = await db.InternProfiles.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);
        if (currentUser.Role == UserRole.Mentor && profile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only manage projects for your own interns.");
        }
        return profile;
    }

    private static ProjectAssignmentDto ToDto(ProjectAssignment a, string? internFullName, string? internCode) => new(
        a.Id, a.InternProfileId, internFullName, internCode, a.Title, a.Description, a.FileId, a.DueDate,
        a.Status.ToString(), a.AssignedAtUtc);
}
