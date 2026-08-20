using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Attendance;

public sealed class AttendanceQueryService(PiaDbContext db, ICurrentUser currentUser, IClock clock) : IAttendanceQueryService
{
    public async Task<IReadOnlyList<TeamAttendanceRowDto>> GetTeamTodayAsync(int? departmentId, int? mentorId, CancellationToken ct)
    {
        var todayPk = clock.TodayInPakistan;

        var query = db.InternProfiles.AsNoTracking().Include(p => p.User).Where(p => p.User.IsActive);

        if (currentUser.Role == UserRole.Mentor)
        {
            query = query.Where(p => p.MentorId == currentUser.UserId);
        }
        else
        {
            if (mentorId is { } mid)
            {
                query = query.Where(p => p.MentorId == mid);
            }
            if (departmentId is { } deptId)
            {
                query = query.Where(p => p.User.DepartmentId == deptId);
            }
        }

        var profiles = await query.OrderBy(p => p.User.FullName).ToListAsync(ct);
        var profileIds = profiles.Select(p => p.Id).ToList();

        var days = await db.AttendanceDays.AsNoTracking()
            .Where(d => profileIds.Contains(d.InternProfileId) && d.WorkDate == todayPk)
            .ToDictionaryAsync(d => d.InternProfileId, ct);

        var eventIds = days.Values
            .SelectMany(d => new long?[] { d.ArrivalEventId, d.DepartureEventId })
            .Where(id => id is not null)
            .Select(id => id!.Value)
            .ToList();
        var events = await db.AttendanceEvents.AsNoTracking()
            .Where(e => eventIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, ct);

        return profiles.Select(p =>
        {
            days.TryGetValue(p.Id, out var day);
            var arrivalSelfie = day?.ArrivalEventId is { } aId && events.TryGetValue(aId, out var aEvt) ? aEvt.SelfieFileId : null;
            var departureSelfie = day?.DepartureEventId is { } dId && events.TryGetValue(dId, out var dEvt) ? dEvt.SelfieFileId : null;

            return new TeamAttendanceRowDto(
                p.Id, p.User.FullName, p.InternCode,
                arrivalSelfie, day?.ArrivalAtUtc, day?.ArrivalDistanceM, day?.ArrivalAccuracyM, day?.IsLate ?? false, day?.ArrivalGeofence?.ToString(),
                departureSelfie, day?.DepartureAtUtc, day?.DepartureDistanceM, day?.DepartureAccuracyM, day?.IsEarlyLeave ?? false, day?.DepartureGeofence?.ToString(),
                day?.Status.ToString() ?? "NotMarked");
        }).ToList();
    }

    public async Task<IReadOnlyList<AttendanceHistoryRowDto>> GetHistoryAsync(
        DateOnly startDate, DateOnly endDate, int? departmentId, int? mentorId, CancellationToken ct)
    {
        IQueryable<InternProfile> query = db.InternProfiles.AsNoTracking().Include(p => p.User).ThenInclude(u => u.Department);

        if (currentUser.Role == UserRole.Mentor)
        {
            query = query.Where(p => p.MentorId == currentUser.UserId);
        }
        else
        {
            if (mentorId is { } mid) query = query.Where(p => p.MentorId == mid);
            if (departmentId is { } deptId) query = query.Where(p => p.User.DepartmentId == deptId);
        }

        var profiles = await query.ToDictionaryAsync(p => p.Id, ct);
        if (profiles.Count == 0) return [];

        var days = await db.AttendanceDays.AsNoTracking()
            .Where(d => profiles.Keys.Contains(d.InternProfileId) && d.WorkDate >= startDate && d.WorkDate <= endDate)
            .OrderByDescending(d => d.WorkDate)
            .ToListAsync(ct);

        return days.Select(d =>
        {
            var profile = profiles[d.InternProfileId];
            return new AttendanceHistoryRowDto(
                d.InternProfileId, profile.User.FullName, profile.InternCode, profile.User.Department?.Name ?? string.Empty,
                d.WorkDate, d.Status.ToString(),
                d.ArrivalAtUtc, d.IsLate, d.ArrivalSource?.ToString(),
                d.DepartureAtUtc, d.IsEarlyLeave, d.DepartureSource?.ToString());
        }).ToList();
    }
}
