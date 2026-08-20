using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using PIA.Application.Abstractions;
using PIA.Application.Options;

namespace PIA.Infrastructure.Services.Email;

public sealed class SmtpEmailSender(IOptions<EmailOptions> options) : IEmailSender
{
    public async Task SendAsync(string toAddress, string? toName, string subject, string htmlBody, CancellationToken ct)
    {
        var opts = options.Value;
        if (string.IsNullOrWhiteSpace(opts.Host))
        {
            // EmailOutboxProcessor already checks IsConfigured before calling this, so reaching
            // here with no host is a caller bug, not an expected runtime condition.
            throw new InvalidOperationException("Email:Host is not configured.");
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(opts.FromName, opts.FromAddress));
        message.To.Add(new MailboxAddress(toName ?? toAddress, toAddress));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var client = new SmtpClient();
        var secureOption = opts.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await client.ConnectAsync(opts.Host, opts.Port, secureOption, ct);
        if (!string.IsNullOrEmpty(opts.Username))
        {
            await client.AuthenticateAsync(opts.Username, opts.Password ?? string.Empty, ct);
        }
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
