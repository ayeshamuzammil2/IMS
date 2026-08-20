using PIA.Application.Abstractions;
using PIA.Domain.Exceptions;
using Scriban;

namespace PIA.Infrastructure.Services.Email;

public sealed class ScribanEmailTemplateRenderer : IEmailTemplateRenderer
{
    public Task<RenderedEmail> RenderAsync(string templateKey, IReadOnlyDictionary<string, object?> model, CancellationToken ct)
    {
        if (!EmailTemplates.Definitions.TryGetValue(templateKey, out var definition))
        {
            throw new BusinessRuleException("UNKNOWN_EMAIL_TEMPLATE", $"No email template registered for key '{templateKey}'.");
        }

        var subjectTemplate = Template.Parse(definition.SubjectTemplate);
        var subject = subjectTemplate.Render(model);

        var contentTemplate = Template.Parse(definition.BodyTemplate);
        var content = contentTemplate.Render(model);

        var layoutTemplate = Template.Parse(EmailTemplates.Layout);
        var html = layoutTemplate.Render(new Dictionary<string, object?> { ["content"] = content });

        return Task.FromResult(new RenderedEmail(subject, html));
    }
}
