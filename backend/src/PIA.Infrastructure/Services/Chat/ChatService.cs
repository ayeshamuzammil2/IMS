using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Chat;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Chat;

public sealed class ChatService(PiaDbContext db, ICurrentUser currentUser, IClock clock) : IChatService
{
    public async Task<IReadOnlyList<ChatContactDto>> GetContactsAsync(CancellationToken ct)
    {
        var contacts = await LoadEligibleContactsAsync(ct);
        if (contacts.Count == 0)
        {
            return [];
        }

        var contactIds = contacts.Select(c => c.Id).ToList();
        var relevant = await db.ChatMessages.AsNoTracking()
            .Where(m =>
                (m.SenderUserId == currentUser.UserId && contactIds.Contains(m.RecipientUserId)) ||
                (m.RecipientUserId == currentUser.UserId && contactIds.Contains(m.SenderUserId)))
            .ToListAsync(ct);

        return contacts.Select(c =>
        {
            var thread = relevant.Where(m => m.SenderUserId == c.Id || m.RecipientUserId == c.Id).ToList();
            var last = thread.OrderByDescending(m => m.SentAtUtc).FirstOrDefault();
            var unread = thread.Count(m => m.SenderUserId == c.Id && m.RecipientUserId == currentUser.UserId && m.ReadAtUtc is null);
            return new ChatContactDto(c.Id, c.FullName, c.Email, c.Role.ToString(), last?.Body, last?.SentAtUtc, unread);
        }).OrderByDescending(c => c.LastMessageAtUtc ?? DateTime.MinValue).ToList();
    }

    public async Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(int otherUserId, CancellationToken ct)
    {
        await EnsureAllowedPairAsync(otherUserId, ct);

        var messages = await db.ChatMessages
            .Where(m =>
                (m.SenderUserId == currentUser.UserId && m.RecipientUserId == otherUserId) ||
                (m.SenderUserId == otherUserId && m.RecipientUserId == currentUser.UserId))
            .OrderBy(m => m.SentAtUtc)
            .ToListAsync(ct);

        var unread = messages.Where(m => m.SenderUserId == otherUserId && m.ReadAtUtc is null).ToList();
        if (unread.Count > 0)
        {
            foreach (var m in unread) m.ReadAtUtc = clock.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return messages.Select(ToDto).ToList();
    }

    public async Task<ChatMessageDto> SendAsync(int otherUserId, SendChatMessageRequest request, CancellationToken ct)
    {
        var body = request.Body.Trim();
        if (string.IsNullOrEmpty(body))
        {
            throw new ValidationException("body", "Message cannot be empty.");
        }

        await EnsureAllowedPairAsync(otherUserId, ct);

        var message = new ChatMessage
        {
            SenderUserId = currentUser.UserId,
            RecipientUserId = otherUserId,
            Body = body,
            SentAtUtc = clock.UtcNow,
        };
        db.ChatMessages.Add(message);
        await db.SaveChangesAsync(ct);

        return ToDto(message);
    }

    private async Task<List<User>> LoadEligibleContactsAsync(CancellationToken ct)
    {
        switch (currentUser.Role)
        {
            case UserRole.Intern:
                var mentorId = await db.InternProfiles.AsNoTracking()
                    .Where(p => p.UserId == currentUser.UserId)
                    .Select(p => (int?)p.MentorId)
                    .FirstOrDefaultAsync(ct);
                if (mentorId is not { } mid) return [];
                var mentor = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == mid, ct);
                return mentor is null ? [] : [mentor];

            case UserRole.Mentor:
                return await db.Users.AsNoTracking()
                    .Where(u => u.Role == UserRole.Admin && u.IsActive)
                    .OrderBy(u => u.FullName)
                    .ToListAsync(ct);

            case UserRole.Admin:
                return await db.Users.AsNoTracking()
                    .Where(u => u.Role == UserRole.Mentor && u.IsActive)
                    .OrderBy(u => u.FullName)
                    .ToListAsync(ct);

            default:
                return [];
        }
    }

    private async Task EnsureAllowedPairAsync(int otherUserId, CancellationToken ct)
    {
        var otherUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == otherUserId, ct)
            ?? throw new NotFoundException(nameof(User), otherUserId);

        switch (currentUser.Role)
        {
            case UserRole.Intern:
                var mentorId = await db.InternProfiles.AsNoTracking()
                    .Where(p => p.UserId == currentUser.UserId)
                    .Select(p => (int?)p.MentorId)
                    .FirstOrDefaultAsync(ct);
                if (mentorId != otherUserId)
                {
                    throw new ForbiddenException("You can only message your own mentor.");
                }
                break;

            case UserRole.Mentor:
                if (otherUser.Role != UserRole.Admin)
                {
                    throw new ForbiddenException("Mentors can only message an Admin through chat.");
                }
                break;

            case UserRole.Admin:
                if (otherUser.Role != UserRole.Mentor)
                {
                    throw new ForbiddenException("Admins can only message a Mentor through chat.");
                }
                break;

            default:
                throw new ForbiddenException("You cannot use chat.");
        }
    }

    private ChatMessageDto ToDto(ChatMessage m) =>
        new(m.Id, m.SenderUserId, m.RecipientUserId, m.Body, m.SentAtUtc, m.SenderUserId == currentUser.UserId);
}
