namespace PIA.Domain.Entities;

/// <summary>Polling-based chat (no SignalR/WebSockets) between an Intern and their own Mentor, or a
/// Mentor and Admin - see ChatService for the exact allowed-pair rules. Direction is derived from
/// Sender/Recipient, not a separate Conversation entity, since every allowed pair is 1:1.</summary>
public class ChatMessage
{
    public long Id { get; set; }
    public int SenderUserId { get; set; }
    public User Sender { get; set; } = null!;
    public int RecipientUserId { get; set; }
    public User Recipient { get; set; } = null!;
    public required string Body { get; set; }
    public DateTime SentAtUtc { get; set; }
    public DateTime? ReadAtUtc { get; set; }
}
