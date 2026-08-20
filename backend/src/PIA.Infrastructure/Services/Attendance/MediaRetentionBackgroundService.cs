using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PIA.Application.Abstractions;
using PIA.Domain.Enums;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>Fires once daily at 02:00 PKT - a low-traffic maintenance window distinct from the
/// 23:05 AutoAbsent run.</summary>
public sealed class MediaRetentionBackgroundService(IServiceScopeFactory scopeFactory, IClock clock, ILogger<MediaRetentionBackgroundService> logger)
    : BackgroundService
{
    private static readonly TimeSpan RunTimeLocal = new(2, 0, 0);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeUntilNextRun(), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                using var scope = scopeFactory.CreateScope();
                var job = scope.ServiceProvider.GetRequiredService<IMediaRetentionJob>();
                var purged = await job.RunAsync(JobTrigger.Schedule, stoppingToken);
                logger.LogInformation("MediaRetention job purged {Count} expired media file(s).", purged);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "MediaRetention job failed.");
            }
        }
    }

    private TimeSpan TimeUntilNextRun()
    {
        var nowPk = clock.NowInPakistan.DateTime;
        var todayRun = nowPk.Date.Add(RunTimeLocal);
        var nextRun = nowPk <= todayRun ? todayRun : todayRun.AddDays(1);
        var delay = nextRun - nowPk;
        return delay < TimeSpan.Zero ? TimeSpan.FromMinutes(1) : delay;
    }
}
