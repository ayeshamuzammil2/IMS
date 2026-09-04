import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Linking,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [manuallySelected, setSelected] = useState<ChatContactDto | null>(null);
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Dynamic Keyboard Height Listener
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

  // State 1: Contact Selection View
  if (!selected) {
    return (
      <View style={s.contactsContainer}>
        {contactsQuery.isLoading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
              Loading conversations...
            </Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrapper}>
              <MessageCircle size={32} color={theme.colors.primary} />
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
            <Text variant="overline" tone="muted" style={s.contactsHeaderTitle}>
              CONVERSATIONS
            </Text>
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
                        <Text variant="caption" style={s.roleBadgeText}>
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
                  <View style={s.unreadBadge}>
                    <Text variant="overline" style={s.unreadBadgeText}>
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

  // State 2: Active Chat Thread View
  const messages = messagesQuery.data ?? [];

  return (
    <View style={[s.mainWrapper, { paddingBottom: keyboardHeight }]}>
      {/* Chat Header */}
      <View style={s.header}>
        <View style={s.headerLeftSection}>
          {contacts.length > 1 ? (
            <Pressable onPress={() => setSelected(null)} hitSlop={8} style={s.headerIconButton}>
              <ChevronLeft size={20} color={theme.colors.textPrimary} />
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
              <Text variant="caption" tone="muted" style={s.headerRole}>
                {selected.role}
              </Text>
            ) : null}
          </View>
        </View>

        {selected.email ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${selected.email}`)}
            hitSlop={8}
            style={s.headerIconButton}
          >
            <Mail size={18} color={theme.colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {/* Chat Messages Thread */}
      {messagesQuery.isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          style={s.thread}
          contentContainerStyle={messages.length === 0 ? s.emptyThreadContent : s.threadContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text variant="caption" tone="muted">
                No messages yet. Say hi!
              </Text>
            </View>
          }
          renderItem={({ item: m }) => (
            <View
              style={[
                s.bubble,
                m.isMine ? s.bubbleMine : s.bubbleTheirs,
                { backgroundColor: m.isMine ? theme.colors.primary : theme.colors.surface },
              ]}
            >
              <Text
                variant="body"
                style={{
                  color: m.isMine ? theme.colors.onPrimary : theme.colors.textPrimary,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
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
      )}

      {/* Input Composer - Lifted with safe area bottom padding */}
      <View
        style={[
          s.composerRow,
          {
            paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 12) + 8,
          },
        ]}
      >
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
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={draft.trim() ? theme.colors.onPrimary : theme.colors.textMuted} />
          ) : (
            <Send size={18} color={draft.trim() ? theme.colors.onPrimary : theme.colors.textMuted} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  mainWrapper: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingTop: t.spacing.sm,
  },
  contactsContainer: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.md,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Empty State
  emptyCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.xl,
    alignItems: 'center' as const,
    marginTop: t.spacing.md,
    gap: 6,
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center' as const,
  },

  // Contacts List
  contactsHeaderTitle: {
    letterSpacing: 0.8,
    marginBottom: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  contactsListContent: {
    gap: t.spacing.sm,
    paddingBottom: t.spacing.xl,
  },
  contactCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    gap: t.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  avatarText: {
    fontSize: 16,
    color: t.colors.primary,
    fontWeight: '600' as const,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: t.spacing.xs,
  },
  contactName: {
    fontSize: 15,
    flexShrink: 1,
  },
  roleBadge: {
    backgroundColor: t.colors.surfaceSunken,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: t.colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  lastMessage: {
    marginTop: 3,
    fontSize: 13,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: t.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: t.colors.onPrimary,
    fontWeight: '700' as const,
    fontSize: 10,
  },

  // Header Styling
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    borderRadius: 12,
    marginHorizontal: t.spacing.xs,
  },
  headerLeftSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    flex: 1,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  headerAvatarText: {
    fontSize: 14,
    color: t.colors.primary,
    fontWeight: '600' as const,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
  },
  headerRole: {
    fontSize: 11,
  },

  // Thread Styling
  thread: {
    flex: 1,
  },
  threadContent: {
    padding: t.spacing.md,
    paddingTop: t.spacing.lg,
    gap: 10,
    flexGrow: 1,
    justifyContent: 'flex-end' as const,
  },
  emptyThreadContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyBox: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bubble: {
    maxWidth: '80%' as const,
    borderRadius: 16,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end' as const,
    borderBottomRightRadius: 2,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start' as const,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  bubbleTime: {
    alignSelf: 'flex-end' as const,
    fontSize: 9,
    marginTop: 2,
  },

  // Composer Input
  composerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 20,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 8,
    fontSize: 14,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surfaceSunken,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});

export default ChatScreen;