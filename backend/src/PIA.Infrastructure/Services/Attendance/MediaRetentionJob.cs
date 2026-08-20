using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Permanently purges attendance selfies/challenge frames once their retention window
/// (AttendanceMedia.RetentionExpiresAtUtc, set at capture time from AttendanceOptions.SelfieRetentionDays)
/// has passed. AttendanceMedia rows are never deleted themselves (they remain the audit/forensic
/// record - hashes, dimensions, phash for replay detection) - only the underlying image bytes are
/// purged via IFileStorage.PurgeAsync, with PurgedAtUtc marking that this row's file is gone.
/// </summary>
public sealed class MediaRetentionJob(PiaDbContext db, IFileStorage fileStorage, IClock clock) : IMediaRetentionJob
{
    public async Task<int> RunAsync(JobTrigger triggeredBy, CancellationToken ct)
    {
        var startedAt = clock.UtcNow;

        var expired = await db.AttendanceMedia
            .Where(m => m.PurgedAtUtc == null && m.RetentionExpiresAtUtc <= startedAt)
            .ToListAsync(ct);

        var purged = 0;
        foreach (var media in expired)
        {
            var storedFile = await db.StoredFiles.FirstOrDefaultAsync(f => f.StorageKey == media.StorageKey, ct);
            if (storedFile is not null)
            {
                await fileStorage.PurgeAsync(storedFile.Id, ct);
            }

            media.PurgedAtUtc = clock.UtcNow;
            purged++;
        }

        if (purged > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        db.JobRuns.Add(new JobRun
        {
            JobName = "MediaRetention",
            StartedAtUtc = startedAt,
            FinishedAtUtc = clock.UtcNow,
            Succeeded = true,
            ItemsProcessed = purged,
            TriggeredBy = triggeredBy,
        });
        await db.SaveChangesAsync(ct);

        return purged;
    }
}
