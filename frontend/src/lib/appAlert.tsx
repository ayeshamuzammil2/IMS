import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { Text } from '../components/primitives/Text';
import { Button } from '../components/primitives/Button';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useTheme } from '../providers/ThemeProvider';
import type { AppTheme } from '../theme/types';

/**
 * App-wide replacement for React Native's `Alert.alert`.
 *
 * The product requirement is explicit: important confirmations/decisions must NOT look like a
 * transient notification/toast. They must be a centered, white, card-style dialog that blocks
 * interaction until the person taps a button (OK / Cancel / etc.), matching the app's own design
 * system instead of the OS-native alert box.
 *
 * Usage mirrors `Alert.alert(title, message?, buttons?)` so call-sites only need their import
 * swapped - no signature changes required:
 *
 *   appAlert.alert('Delete document', 'Are you sure?', [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Delete', style: 'destructive', onPress: doDelete },
 *   ]);
 *
 * `AppAlertHost` is mounted once near the root (see AppProviders) and renders whatever the
 * singleton below tells it to - a simple pub/sub so any file can trigger it without needing to be
 * inside a React tree that has a dedicated context consumer.
 */

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

type Listener = (state: AlertState | null) => void;
let listener: Listener | null = null;

function showAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  const resolvedButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' as const }];
  listener?.({ title, message, buttons: resolvedButtons });
}

export const appAlert = {
  alert: showAlert,
};

export function AppAlertHost() {
  const s = useThemedStyles(makeStyles);
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    listener = setState;
    return () => {
      listener = null;
    };
  }, []);

  const close = useCallback(() => setState(null), []);

  const handlePress = (btn: AppAlertButton) => {
    close();
    // Deferred so the modal has fully closed before any navigation/side-effect fires.
    setTimeout(() => btn.onPress?.(), 0);
  };

  const buttons = state?.buttons ?? [];

  return (
    <Modal visible={state !== null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTouchable} onPress={close} />
        {state ? (
          <View style={s.card}>
            <Text variant="h3" style={s.title}>
              {state.title}
            </Text>
            {state.message ? (
              <Text variant="body" tone="secondary" style={s.message}>
                {state.message}
              </Text>
            ) : null}

            <View style={buttons.length > 1 ? s.buttonRow : s.buttonColumn}>
              {buttons.map((btn, idx) => (
                <Button
                  key={`${btn.text}-${idx}`}
                  label={btn.text}
                  variant={btn.style === 'destructive' ? 'danger' : btn.style === 'cancel' ? 'outline' : 'primary'}
                  onPress={() => handlePress(btn)}
                  style={buttons.length > 1 ? s.buttonFlex : undefined}
                  fullWidth={buttons.length <= 1}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const makeStyles = (t: AppTheme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: t.spacing.lg,
  },
  backdropTouchable: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    width: '100%' as const,
    maxWidth: 420,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    padding: t.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { textAlign: 'center' as const, marginBottom: 6 },
  message: { textAlign: 'center' as const, lineHeight: 20, marginBottom: t.spacing.lg },
  buttonRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  buttonColumn: {
    marginTop: t.spacing.xs,
  },
  buttonFlex: { flex: 1 },
});
