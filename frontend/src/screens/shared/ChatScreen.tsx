import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Linking,
  FlatList,
  Keyboard,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Mail, ChevronLeft, MessageCircle } from 'lucide-react-native';
import { Text } from '../../components/primitives/Text';
import { chatApi, type ChatContactDto } from '../../api/resources/chat.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

export function ChatScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [manuallySelected, setSelected] = useState<ChatContactDto | null>(null);
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Keyboard height dynamically capture karne ke liye listener
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const contactsQuery = useQuery({ queryKey: ['chat', 'contacts'], queryFn: chatApi.getContacts, refetchInterval: 8000 });
  const contacts = contactsQuery.data ?? [];
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
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
        {contactsQuery.isLoading ? (
          <Text variant="body" tone="muted">
            Loading...
          </Text>
        ) : contacts.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrapper}>
              <MessageCircle size={36} color={theme.colors.textMuted} />
            </View>
            <Text variant="bodyStrong" style={s.emptyTitle}>
              No Messages
            </Text>
            <Text variant="caption" tone="muted" style={s.emptyText}>
              No one available to message at the moment.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.contactsListContent} keyboardShouldPersistTaps="handled">
            {contacts.map((c) => (
              <Pressable key={c.userId} style={s.contactCard} onPress={() => setSelected(c)}>
                <View style={s.avatarWrapper}>
                  <Text variant="bodyStrong" style={s.avatarText}>
                    {c.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
                  </Text>
                </View>

                <View style={s.contactInfo}>
                  <View style={s.contactHeaderRow}>
                    <Text variant="bodyStrong" numberOfLines={1} style={s.contactName}>
                      {c.fullName}
                    </Text>
                    {c.role ? (
                      <View style={s.roleBadge}>
                        <Text variant="caption" tone="muted" style={s.roleBadgeText}>
                          {c.role}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="caption" tone="muted" numberOfLines={1} style={s.lastMessage}>
                    {c.lastMessageBody ?? `Start a conversation with this ${c.role?.toLowerCase() ?? 'user'}.`}
                  </Text>
                </View>

                {c.unreadCount > 0 ? (
                  <View style={[s.badge, { backgroundColor: theme.colors.primary }]}>
                    <Text variant="overline" style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                      {c.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  const messages = messagesQuery.data ?? [];

  return (
    <View style={[s.mainWrapper, { paddingBottom: keyboardHeight }]}>
      {/* Chat Header */}
      <View style={s.header}>
        {contacts.length > 1 ? (
          <Pressable onPress={() => setSelected(null)} hitSlop={8} style={s.headerIconButton}>
            <ChevronLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}

        <View style={s.headerAvatar}>
          <Text variant="bodyStrong" style={s.headerAvatarText}>
            {selected.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
          </Text>
        </View>

        <View style={s.headerInfo}>
          <Text variant="bodyStrong" style={s.headerName} numberOfLines={1}>
            {selected.fullName}
          </Text>
          {selected.role ? (
            <Text variant="caption" tone="muted">
              {selected.role}
            </Text>
          ) : null}
        </View>

        {selected.email ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${selected.email}`)}
            hitSlop={8}
            style={s.headerIconButton}
          >
            <Mail size={20} color={theme.colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {/* Chat Thread */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        style={s.thread}
        contentContainerStyle={s.threadContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: m }) => (
          <View
            style={[
              s.bubble,
              m.isMine ? s.bubbleMine : s.bubbleTheirs,
              { backgroundColor: m.isMine ? theme.colors.primary : theme.colors.surfaceSunken },
            ]}
          >
            <Text variant="body" style={{ color: m.isMine ? theme.colors.onPrimary : theme.colors.textPrimary, lineHeight: 20 }}>
              {m.body}
            </Text>
            <Text
              variant="overline"
              style={[
                s.bubbleTime,
                { color: m.isMine ? theme.colors.textOnDarkMuted : theme.colors.textMuted },
              ]}
            >
              {new Date(m.sentAtUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        )}
      />

      {/* Input Composer */}
      <View style={s.composerRow}>
        <TextInput
          style={s.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={!draft.trim() || sendMutation.isPending}
          style={[
            s.sendButton,
            { backgroundColor: draft.trim() ? theme.colors.primary : theme.colors.surfaceSunken },
          ]}
          hitSlop={8}
        >
          <Send size={20} color={draft.trim() ? theme.colors.onPrimary : theme.colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  mainWrapper: {
    flex: 1,
    backgroundColor: t.colors.background,
  },

  // Empty State
  emptyCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.xl,
    alignItems: 'center' as const,
    marginTop: t.spacing.md,
    gap: t.spacing.xs,
  },
  emptyIconWrapper: {
    padding: t.spacing.md,
    borderRadius: 50,
    backgroundColor: t.colors.surfaceSunken,
    marginBottom: t.spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center' as const,
  },

  // Contact List
  contactsListContent: {
    gap: t.spacing.sm,
    paddingTop: t.spacing.xs,
  },
  contactCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    gap: t.spacing.md,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  avatarText: {
    fontSize: 16,
    color: t.colors.primary,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: t.spacing.xs,
  },
  contactName: {
    flex: 1,
    fontSize: 15,
  },
  roleBadge: {
    backgroundColor: t.colors.surfaceSunken,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: t.radii.full,
  },
  roleBadgeText: {
    fontSize: 10,
    textTransform: 'uppercase' as const,
  },
  lastMessage: {
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: t.radii.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },

  // Header Styling
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerIconButton: {
    padding: t.spacing.xs,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surfaceSunken,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerAvatarText: {
    fontSize: 14,
    color: t.colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
  },

  // Thread Styling
  thread: {
    flex: 1,
  },
  threadContent: {
    padding: t.spacing.md,
    gap: t.spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end' as const,
  },
  bubble: {
    maxWidth: '78%' as const,
    borderRadius: t.radii.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end' as const,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start' as const,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  bubbleTime: {
    alignSelf: 'flex-end' as const,
    fontSize: 10,
  },

  // Composer Input
  composerRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surfaceSunken,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});