namespace PIA.Application.Abstractions;

/// <summary>
/// Phase 1 placeholder: a minimal primitive so auth flows (forgot-password, welcome emails) are
/// structurally wired to email now. Phase 3 replaces the implementation with a durable
/// EmailOutboxMessage + MailKit + Scriban-templated pipeline behind this same interface -
/// call sites do not change.
/// </summary>
public interface IEmailQueue
{
    Task EnqueueAsync(string toAddress, string? toName, string subject, string htmlBody, string templateKey, CancellationToken ct);
}
