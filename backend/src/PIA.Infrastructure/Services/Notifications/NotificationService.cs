using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Notifications;
using PIA.Domain.Entities;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;
using Scriban;

namespace PIA.Infrastructure.Services.Notifications;

public sealed class NotificationService(PiaDbContext db, IEmailQueue emailQueue, IEmailTemplateRenderer emailRenderer, IClock clock)
    : INotificationService
{
    public async Task NotifyUserAsync(int userId, NotificationTemplate template, IReadOnlyDictionary<string, object?> model, CancellationToken ct)
    {
        var recipient = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException(nameof(User), userId);

        var title = Template.Parse(template.TitleTemplate).Render(model);
        var body = Template.Parse(template.BodyTemplate).Render(model);

        db.Notifications.Add(new Notification
        {
            RecipientUserId = userId,
            Title = title,
            Body = body,
            Type = template.Type,
            Category = template.Category,
            ActionRoute = template.ActionRoute,
            IsRead = false,
            CreatedAtUtc = clock.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        if (template.EmailTemplateKey is not null)
        {
            var rendered = await emailRenderer.RenderAsync(template.EmailTemplateKey, model, ct);
            await emailQueue.EnqueueAsync(recipient.Email, recipient.FullName, rendered.Subject, rendered.Html, template.EmailTemplateKey, ct);
        }
    }
}
