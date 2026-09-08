import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Modal, ActivityIndicator } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { ShieldCheck, Lock, FileWarning, UserCog } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { ChallengeCaptureView } from '../../components/capture/ChallengeCaptureView';
import { enrollmentApi, type EnrollmentSessionResponse, type CapturedFrame } from '../../api/resources/attendance.api';
import { authApi } from '../../api/resources/auth.api';
import { documentsApi } from '../../api/resources/documents.api';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

// Same pattern/duration as AttendanceScreen's retry cooldown - after a failed face
// match/verification, force a short pause before letting the intern try enrollment again instead
// of immediately re-opening the camera.
const RETRY_COOLDOWN_SECONDS = 15;
const FACE_FAILURE_CODES = new Set(['FACE_MISMATCH', 'FACE_VERIFICATION_UNAVAILABLE']);

export function FaceEnrollmentScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const navigation = useNavigation();
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeSession, setActiveSession] = useState<EnrollmentSessionResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  useEffect(() => {
    if (!cooldownEndsAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setCooldownSecondsLeft(remaining);
      if (remaining <= 0) setCooldownEndsAt(null);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  // Always fetch a fresh copy of "me" when this screen is focused - faceEnrollmentStatus can
  // change from another session (e.g. an admin unlocking re-enrollment) and this screen must
  // never let an already-enrolled-and-locked intern see the Start Enrollment flow again.
  const meQuery = useQuery({
    queryKey: ['auth', 'me', 'faceEnrollmentGate'],
    queryFn: authApi.me,
    staleTime: 0,
  });

  // Face enrollment must stay locked until BOTH gates clear: every mandatory document approved,
  // and the self-details form (address/emergency contact/blood group) submitted. Both come from
  // the same dashboard payload the Documents/Dashboard screens already use, so no backend change
  // was needed to add this gate.
  const dashboardQuery = useQuery({
    queryKey: ['documents', 'dashboard', 'faceEnrollmentGate'],
    queryFn: documentsApi.getDashboard,
    staleTime: 0,
  });

  const documentsApproved = dashboardQuery.data?.verificationStatus === 'Verified';
  const selfDetailsComplete = Boolean(dashboardQuery.data?.selfDetailsSubmitted);
  const gateBlockedReason: 'documents' | 'selfDetails' | null = !documentsApproved
    ? 'documents'
    : !selfDetailsComplete
      ? 'selfDetails'
      : null;

  useFocusEffect(
    useCallback(() => {
      meQuery.refetch();
      dashboardQuery.refetch();
      return () => {
        setCooldownEndsAt(null);
        setCooldownSecondsLeft(0);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const isPendingReview = meQuery.data?.faceEnrollmentStatus === 'Pending';
  const isLocked = meQuery.data?.faceEnrollmentStatus === 'Active' && !meQuery.data?.faceReEnrollmentAllowed;
  const onCooldown = cooldownSecondsLeft > 0;

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
      if (FACE_FAILURE_CODES.has(error?.code)) {
        Toast.show({ type: 'error', text1: 'Face verification failed', text2: error?.message });
        setCooldownEndsAt(Date.now() + RETRY_COOLDOWN_SECONDS * 1000);
        return;
      }
      Toast.show({ type: 'error', text1: 'Enrollment failed', text2: error?.message });
    },
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

  if (meQuery.isLoading || dashboardQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (gateBlockedReason === 'documents') {
    return (
      <Screen scroll style={s.container}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <FileWarning size={56} color={theme.colors.warning} />
          </View>
          <Text variant="bodyStrong" style={{ textAlign: 'center', marginBottom: 8 }}>
            Documents Not Approved Yet
          </Text>
          <Text variant="body" tone="secondary" style={s.message}>
            Face enrollment will unlock automatically once your mentor/admin approves all of your
            mandatory documents. Please upload any missing documents from the Documents tab and wait for
            approval.
          </Text>
        </View>
      </Screen>
    );
  }

  if (gateBlockedReason === 'selfDetails') {
    return (
      <Screen scroll style={s.container}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <UserCog size={56} color={theme.colors.warning} />
          </View>
          <Text variant="bodyStrong" style={{ textAlign: 'center', marginBottom: 8 }}>
            Personal Details Required
          </Text>
          <Text variant="body" tone="secondary" style={s.message}>
            Face enrollment will unlock once you fill in your personal details on your Dashboard.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isPendingReview) {
    return (
      <Screen scroll style={s.container}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <ShieldCheck size={56} color={theme.colors.warning} />
          </View>
          <Text variant="bodyStrong" style={{ textAlign: 'center', marginBottom: 8 }}>
            Awaiting Mentor/Admin Review
          </Text>
          <Text variant="body" tone="secondary" style={s.message}>
            Your face has been captured and passed the automatic checks. A mentor/admin now needs
            to review and approve it before biometric attendance unlocks - you'll be notified once
            it's decided.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLocked) {
    return (
      <Screen scroll style={s.container}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Lock size={56} color={theme.colors.textMuted} />
          </View>
          <Text variant="bodyStrong" style={{ textAlign: 'center', marginBottom: 8 }}>
            Already Enrolled
          </Text>
          <Text variant="body" tone="secondary" style={s.message}>
            Your face is already enrolled and locked. Contact your admin to re-enroll.
          </Text>
        </View>
      </Screen>
    );
  }

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
            <Text variant="bodyStrong">One-Time Enrollment: </Text>
            This can only be done once. After it succeeds, it locks automatically - if you ever need
            to re-enroll (e.g. a significant physical change), ask your administrator to unlock it
            for you first.
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
        label={starting ? 'Starting Session...' : onCooldown ? `Please wait ${cooldownSecondsLeft}s...` : 'Start Enrollment'}
        onPress={onStart}
        disabled={!consentGiven || starting || onCooldown}
        loading={starting}
        fullWidth
        style={s.startButton}
      />

      {onCooldown ? (
        <Text variant="caption" tone="muted" style={s.cooldownText}>
          Please wait {cooldownSecondsLeft}s before trying again.
        </Text>
      ) : null}

      <Modal visible={activeSession !== null} animationType="slide" onRequestClose={() => setActiveSession(null)}>
        {activeSession ? (
          <ChallengeCaptureView
            challenge={activeSession.challenge}
            onComplete={(frames) => {
              setActiveSession(null);
              submitMutation.mutate(frames);
            }}
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
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: { alignItems: 'center' as const, marginTop: t.spacing.md, marginBottom: t.spacing.md },
  message: { textAlign: 'justify' as const, lineHeight: 22 },
  centerLoading: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: t.spacing.xl * 2 },
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
  cooldownText: { textAlign: 'center' as const, marginTop: t.spacing.xs },
});