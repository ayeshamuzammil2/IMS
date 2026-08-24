using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;
using PIA.Application.Options;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Attendance;

public sealed class AttendanceReviewService(
    PiaDbContext db,
    ICurrentUser currentUser,
    ICorrelationContext correlation,
    IClock clock,
    IOptions<AttendanceOptions> attendanceOptions) : IAttendanceReviewService
{
    public async Task<IReadOnlyList<ReviewQueueItemDto>> GetPendingReviewsAsync(CancellationToken ct)
    {
        var query = db.AttendanceDays.AsNoTracking()
            .Include(d => d.InternProfile).ThenInclude(p => p.User)
            .Where(d => d.RequiresReview && d.VoidedAtUtc == null);

        if (currentUser.Role == UserRole.Mentor)
        {
            query = query.Where(d => d.InternProfile.MentorId == currentUser.UserId);
        }

        var days = await query.OrderBy(d => d.WorkDate).ToListAsync(ct);
        var dayIds = days.Select(d => d.Id).ToList();

        var flagsByDay = await db.AttendanceVerificationAttempts.AsNoTracking()
            .Where(a => a.AttendanceDayId != null && dayIds.Contains(a.AttendanceDayId.Value))
            .ToListAsync(ct);

        return days.Select(d =>
        {
            var flags = flagsByDay.Where(a => a.AttendanceDayId == d.Id)
                .SelectMany(a => string.IsNullOrEmpty(a.FlagsJson) ? [] : JsonSerializer.Deserialize<List<string>>(a.FlagsJson) ?? [])
                .Distinct()
                .ToList();

            return new ReviewQueueItemDto(
                d.Id, d.InternProfileId, d.InternProfile.User.FullName, d.InternProfile.InternCode, d.WorkDate,
                null, d.ArrivalAtUtc, null, d.DepartureAtUtc,
                d.ArrivalDistanceM ?? d.DepartureDistanceM, (d.ArrivalGeofence ?? d.DepartureGeofence)?.ToString(),
                flags,
                d.InternProfile.ProfilePhotoStatus == ProfilePhotoStatus.Approved &&
                d.InternProfile.FaceEnrollmentStatus == FaceEnrollmentStatus.Active);
        }).ToList();
    }

    public async Task DecideReviewAsync(long attendanceDayId, ReviewDecisionRequest request, CancellationToken ct)
    {
        var day = await db.AttendanceDays.Include(d => d.InternProfile)
            .FirstOrDefaultAsync(d => d.Id == attendanceDayId, ct)
            ?? throw new NotFoundException(nameof(AttendanceDay), attendanceDayId);

        if (currentUser.Role == UserRole.Mentor && day.InternProfile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only review attendance for your own interns.");
        }

        var now = clock.UtcNow;
        if (request.Approve)
        {
            day.RequiresReview = false;
            day.ReviewedByUserId = currentUser.UserId;
            day.ReviewedAtUtc = now;
        }
        else
        {
            day.VoidedAtUtc = now;
            day.VoidedByUserId = currentUser.UserId;
            day.VoidReason = string.IsNullOrWhiteSpace(request.Note) ? "Rejected on mentor/admin review." : request.Note;
            day.Status = AttendanceStatus.Absent;
            day.RequiresReview = false;
            day.ReviewedByUserId = currentUser.UserId;
            day.ReviewedAtUtc = now;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<AttendanceOverrideDto> RequestOverrideAsync(int internProfileId, RequestOverrideRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<AttendanceEventType>(request.EventType, true, out var eventType))
        {
            throw new ValidationException("eventType", "Must be 'Arrival' or 'Departure'.");
        }

        var profile = await db.InternProfiles.Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == internProfileId, ct)
            ?? throw new NotFoundException(nameof(InternProfile), internProfileId);

        if (currentUser.Role == UserRole.Mentor && profile.MentorId != currentUser.UserId)
        {
            throw new ForbiddenException("You can only request overrides for your own interns.");
        }

        var monthStart = new DateOnly(request.WorkDate.Year, request.WorkDate.Month, 1);
        var monthEnd = monthStart.AddMonths(1);
        var approvedThisMonth = await db.AttendanceOverrides.CountAsync(o =>
            o.InternProfileId == internProfileId && o.Decision == "Approved" &&
            o.DatePk >= monthStart && o.DatePk < monthEnd, ct);
        var quotaExceeded = approvedThisMonth >= attendanceOptions.Value.OverrideMonthlyQuota;

        var now = clock.UtcNow;
        var markedAtUtc = clock.ToUtc(request.WorkDate, request.MarkedAtLocalTime);

        var isAutoApproved = currentUser.Role == UserRole.Admin || !quotaExceeded;

        var overrideEntity = new AttendanceOverride
        {
            InternProfileId = internProfileId,
            DatePk = request.WorkDate,
            EventType = eventType,
            RequestedByUserId = currentUser.UserId,
            RequestedAtUtc = now,
            ReasonCode = request.ReasonCode,
            Justification = request.Justification,
            MarkedAtUtc = markedAtUtc,
            QuotaExceeded = quotaExceeded,
            ClientIp = correlation.IpAddress,
            UserAgent = correlation.UserAgent,
            Decision = isAutoApproved ? "Approved" : null,
            DecidedByUserId = isAutoApproved ? currentUser.UserId : null,
            DecidedByRole = isAutoApproved ? currentUser.Role.ToString() : null,
            DecidedAtUtc = isAutoApproved ? now : null,
        };
        db.AttendanceOverrides.Add(overrideEntity);
        await db.SaveChangesAsync(ct);

        if (isAutoApproved)
        {
            await ApplyOverrideToAttendanceDayAsync(overrideEntity, ct);
        }

        return ToDto(overrideEntity, profile.User.FullName);
    }

    public async Task<IReadOnlyList<AttendanceOverrideDto>> GetPendingOverridesAsync(CancellationToken ct)
    {
        var rows = await db.AttendanceOverrides.AsNoTracking()
            .Where(o => o.Decision == null)
            .OrderBy(o => o.RequestedAtUtc)
            .Join(db.InternProfiles.Include(p => p.User), o => o.InternProfileId, p => p.Id, (o, p) => new { Override = o, p.User.FullName })
            .ToListAsync(ct);

        return rows.Select(r => ToDto(r.Override, r.FullName)).ToList();
    }

    public async Task DecideOverrideAsync(long overrideId, DecideOverrideRequest request, CancellationToken ct)
    {
        var overrideEntity = await db.AttendanceOverrides.FirstOrDefaultAsync(o => o.Id == overrideId, ct)
            ?? throw new NotFoundException(nameof(AttendanceOverride), overrideId);

        if (overrideEntity.Decision is not null)
        {
            throw new ConflictException("This override request has already been decided.");
        }

        overrideEntity.Decision = request.Approve ? "Approved" : "Rejected";
        overrideEntity.DecidedByUserId = currentUser.UserId;
        overrideEntity.DecidedByRole = currentUser.Role.ToString();
        overrideEntity.DecidedAtUtc = clock.UtcNow;
        overrideEntity.AdminCountersignedByUserId = currentUser.UserId;
        await db.SaveChangesAsync(ct);

        if (request.Approve)
        {
            await ApplyOverrideToAttendanceDayAsync(overrideEntity, ct);
        }
    }

    private async Task ApplyOverrideToAttendanceDayAsync(AttendanceOverride overrideEntity, CancellationToken ct)
    {
        var day = await db.AttendanceDays.FirstOrDefaultAsync(
            d => d.InternProfileId == overrideEntity.InternProfileId && d.WorkDate == overrideEntity.DatePk, ct);

        if (day is null)
        {
            day = new AttendanceDay { InternProfileId = overrideEntity.InternProfileId, WorkDate = overrideEntity.DatePk };
            db.AttendanceDays.Add(day);
        }

        if (overrideEntity.EventType == AttendanceEventType.Arrival)
        {
            day.ArrivalAtUtc = overrideEntity.MarkedAtUtc;
            day.ArrivalSource = AttendanceSource.ManualOverride;
            day.ArrivalMode = VerificationMode.Manual;
            if (day.Status is AttendanceStatus.Absent or AttendanceStatus.Holiday) day.Status = AttendanceStatus.Present;
        }
        else
        {
            day.DepartureAtUtc = overrideEntity.MarkedAtUtc;
            day.DepartureSource = AttendanceSource.ManualOverride;
            day.DepartureMode = VerificationMode.Manual;
            day.WorkedMinutes = day.ArrivalAtUtc is { } arrivalAt ? (int)(overrideEntity.MarkedAtUtc - arrivalAt).TotalMinutes : null;
        }

        await db.SaveChangesAsync(ct);

        overrideEntity.AttendanceDayId = day.Id;
        await db.SaveChangesAsync(ct);
    }

    private static AttendanceOverrideDto ToDto(AttendanceOverride o, string internFullName) => new(
        o.Id, o.InternProfileId, internFullName, o.EventType.ToString(), o.ReasonCode, o.Justification,
        o.Decision, o.QuotaExceeded, o.RequestedAtUtc, o.MarkedAtUtc);
}
