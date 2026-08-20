using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Marks Absent any active intern, within their internship period, who has no AttendanceDay row
/// for the target date - skipping global and department-specific holidays. Idempotent: an intern
/// who already has a row for that date (Present/Late/Leave/Absent) is left untouched.
/// </summary>
public sealed class AutoAbsentJob(PiaDbContext db, IClock clock) : IAutoAbsentJob
{
    public async Task<int> RunAsync(DateOnly targetDatePk, JobTrigger triggeredBy, CancellationToken ct)
    {
        var startedAt = clock.UtcNow;

        var candidates = await db.InternProfiles.AsNoTracking()
            .Include(p => p.User)
            .Where(p => p.User.IsActive && p.InternshipStartDate <= targetDatePk && p.InternshipEndDate >= targetDatePk)
            .ToListAsync(ct);

        var created = 0;

        if (candidates.Count > 0)
        {
            var departmentIds = candidates.Select(p => p.User.DepartmentId).Where(id => id is not null).Select(id => id!.Value).Distinct().ToList();
            var holidays = await db.Holidays.AsNoTracking()
                .Where(h => h.Date == targetDatePk && (h.DepartmentId == null || departmentIds.Contains(h.DepartmentId.Value)))
                .ToListAsync(ct);
            var globalHoliday = holidays.Any(h => h.DepartmentId is null);
            var holidayDepartmentIds = holidays.Where(h => h.DepartmentId is not null).Select(h => h.DepartmentId!.Value).ToHashSet();

            var existingSet = (await db.AttendanceDays.AsNoTracking()
                .Where(d => d.WorkDate == targetDatePk)
                .Select(d => d.InternProfileId)
                .ToListAsync(ct)).ToHashSet();

            foreach (var profile in candidates)
            {
                if (existingSet.Contains(profile.Id)) continue;
                if (globalHoliday) continue;
                if (profile.User.DepartmentId is { } deptId && holidayDepartmentIds.Contains(deptId)) continue;

                db.AttendanceDays.Add(new AttendanceDay
                {
                    InternProfileId = profile.Id,
                    WorkDate = targetDatePk,
                    Status = AttendanceStatus.Absent,
                    MarkedBySystem = true,
                });
                created++;
            }

            if (created > 0)
            {
                await db.SaveChangesAsync(ct);
            }
        }

        db.JobRuns.Add(new JobRun
        {
            JobName = "AutoAbsent",
            StartedAtUtc = startedAt,
            FinishedAtUtc = clock.UtcNow,
            Succeeded = true,
            ItemsProcessed = created,
            TriggeredBy = triggeredBy,
        });
        await db.SaveChangesAsync(ct);

        return created;
    }
}
