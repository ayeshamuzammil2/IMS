namespace PIA.Application.Options;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>Empty/null means email isn't configured yet - the outbox processor logs and defers rather than failing.</summary>
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string FromAddress { get; set; } = "no-reply@pia-internship.local";
    public string FromName { get; set; } = "PIA Internee Management";
    public bool UseStartTls { get; set; } = true;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(Username);
}
