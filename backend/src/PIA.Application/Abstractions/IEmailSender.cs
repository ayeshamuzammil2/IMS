namespace PIA.Application.Abstractions;

public interface IEmailSender
{
    /// <summary>Throws on failure - the caller (EmailOutboxProcessor) is responsible for retry/backoff.</summary>
    Task SendAsync(string toAddress, string? toName, string subject, string htmlBody, CancellationToken ct);
}
