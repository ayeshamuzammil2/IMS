using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Domain.Enums;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Email;

/// <summary>
/// Polls EmailOutboxMessage and sends via IEmailSender with exponential backoff. If SMTP isn't
/// configured, logs a warning at a reduced frequency instead of burning through retries - this is
/// the same honest fallback v1 had for forgot-password, generalized to every email.
/// </summary>
public sealed class EmailOutboxProcessor(IServiceScopeFactory scopeFactory, ILogger<EmailOutboxProcessor> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(15);
    private const int BatchSize = 20;
    private const int MaxAttempts = 6;
    private DateTime _lastUnconfiguredWarningUtc = DateTime.MinValue;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Unhandled error while processing the email outbox.");
            }

            try
            {
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PiaDbContext>();
        var emailOptions = scope.ServiceProvider.GetRequiredService<IOptions<EmailOptions>>().Value;
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();

        if (!emailOptions.IsConfigured)
        {
            if (clock.UtcNow - _lastUnconfiguredWarningUtc > TimeSpan.FromMinutes(10))
            {
                var pendingCount = await db.EmailOutboxMessages.CountAsync(m => m.Status == EmailOutboxStatus.Pending, ct);
                if (pendingCount > 0)
                {
                    logger.LogWarning(
                        "Email:Host is not configured - {Count} pending email(s) will not be sent until SMTP is set up (see database/README.md / user-secrets).",
                        pendingCount);
                }
                _lastUnconfiguredWarningUtc = clock.UtcNow;
            }
            return;
        }

        var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var now = clock.UtcNow;

        var batch = await db.EmailOutboxMessages
            .Where(m => m.Status == EmailOutboxStatus.Pending && m.NextAttemptAtUtc <= now)
            .OrderBy(m => m.NextAttemptAtUtc)
            .Take(BatchSize)
            .ToListAsync(ct);

        foreach (var message in batch)
        {
            try
            {
                await sender.SendAsync(message.ToAddress, message.ToName, message.Subject, message.HtmlBody, ct);
                message.Status = EmailOutboxStatus.Sent;
                message.SentAtUtc = clock.UtcNow;
            }
            catch (Exception ex)
            {
                message.AttemptCount++;
                message.LastError = ex.Message.Length > 1000 ? ex.Message[..1000] : ex.Message;

                if (message.AttemptCount >= MaxAttempts)
                {
                    message.Status = EmailOutboxStatus.Abandoned;
                    logger.LogError(ex, "Email {MessageId} to {ToAddress} abandoned after {Attempts} attempts.",
                        message.Id, message.ToAddress, message.AttemptCount);
                }
                else
                {
                    var backoffMinutes = Math.Pow(2, message.AttemptCount);
                    message.NextAttemptAtUtc = clock.UtcNow.AddMinutes(backoffMinutes);
                    logger.LogWarning(ex, "Email {MessageId} to {ToAddress} failed (attempt {Attempt}/{Max}), retrying in {Backoff} min.",
                        message.Id, message.ToAddress, message.AttemptCount, MaxAttempts, backoffMinutes);
                }
            }
        }

        if (batch.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }
    }
}
