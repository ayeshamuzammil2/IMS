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
        <ShieldCheck size={40} color={theme.colors.primary} />
        <Text variant="h2" style={s.title}>
          Face Enrollment
        </Text>
      </View>

      <Text variant="body" tone="secondary" style={s.paragraph}>
        This captures a short, live sequence of your face - not a photo upload - to create the
        biometric reference used to verify your identity every time you mark attendance. It is
        matched against your mentor-approved profile photo before it is stored.
      </Text>
      <Text variant="body" tone="secondary" style={s.paragraph}>
        Your face data is stored only as a mathematical representation (an embedding), never as a
        viewable image, and is used solely for attendance verification. You can refresh your
        enrollment later (for example, after a haircut or growing a beard) once every 30 days.
      </Text>

      <View style={s.consentRow}>
        <Button
          label={consentGiven ? 'Consent given ✓' : 'I understand and consent'}
          variant={consentGiven ? 'secondary' : 'outline'}
          onPress={() => setConsentGiven((c) => !c)}
          fullWidth
        />
      </View>

      <Button
        label={starting ? 'Starting...' : 'Start Enrollment'}
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
  header: { alignItems: 'center' as const, gap: t.spacing.sm, marginBottom: t.spacing.lg },
  title: { textAlign: 'center' as const },
  paragraph: { marginBottom: t.spacing.md, lineHeight: 20 },
  consentRow: { marginTop: t.spacing.md, marginBottom: t.spacing.sm },
  startButton: { marginTop: t.spacing.sm },
});
