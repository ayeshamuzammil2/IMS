import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Modal, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Navigation, Clock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react-native';
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
        
        setPosition(null);
        setLocationError(null);
        setStartingEvent(null);
        setActiveSession(null);
        setCooldownEndsAt(null);
        setCooldownSecondsLeft(0);
      };
    }, [startWatching, refetch]),
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
      <Screen scroll={false}>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" style={s.loadingText}>Fetching attendance status...</Text>
        </View>
      </Screen>
    );
  }

  const activeToneColor = geofenceState ? theme.colors[stateTone[geofenceState]] : theme.colors.textMuted;

  return (
    <Screen scroll style={s.container}>
      <View style={[s.statusCard, { borderColor: geofenceState ? activeToneColor : theme.colors.border }]}>
        <View style={[s.iconBadge, { backgroundColor: geofenceState ? `${activeToneColor}15` : theme.colors.surfaceSunken }]}>
          <Navigation size={22} color={activeToneColor} />
        </View>
        <Text variant="h1" style={s.distanceText}>
          {distance !== null ? `${distance.toFixed(0)}m` : '--'}
        </Text>
        <Text variant="caption" style={s.departmentText}>
          Distance from <Text variant="caption" style={s.deptName}>{today.departmentName}</Text>
        </Text>

        <View style={s.badgeContainer}>
          {locationError ? (
            <View style={[s.statusBanner, { backgroundColor: `${theme.colors.error}15` }]}>
              <ShieldAlert size={14} color={theme.colors.error} />
              <Text variant="caption" style={{ color: theme.colors.error }}>{locationError}</Text>
            </View>
          ) : geofenceState === 'Outside' ? (
            <View style={[s.statusBanner, { backgroundColor: `${theme.colors.error}15` }]}>
              <AlertCircle size={14} color={theme.colors.error} />
              <Text variant="caption" style={{ color: theme.colors.error }}>
                Move within {today.geofenceRadiusMeters}m to mark attendance
              </Text>
            </View>
          ) : geofenceState === 'Uncertain' ? (
            <View style={[s.statusBanner, { backgroundColor: `${theme.colors.warning}15` }]}>
              <AlertCircle size={14} color={theme.colors.warning} />
              <Text variant="caption" style={{ color: theme.colors.warning }}>
                Close to boundary - flagged for mentor review
              </Text>
            </View>
          ) : geofenceState === 'Inside' ? (
            <View style={[s.statusBanner, { backgroundColor: `${theme.colors.success}15` }]}>
              <CheckCircle2 size={14} color={theme.colors.success} />
              <Text variant="caption" style={{ color: theme.colors.success }}>
                Inside {today.departmentName} radius
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Clock size={16} color={theme.colors.primary} />
          <Text variant="overline" style={s.cardTitle}>
            TODAY'S TIMINGS ({today.status.toUpperCase()})
          </Text>
        </View>

        <View style={s.metricsRow}>
          <MetricBox
            label="Arrival"
            value={today.arrivalMarked ? formatTime(today.arrivalAtUtc) : 'Not marked'}
            badge={today.arrivalIsLate ? 'Late' : today.arrivalMarked ? 'On Time' : null}
            isLate={today.arrivalIsLate}
          />
          <View style={s.metricDivider} />
          <MetricBox
            label="Departure"
            value={today.departureMarked ? formatTime(today.departureAtUtc) : 'Not marked'}
            badge={today.departureIsEarly ? 'Early' : today.departureMarked ? 'Done' : null}
            isLate={today.departureIsEarly}
          />
        </View>
      </View>

      <View style={s.actionsGroup}>
        <Button
          label={startingEvent === 'Arrival' ? 'Initializing...' : 'Mark Arrival'}
          onPress={() => onStart('Arrival')}
          disabled={arrivalBlocked || startingEvent !== null}
          loading={startingEvent === 'Arrival'}
          fullWidth
          style={s.actionButton}
        />
        {arrivalReason ? (
          <View style={s.reasonBox}>
            <AlertCircle size={14} color={theme.colors.textSecondary} />
            <Text variant="caption" style={s.reasonText}>
              {arrivalReason}
            </Text>
          </View>
        ) : null}

        <Button
          label={startingEvent === 'Departure' ? 'Initializing...' : 'Mark Departure'}
          variant="outline"
          onPress={() => onStart('Departure')}
          disabled={departureBlocked || startingEvent !== null}
          loading={startingEvent === 'Departure'}
          fullWidth
          style={s.actionButton}
        />
        {departureReason ? (
          <View style={s.reasonBox}>
            <AlertCircle size={14} color={theme.colors.textSecondary} />
            <Text variant="caption" style={s.reasonText}>
              {departureReason}
            </Text>
          </View>
        ) : null}
      </View>

      <Modal visible={activeSession !== null} animationType="slide" onRequestClose={() => setActiveSession(null)}>
        {activeSession ? (
          <ChallengeCaptureView
            key={activeSession.session.sessionId}
            challenge={activeSession.session.challenge}
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

function MetricBox({ label, value, badge, isLate }: { label: string; value: string; badge: string | null; isLate?: boolean }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();

  return (
    <View style={s.metricBox}>
      <Text variant="caption" style={s.metricLabel}>{label}</Text>
      <Text variant="body" style={s.metricValue}>{value}</Text>
      {badge ? (
        <View style={[s.badge, { backgroundColor: isLate ? `${theme.colors.warning}20` : `${theme.colors.success}20` }]}>
          <Text variant="caption" style={{ color: isLate ? theme.colors.warning : theme.colors.success, fontSize: 10, fontWeight: '700' }}>
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: t.spacing.xl,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  loadingText: {
    color: t.colors.textSecondary,
  },
  statusCard: {
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    paddingVertical: t.spacing.sm, 
    paddingHorizontal: t.spacing.md,
    marginBottom: t.spacing.md,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconBadge: {
    width: 44, 
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 2,
  },
  distanceText: {
    fontSize: 26, 
    fontWeight: '800' as const,
    color: t.colors.textPrimary,
    letterSpacing: -0.5,
  },
  departmentText: {
    color: t.colors.textSecondary,
    fontSize: 13,
  },
  deptName: {
    color: t.colors.textPrimary,
    fontWeight: '600' as const,
  },
  badgeContainer: {
    marginTop: t.spacing.xs, 
    width: '100%' as const,
  },
  statusBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: t.radii.full,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: t.spacing.md,
  },
  cardTitle: {
    color: t.colors.textSecondary,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: '70%' as const,
    backgroundColor: t.colors.border,
  },
  metricLabel: {
    color: t.colors.textSecondary,
    fontSize: 12,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: t.colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: t.radii.full,
    marginTop: 4,
  },
  actionsGroup: {
    gap: t.spacing.xs,
  },
  actionButton: {
    marginTop: t.spacing.xs,
  },
  reasonBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingHorizontal: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  reasonText: {
    textAlign: 'center' as const,
    color: t.colors.textSecondary,
    fontSize: 12,
  },
});