using PIA.Application.Contracts.Chat;

namespace PIA.Application.Abstractions;

/// <summary>Polling-based chat, scoped to the current user via ICurrentUser. Allowed pairs:
/// Intern &lt;-&gt; their own Mentor, Mentor &lt;-&gt; any Admin. Every other pairing (including
/// Mentor-Intern, which is handled by the existing management screens, not chat) is rejected.</summary>
public interface IChatService
{
    Task<IReadOnlyList<ChatContactDto>> GetContactsAsync(CancellationToken ct);

    Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(int otherUserId, CancellationToken ct);

    Task<ChatMessageDto> SendAsync(int otherUserId, SendChatMessageRequest request, CancellationToken ct);
}
