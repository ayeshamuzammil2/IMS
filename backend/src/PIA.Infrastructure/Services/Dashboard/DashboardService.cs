using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Dashboard;
using PIA.Domain.Enums;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Dashboard;

public sealed class DashboardService(PiaDbContext db, ICurrentUser currentUser, IClock clock) : IDashboardService
{
    public async Task<DashboardSummaryDto> GetSummaryAsync(int? departmentId, CancellationToken ct)
    {
        var isMentor = currentUser.Role == UserRole.Mentor;
        var todayPk = clock.TodayInPakistan;

        var internQuery = db.InternProfiles.AsNoTracking()
            .Include(p => p.User).ThenInclude(u => u.Department)
            .Where(p => p.User.IsActive);
        if (isMentor)
        {
            internQuery = internQuery.Where(p => p.MentorId == currentUser.UserId);
        }
        else if (departmentId is { } deptId)
        {
            internQuery = internQuery.Where(p => p.User.DepartmentId == deptId);
        }

        var profiles = await internQuery.ToListAsync(ct);
        var profileIds = profiles.Select(p => p.Id).ToHashSet();

        var totalMentors = 0;
        var totalDepartments = 0;
        if (!isMentor)
        {
            totalMentors = await db.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Mentor && u.IsActive, ct);
            totalDepartments = await db.Departments.AsNoTracking().CountAsync(d => d.IsActive, ct);
        }

        var startDate = todayPk.AddDays(-6);
        var trendDays = await db.AttendanceDays.AsNoTracking()
            .Where(d => profileIds.Contains(d.InternProfileId) && d.WorkDate >= startDate && d.WorkDate <= todayPk)
            .ToListAsync(ct);

        var trend = new List<AttendanceTrendPointDto>();
        for (var date = startDate; date <= todayPk; date = date.AddDays(1))
        {
            var dayRows = trendDays.Where(d => d.WorkDate == date).ToList();
            trend.Add(new AttendanceTrendPointDto(
                date,
                dayRows.Count(d => d.Status == AttendanceStatus.Present),
                dayRows.Count(d => d.Status == AttendanceStatus.Late),
                dayRows.Count(d => d.Status == AttendanceStatus.Absent)));
        }

        var todayRows = trendDays.Where(d => d.WorkDate == todayPk).ToList();
        var presentToday = todayRows.Count(d => d.Status == AttendanceStatus.Present);
        var lateToday = todayRows.Count(d => d.Status == AttendanceStatus.Late);
        var absentToday = todayRows.Count(d => d.Status == AttendanceStatus.Absent);
        var onLeaveToday = todayRows.Count(d => d.Status == AttendanceStatus.Leave);

        var byDepartment = isMentor
            ? []
            : profiles
                .GroupBy(p => p.User.Department?.Name ?? "Unassigned")
                .Select(g => new DepartmentCountDto(g.Key, g.Count()))
                .OrderByDescending(d => d.Count)
                .ToList();

        var verificationBreakdown = profiles
            .GroupBy(p => p.VerificationStatus)
            .Select(g => new VerificationCountDto(g.Key.ToString(), g.Count()))
            .ToList();

        return new DashboardSummaryDto(
            profiles.Count, totalMentors, totalDepartments,
            presentToday, lateToday, absentToday, onLeaveToday,
            trend, byDepartment, verificationBreakdown);
    }
}
