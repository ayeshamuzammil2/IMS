import React, { useRef, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, Linking } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Mail, ChevronLeft, MessageCircle } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { chatApi, type ChatContactDto } from '../../api/resources/chat.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

/**
 * One screen serves all three chat entry points (Mentor's "Contact Admin", Intern's "Contact
 * Mentor", Admin's "Messages") - it fetches the current user's eligible contacts (see
 * ChatService.GetContactsAsync) and either drops straight into the single thread (Intern always has
 * exactly one contact: their mentor) or shows a contact list first (Admin/Mentor may have several).
 * Polling-based, not WebSockets - refetches every 4s while a thread is open.
 */
export function ChatScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [manuallySelected, setSelected] = useState<ChatContactDto | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const contactsQuery = useQuery({ queryKey: ['chat', 'contacts'], queryFn: chatApi.getContacts, refetchInterval: 8000 });
  const contacts = contactsQuery.data ?? [];
  // An Intern always has exactly one eligible contact (their mentor) - skip the picker for them
  // by deriving the selection instead of syncing it via an effect.
  const selected = manuallySelected ?? (contacts.length === 1 ? contacts[0] : null);

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', selected?.userId],
    queryFn: () => chatApi.getMessages(selected!.userId),
    enabled: selected !== null,
    refetchInterval: 4000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => chatApi.sendMessage(selected!.userId, body),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selected?.userId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'contacts'] });
    },
  });

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  };

  if (!selected) {
    return (
      <Screen scroll={false}>
        {contactsQuery.isLoading ? (
          <Text variant="body" tone="muted">
            Loading...
          </Text>
        ) : contacts.length === 0 ? (
          <View style={s.emptyContainer}>
            <MessageCircle size={40} color={theme.colors.textMuted} />
            <Text variant="body" tone="muted" style={s.emptyText}>
              No one to message yet.
            </Text>
          </View>
        ) : (
          <ScrollView>
            {contacts.map((c) => (
              <Pressable key={c.userId} style={s.contactRow} onPress={() => setSelected(c)}>
                <View style={s.contactInfo}>
                  <Text variant="bodyStrong">{c.fullName}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {c.lastMessageBody ?? `Start a conversation with this ${c.role.toLowerCase()}.`}
                  </Text>
                </View>
                {c.unreadCount > 0 ? (
                  <View style={[s.badge, { backgroundColor: theme.colors.primary }]}>
                    <Text variant="overline" style={{ color: theme.colors.onPrimary }}>
                      {c.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Screen>
    );
  }

  const messages = messagesQuery.data ?? [];

  return (
    <Screen scroll={false} padded={false}>
      <View style={s.header}>
        {contacts.length > 1 ? (
          <Pressable onPress={() => setSelected(null)} hitSlop={8} style={s.headerIcon}>
            <ChevronLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}
        <Text variant="bodyStrong" style={s.headerName}>
          {selected.fullName}
        </Text>
        <Pressable onPress={() => Linking.openURL(`mailto:${selected.email}`)} hitSlop={8} style={s.headerIcon}>
          <Mail size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.thread}
        contentContainerStyle={s.threadContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m) => (
          <View key={m.id} style={[s.bubble, m.isMine ? s.bubbleMine : s.bubbleTheirs, { backgroundColor: m.isMine ? theme.colors.primary : theme.colors.surfaceSunken }]}>
            <Text variant="body" style={{ color: m.isMine ? theme.colors.onPrimary : theme.colors.textPrimary }}>
              {m.body}
            </Text>
            <Text variant="overline" style={{ color: m.isMine ? theme.colors.textOnDarkMuted : theme.colors.textMuted }}>
              {new Date(m.sentAtUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.composerRow}>
        <TextInput
          style={s.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Pressable onPress={handleSend} disabled={!draft.trim() || sendMutation.isPending} style={s.sendButton} hitSlop={8}>
          <Send size={20} color={draft.trim() ? theme.colors.primary : theme.colors.textMuted} />
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  emptyContainer: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: t.spacing.sm, padding: t.spacing.xl },
  emptyText: { textAlign: 'center' as const },
  contactRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: t.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  contactInfo: { flex: 1, gap: 2, marginRight: t.spacing.sm },
  badge: { minWidth: 22, height: 22, borderRadius: t.radii.full, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 6 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerIcon: { padding: t.spacing.xs },
  headerName: { flex: 1 },
  thread: { flex: 1 },
  threadContent: { padding: t.spacing.md, gap: t.spacing.sm },
  bubble: { maxWidth: '80%' as const, borderRadius: t.radii.lg, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm, gap: 2 },
  bubbleMine: { alignSelf: 'flex-end' as const, borderBottomRightRadius: t.radii.sm },
  bubbleTheirs: { alignSelf: 'flex-start' as const, borderBottomLeftRadius: t.radii.sm },
  composerRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: t.spacing.sm,
    padding: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surfaceSunken,
  },
  sendButton: { padding: t.spacing.sm },
});
