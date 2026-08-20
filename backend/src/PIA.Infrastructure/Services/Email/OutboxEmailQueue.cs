using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Email;

/// <summary>
/// Writes to EmailOutboxMessage using the CALLER's scoped PiaDbContext. Callers enqueue AFTER
/// saving their own business change, so this SaveChangesAsync call flushes both together -
/// "intern created but no welcome email" and "email sent for a create that rolled back" both
/// become impossible. EmailOutboxProcessor (a separate BackgroundService) does the actual sending.
/// </summary>
public sealed class OutboxEmailQueue(PiaDbContext db, IClock clock) : IEmailQueue
{
    public async Task EnqueueAsync(string toAddress, string? toName, string subject, string htmlBody, string templateKey, CancellationToken ct)
    {
        db.EmailOutboxMessages.Add(new EmailOutboxMessage
        {
            Id = Guid.NewGuid(),
            ToAddress = toAddress,
            ToName = toName,
            Subject = subject,
            HtmlBody = htmlBody,
            TemplateKey = templateKey,
            Status = EmailOutboxStatus.Pending,
            AttemptCount = 0,
            NextAttemptAtUtc = clock.UtcNow,
            CreatedAtUtc = clock.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }
}
