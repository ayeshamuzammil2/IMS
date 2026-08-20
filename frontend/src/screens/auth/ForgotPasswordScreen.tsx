import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { authApi } from '../../api/resources/auth.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

export function ForgotPasswordScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setShowSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="h2" style={s.title}>
        Forgot Password
      </Text>
      <Text variant="body" tone="secondary" style={s.subtitle}>
        Enter the email address associated with your account.
      </Text>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@pia.com.pk"
      />

      {error ? (
        <Text variant="caption" tone="error" style={s.error}>
          {error}
        </Text>
      ) : null}

      <Button label="Send" onPress={onSubmit} loading={submitting} fullWidth />

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={[s.overlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={s.dialog}>
            <Text variant="h3" style={s.dialogTitle}>
              Check your email
            </Text>
            <Text variant="body" tone="secondary" style={s.dialogBody}>
              Your password has been sent to your attached email.
            </Text>
            <Button
              label="Back to Sign In"
              fullWidth
              onPress={() => {
                setShowSuccess(false);
                navigation.goBack();
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  title: { marginTop: t.spacing.lg, marginBottom: t.spacing.xs },
  subtitle: { marginBottom: t.spacing.lg },
  error: { marginBottom: t.spacing.md },
  overlay: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: t.spacing.xl },
  dialog: {
    width: '100%' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    padding: t.spacing.xl,
    gap: t.spacing.md,
  },
  dialogTitle: {},
  dialogBody: { marginBottom: t.spacing.sm },
});
