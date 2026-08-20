using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PIA.Application.Abstractions;
using PIA.Domain.Enums;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>Fires once daily at 23:05 PKT - late enough that a same-day arrival/departure has
/// almost certainly already been marked, matching the plan's day-end cutoff.</summary>
public sealed class AutoAbsentBackgroundService(IServiceScopeFactory scopeFactory, IClock clock, ILogger<AutoAbsentBackgroundService> logger)
    : BackgroundService
{
    private static readonly TimeSpan RunTimeLocal = new(23, 5, 0);

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
                var job = scope.ServiceProvider.GetRequiredService<IAutoAbsentJob>();
                var todayPk = clock.TodayInPakistan;
                var processed = await job.RunAsync(todayPk, JobTrigger.Schedule, stoppingToken);
                logger.LogInformation("AutoAbsent job marked {Count} intern(s) absent for {Date}.", processed, todayPk);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "AutoAbsent job failed.");
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
