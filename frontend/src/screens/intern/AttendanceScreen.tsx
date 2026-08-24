import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Modal, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { MapPin } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { ChallengeCaptureView } from '../../components/capture/ChallengeCaptureView';
import { attendanceApi, type AttendanceEventType, type AttendanceSessionResponse, type CapturedFrame } from '../../api/resources/attendance.api';
import { distanceInMeters, classifyGeofence, type GeofenceState } from '../../lib/geo';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { notifyNow } from '../../lib/localNotifications';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

const RETRY_COOLDOWN_SECONDS = 15;
const FACE_FAILURE_CODES = new Set(['FACE_MISMATCH', 'LIVENESS_FAILED', 'SPOOF_DETECTED']);

const stateTone: Record<GeofenceState, 'success' | 'warning' | 'error'> = {
  Inside: 'success',
  Uncertain: 'warning',
  Outside: 'error',
};

const blockerMessages: Record<string, string> = {
  AccountInactive: 'Your account is inactive.',
  NoDepartmentAssigned: 'No department is assigned to your account.',
  OutsideInternshipPeriod: 'Today is outside your internship period.',
  HolidayToday: 'Today is a holiday.',
  OnApprovedLeave: 'You are on approved leave today.',
  ArrivalAlreadyMarked: 'Arrival has already been marked today.',
  DepartureAlreadyMarked: 'Departure has already been marked today.',
  ArrivalNotYetMarked: 'Mark arrival before departure.',
  ActiveSessionAlreadyOpen: 'An attendance session is already in progress.',
  NotVerified: 'Your documents are still pending verification. Attendance unlocks once your mentor approves all of them.',
  FaceNotReady: 'Attendance locked. Pending Profile Picture approval or Face Enrollment.',
};

interface ActiveSession {
  eventType: AttendanceEventType;
  session: AttendanceSessionResponse;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  mocked: boolean | null;
}

export function AttendanceScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [startingEvent, setStartingEvent] = useState<AttendanceEventType | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  // Mandatory 15s retry cooldown after a face-verification failure - the server independently
  // enforces the same window (CreateSessionAsync rejects a new session within 15s of
  // LastFaceFailureAtUtc), this is just the client-side countdown UI for it.
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

  const { data: today, isLoading, refetch } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.today(),
  });

  const startWatching = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Location permission is required to mark attendance.');
      return;
    }
    setLocationError(null);
    watchSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 },
      (loc) => setPosition(loc),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      startWatching();
      refetch();
      return () => {
        watchSubscription.current?.remove();
        watchSubscription.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startWatching]),
  );

  const distance = position && today ? distanceInMeters(today.departmentLatitude, today.departmentLongitude, position.coords.latitude, position.coords.longitude) : null;
  const geofenceState: GeofenceState | null =
    distance !== null && position && today ? classifyGeofence(distance, position.coords.accuracy ?? 999, today.geofenceRadiusMeters) : null;

  const submitMutation = useMutation({
    mutationFn: async (frames: CapturedFrame[]) => {
      if (!activeSession) throw new Error('No active session.');
      const deviceId = await getOrCreateDeviceId();
      return attendanceApi.submit(activeSession.session.sessionId, {
        frames,
        latitude: activeSession.latitude,
        longitude: activeSession.longitude,
        accuracyMeters: activeSession.accuracyMeters,
        deviceId,
        mocked: activeSession.mocked,
        deviceModel: Device.modelName ?? null,
        appVersion: Constants.expoConfig?.version ?? null,
      });
    },
    onSuccess: (result) => {
      Toast.show({ type: result.requiresReview ? 'info' : 'success', text1: result.outcome, text2: result.message });
      notifyNow('PIA Attendance', result.message).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
    onError: (error: any) => {
      if (error?.code === 'UNOFFICIAL_ACTIVITY_LOCKOUT') {
        Alert.alert('Account locked', error?.message ?? 'Your account has been locked due to unofficial activity.', [
          { text: 'OK', onPress: () => signOut() },
        ]);
        return;
      }
      if (FACE_FAILURE_CODES.has(error?.code)) {
        Alert.alert('Face mismatch detected', error?.message ?? 'Please try again.');
        setCooldownEndsAt(Date.now() + RETRY_COOLDOWN_SECONDS * 1000);
        return;
      }
      Toast.show({ type: 'error', text1: 'Could not mark attendance', text2: error?.message });
    },
        onSettled: () => {
      setTimeout(() => setActiveSession(null), 300);
    },
  });

  const onStart = async (eventType: AttendanceEventType) => {
    if (!position) {
      Toast.show({ type: 'error', text1: 'Waiting for your location', text2: 'Please try again in a moment.' });
      return;
    }

    setStartingEvent(eventType);
    try {
      const deviceId = await getOrCreateDeviceId();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracyMeters = position.coords.accuracy ?? 50;
      const mocked = position.mocked ?? null;

      const session = await attendanceApi.createSession({ eventType, latitude, longitude, accuracyMeters, deviceId, mocked });
      setActiveSession({ eventType, session, latitude, longitude, accuracyMeters, mocked });
    } catch (error: any) {
      if (error?.code === 'UNOFFICIAL_ACTIVITY_LOCKOUT') {
        Alert.alert('Account locked', error?.message ?? 'Your account has been locked due to unofficial activity.', [
          { text: 'OK', onPress: () => signOut() },
        ]);
      } else {
        Toast.show({ type: 'error', text1: 'Could not start attendance', text2: error?.message });
      }
    } finally {
      setStartingEvent(null);
    }
  };

  const onCooldown = cooldownSecondsLeft > 0;
  const arrivalBlocked = (today?.arrivalBlockers.length ?? 0) > 0 || geofenceState === 'Outside' || geofenceState === null || onCooldown;
  const departureBlocked = (today?.departureBlockers.length ?? 0) > 0 || geofenceState === 'Outside' || geofenceState === null || onCooldown;
  const arrivalReason = onCooldown
    ? `Please wait ${cooldownSecondsLeft}s before trying again.`
    : today?.arrivalBlockers[0]
      ? blockerMessages[today.arrivalBlockers[0]]
      : null;
  const departureReason = onCooldown
    ? `Please wait ${cooldownSecondsLeft}s before trying again.`
    : today?.departureBlockers[0]
      ? blockerMessages[today.departureBlockers[0]]
      : null;

  if (isLoading || !today) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={[s.statusCard, geofenceState ? { borderColor: theme.colors[stateTone[geofenceState]] } : null]}>
        <MapPin size={28} color={geofenceState ? theme.colors[stateTone[geofenceState]] : theme.colors.textMuted} />
        <Text variant="h2" style={s.distanceText}>
          {distance !== null ? `${distance.toFixed(0)} m` : '...'}
        </Text>
        <Text variant="body" tone="secondary">
          from {today.departmentName}
        </Text>
        {locationError ? (
          <Text variant="caption" tone="error" style={s.locationError}>
            {locationError}
          </Text>
        ) : geofenceState === 'Outside' ? (
          <Text variant="caption" tone="error">
            Move within {today.geofenceRadiusMeters} m to mark attendance.
          </Text>
        ) : geofenceState === 'Uncertain' ? (
          <Text variant="caption" tone="warning">
            Close to the boundary - this will be flagged for mentor review.
          </Text>
        ) : geofenceState === 'Inside' ? (
          <Text variant="caption" tone="success">
            You are inside {today.departmentName}.
          </Text>
        ) : null}
      </View>

      <View style={s.card}>
        <Text variant="overline" tone="muted">
          TODAY - {today.status.toUpperCase()}
        </Text>
        <Row label="Arrival" value={today.arrivalMarked ? formatTime(today.arrivalAtUtc) + (today.arrivalIsLate ? ' (Late)' : '') : 'Not marked'} />
        <Row label="Departure" value={today.departureMarked ? formatTime(today.departureAtUtc) + (today.departureIsEarly ? ' (Early)' : '') : 'Not marked'} />
      </View>

      <Button
        label={startingEvent === 'Arrival' ? 'Starting...' : 'Mark Arrival'}
        onPress={() => onStart('Arrival')}
        disabled={arrivalBlocked || startingEvent !== null}
        loading={startingEvent === 'Arrival'}
        fullWidth
        style={s.actionButton}
      />
      {arrivalReason ? (
        <Text variant="caption" tone="muted" style={s.reasonText}>
          {arrivalReason}
        </Text>
      ) : null}

      <Button
        label={startingEvent === 'Departure' ? 'Starting...' : 'Mark Departure'}
        variant="outline"
        onPress={() => onStart('Departure')}
        disabled={departureBlocked || startingEvent !== null}
        loading={startingEvent === 'Departure'}
        fullWidth
        style={s.actionButton}
      />
      {departureReason ? (
        <Text variant="caption" tone="muted" style={s.reasonText}>
          {departureReason}
        </Text>
      ) : null}

         <Modal visible={activeSession !== null} animationType="slide" onRequestClose={() => setActiveSession(null)}>
  {activeSession ? (
    <ChallengeCaptureView
      key={activeSession.session.sessionId}
      challenge={activeSession.session.challenge}
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

function Row({ label, value }: { label: string; value: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.row}>
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const makeStyles = (t: AppTheme) => ({
  statusCard: {
    alignItems: 'center' as const,
    gap: t.spacing.xs,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 2,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
  },
  distanceText: { marginTop: t.spacing.xs },
  locationError: { marginTop: t.spacing.xs, textAlign: 'center' as const },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.sm,
    marginBottom: t.spacing.lg,
  },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  actionButton: { marginTop: t.spacing.sm },
  reasonText: { textAlign: 'center' as const, marginTop: t.spacing.xs },
});
