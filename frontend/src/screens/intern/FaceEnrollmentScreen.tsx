import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { ChallengeCaptureView } from '../../components/capture/ChallengeCaptureView';
import { enrollmentApi, type EnrollmentSessionResponse, type CapturedFrame } from '../../api/resources/attendance.api';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

export function FaceEnrollmentScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const navigation = useNavigation();
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeSession, setActiveSession] = useState<EnrollmentSessionResponse | null>(null);
  const [starting, setStarting] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (frames: CapturedFrame[]) => {
      if (!activeSession) throw new Error('No active enrollment session.');
      const deviceId = await getOrCreateDeviceId();
      return enrollmentApi.submit(activeSession.sessionId, frames, deviceId, true);
    },
    onSuccess: (result) => {
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Face enrollment complete', text2: result.message ?? undefined });
        if (navigation.canGoBack()) navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: result.status, text2: result.message ?? undefined });
      }
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: 'Enrollment failed', text2: error?.message });
    },
    onSettled: () => setActiveSession(null),
  });

  const onStart = async () => {
    setStarting(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const session = await enrollmentApi.createSession(deviceId);
      setActiveSession(session);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not start enrollment', text2: error?.message });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={s.header}>
        <ShieldCheck size={48} color={theme.colors.primary} />
        <Text variant="caption" tone="muted" style={s.title}>
          Biometric Security Verification
        </Text>
      </View>

      {/* Card Box for Instructions */}
      <View style={s.cardContainer}>
        <Text variant="bodyStrong" style={s.cardTitle}>
          Important Guidelines
        </Text>

        <View style={s.bulletItem}>
          <Text style={s.bulletPoint}>•</Text>
          <Text variant="body" tone="secondary" style={s.bulletText}>
            <Text variant="bodyStrong">Real-time Capture: </Text>
            A quick live motion sequence is captured to verify your identity against your mentor-approved record.
          </Text>
        </View>

        <View style={s.bulletItem}>
          <Text style={s.bulletPoint}>•</Text>
          <Text variant="body" tone="secondary" style={s.bulletText}>
            <Text variant="bodyStrong">Data Protection: </Text>
            Your facial features are converted into an encrypted numerical code (embedding) and stored securely.
          </Text>
        </View>

        <View style={s.bulletItem}>
          <Text style={s.bulletPoint}>•</Text>
          <Text variant="body" tone="secondary" style={s.bulletText}>
            <Text variant="bodyStrong">Profile Updates: </Text>
            Biometric data can be refreshed once every 30 days in case of significant physical changes.
          </Text>
        </View>
      </View>

      <View style={s.consentRow}>
        <Button
          label={consentGiven ? 'Consent Given ✓' : 'I Understand & Consent'}
          variant={consentGiven ? 'secondary' : 'outline'}
          onPress={() => setConsentGiven((c) => !c)}
          fullWidth
        />
      </View>

      <Button
        label={starting ? 'Starting Session...' : 'Start Enrollment'}
        onPress={onStart}
        disabled={!consentGiven || starting}
        loading={starting}
        fullWidth
        style={s.startButton}
      />

      <Modal visible={activeSession !== null} animationType="slide" onRequestClose={() => setActiveSession(null)}>
        {activeSession ? (
          <ChallengeCaptureView
            challenge={activeSession.challenge}
            onComplete={(frames) => submitMutation.mutate(frames)}
            onCancel={() => setActiveSession(null)}
            onTimeout={() => {
              Toast.show({
                type: 'error',
                text1: 'Verification timed out',
                text2: 'You took too long on a step. Please try again.',
              });
              setActiveSession(null);
            }}
          />
        ) : null}
      </Modal>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  header: { alignItems: 'center' as const, gap: t.spacing.xs, marginTop: t.spacing.md, marginBottom: t.spacing.xl },
  title: { textAlign: 'center' as const, letterSpacing: 0.5 },
  cardContainer: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  cardTitle: {
    marginBottom: t.spacing.xs,
    color: t.colors.textPrimary,
  },
  bulletItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: t.spacing.sm,
  },
  bulletPoint: {
    fontSize: 16,
    color: t.colors.primary,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
    textAlign: 'justify' as const,
  },
  paragraph: { marginBottom: t.spacing.sm, lineHeight: 22 },
  consentRow: { marginTop: t.spacing.sm, marginBottom: t.spacing.xs },
  startButton: { marginTop: t.spacing.xs },
});