namespace PIA.Application.Abstractions;

public sealed record RenderedEmail(string Subject, string Html);

public interface IEmailTemplateRenderer
{
    Task<RenderedEmail> RenderAsync(string templateKey, IReadOnlyDictionary<string, object?> model, CancellationToken ct);
}
