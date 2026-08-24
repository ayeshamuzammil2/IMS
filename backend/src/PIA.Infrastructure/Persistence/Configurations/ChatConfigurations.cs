using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIA.Domain.Entities;

namespace PIA.Infrastructure.Persistence.Configurations;

public sealed class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Body).HasMaxLength(2000).IsRequired();
        b.HasOne(x => x.Sender).WithMany()
            .HasForeignKey(x => x.SenderUserId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Recipient).WithMany()
            .HasForeignKey(x => x.RecipientUserId).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => new { x.SenderUserId, x.RecipientUserId, x.SentAtUtc });
        b.HasIndex(x => new { x.RecipientUserId, x.SenderUserId, x.SentAtUtc });
    }
}
