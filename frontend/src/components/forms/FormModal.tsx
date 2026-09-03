import React from 'react';
import { Modal, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from '../primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Set false when children already manage their own scrolling (e.g. a FlatList), to avoid
   * nesting a VirtualizedList inside this modal's ScrollView. Defaults to true. */
  scrollable?: boolean;
}

export function FormModal({ visible, title, onClose, children, footer, scrollable = true }: Props) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Keyboard-avoiding: pushes the card up as the keyboard opens so whichever field is
       * focused stays visible above it, instead of being hidden underneath - same behaviour as
       * the chat composer. */}
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[s.backdropInner, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Pressable style={s.backdropTouchable} onPress={onClose} />
          <View style={s.card}>
            <View style={s.header}>
              <Text variant="h3" style={s.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={22} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            {scrollable ? (
              <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            ) : (
              <View style={s.body}>{children}</View>
            )}
            {footer ? <View style={s.footer}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t: AppTheme) => ({
  backdrop: {
    flex: 1,
  },
  backdropInner: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'center' as const,
    padding: t.spacing.lg,
  },
  backdropTouchable: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    maxHeight: '85%' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    padding: t.spacing.lg,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: t.spacing.md,
    gap: t.spacing.md,
  },
  headerTitle: { flex: 1 },
  body: { flexGrow: 0 },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: t.spacing.sm,
    marginTop: t.spacing.md,
  },
});