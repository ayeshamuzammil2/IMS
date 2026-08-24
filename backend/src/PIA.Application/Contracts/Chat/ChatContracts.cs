namespace PIA.Application.Contracts.Chat;

/// <summary>One row per valid counterpart for the current user (their mentor for an Intern, every
/// Admin for a Mentor, every Mentor for an Admin) - not just counterparts with existing history, so
/// "Contact Admin"/"Contact Mentor" always has someone to reach even before the first message.</summary>
public sealed record ChatContactDto(
    int UserId,
    string FullName,
    string Email,
    string Role,
    string? LastMessageBody,
    DateTime? LastMessageAtUtc,
    int UnreadCount);

public sealed record ChatMessageDto(
    long Id,
    int SenderUserId,
    int RecipientUserId,
    string Body,
    DateTime SentAtUtc,
    bool IsMine);

public sealed record SendChatMessageRequest(string Body);
