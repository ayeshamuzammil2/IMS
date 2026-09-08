import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Modal, Platform, Linking, AppState } from 'react-native';
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
import { appAlert } from '../../lib/appAlert';
import { isDeviceClockWrong } from '../../lib/deviceTimeSync';
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
  ArrivalAlreadyMarked: 'Check IN has already been marked today.',
  DepartureAlreadyMarked: 'Check OUT has already been marked today.',
  ArrivalNotYetMarked: 'Mark arrival before departure.',
  ActiveSessionAlreadyOpen: 'An attendance session is already in progress.',
  NotVerified: 'Your documents are still pending verification. Attendance unlocks once your mentor approves all of them.',
  FaceNotReady: 'Attendance locked. Pending Profile Picture approval or Face Enrollment.',
  OutsideDailyTimeWindow: 'This is not your internship time. Attendance can only be marked during your assigned daily hours.',
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
  const [locationServicesOff, setLocationServicesOff] = useState(false);
  const [startingEvent, setStartingEvent] = useState<AttendanceEventType | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const [arrivalCooldownEndsAt, setArrivalCooldownEndsAt] = useState<number | null>(null);
  const [arrivalCooldownSecondsLeft, setArrivalCooldownSecondsLeft] = useState(0);
  const [departureCooldownEndsAt, setDepartureCooldownEndsAt] = useState<number | null>(null);
  const [departureCooldownSecondsLeft, setDepartureCooldownSecondsLeft] = useState(0);
  
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const gpsPromptShownRef = useRef(false);
  const submittingEventTypeRef = useRef<AttendanceEventType | null>(null);
  const isLocOffRef = useRef(false); // Track location status to avoid closure staleness

  const [deviceClockWrong, setDeviceClockWrong] = useState(() => isDeviceClockWrong());

  // Cooldown timers
  useEffect(() => {
    if (!arrivalCooldownEndsAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((arrivalCooldownEndsAt - Date.now()) / 1000));
      setArrivalCooldownSecondsLeft(remaining);
      if (remaining <= 0) setArrivalCooldownEndsAt(null);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [arrivalCooldownEndsAt]);

  useEffect(() => {
    if (!departureCooldownEndsAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((departureCooldownEndsAt - Date.now()) / 1000));
      setDepartureCooldownSecondsLeft(remaining);
      if (remaining <= 0) setDepartureCooldownEndsAt(null);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [departureCooldownEndsAt]);

  const { data: today, isLoading, refetch } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.today(),
  });

  const startWatching = useCallback(async (showPromptIfOff: boolean) => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      isLocOffRef.current = true;
      setLocationServicesOff(true);
      setLocationError('Location is turned off. Turn it on to mark attendance.');
      if (showPromptIfOff && !gpsPromptShownRef.current) {
        gpsPromptShownRef.current = true;
        appAlert.alert(
          'Turn on Location',
          'Location needs to be turned on to mark your attendance. Would you like to turn it on now?',
          [
            { text: 'Not now', style: 'cancel', onPress: () => { gpsPromptShownRef.current = false; } },
            {
              text: 'Turn On',
              onPress: async () => {
                gpsPromptShownRef.current = false;
                try {
                  if (Platform.OS === 'android') {
                    await Location.enableNetworkProviderAsync();
                  } else {
                    await Linking.openSettings();
                  }
                } catch {}
                startWatching(false);
              },
            },
          ]
        );
      }
      return;
    }

    isLocOffRef.current = false;
    setLocationServicesOff(false);
    gpsPromptShownRef.current = false;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Location permission is required to mark attendance.');
      return;
    }
    setLocationError(null);
    watchSubscription.current?.remove();
    watchSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 },
      (loc) => setPosition(loc),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      startWatching(true);
      refetch();
      setDeviceClockWrong(isDeviceClockWrong());

      const checkStatus = async () => {
        if (!isActive) return;

        // 1. Update Time Instantly
        setDeviceClockWrong(isDeviceClockWrong());

        // 2. Update Location Instantly
        try {
          const enabled = await Location.hasServicesEnabledAsync();
          if (!isActive) return;

          const isCurrentlyOff = !enabled;

          // If location status changed from background / control center
          if (isCurrentlyOff !== isLocOffRef.current) {
            isLocOffRef.current = isCurrentlyOff;
            setLocationServicesOff(isCurrentlyOff);

            if (isCurrentlyOff) {
              setLocationError('Location is turned off. Turn it on to mark attendance.');
              setPosition(null); // Clear position so banner updates to error immediately
            } else {
              setLocationError(null);
              startWatching(false); // Restart watching
            }
          }

          // Fallback recovery if location is ON but subscription dropped
          if (enabled && !watchSubscription.current) {
            startWatching(false);
          }
        } catch (e) {}
      };

      // Aggressive 1-second polling while screen is focused
      const interval = setInterval(checkStatus, 1000);

      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') checkStatus();
      });

      return () => {
        isActive = false;
        clearInterval(interval);
        subscription.remove();

        watchSubscription.current?.remove();
        watchSubscription.current = null;
        setPosition(null);
        setLocationError(null);
        setLocationServicesOff(false);
        isLocOffRef.current = false;
        gpsPromptShownRef.current = false;
        setStartingEvent(null);
        setActiveSession(null);
        setArrivalCooldownEndsAt(null);
        setArrivalCooldownSecondsLeft(0);
        setDepartureCooldownEndsAt(null);
        setDepartureCooldownSecondsLeft(0);
      };
    }, [startWatching, refetch])
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
        appAlert.alert('Account locked', error?.message ?? 'Your account has been locked due to unofficial activity.', [
          { text: 'OK', onPress: () => signOut() },
        ]);
        return;
      }
      if (FACE_FAILURE_CODES.has(error?.code)) {
        appAlert.alert('Face mismatch detected', error?.message ?? 'Please try again.');
        if (submittingEventTypeRef.current === 'Departure') {
          setDepartureCooldownEndsAt(Date.now() + RETRY_COOLDOWN_SECONDS * 1000);
        } else {
          setArrivalCooldownEndsAt(Date.now() + RETRY_COOLDOWN_SECONDS * 1000);
        }
        return;
      }
      Toast.show({ type: 'error', text1: 'Could not mark attendance', text2: error?.message });
    },
  });

  const onStart = async (eventType: AttendanceEventType) => {
    if (isDeviceClockWrong()) return;

    if (locationServicesOff) {
      startWatching(true);
      return;
    }

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
        appAlert.alert('Account locked', error?.message ?? 'Your account has been locked due to unofficial activity.', [
          { text: 'OK', onPress: () => signOut() },
        ]);
      } else {
        Toast.show({ type: 'error', text1: 'Could not start attendance', text2: error?.message });
      }
    } finally {
      setStartingEvent(null);
    }
  };

  const arrivalOnCooldown = arrivalCooldownSecondsLeft > 0;
  const departureOnCooldown = departureCooldownSecondsLeft > 0;

  const arrivalBlocked =
    (today?.arrivalBlockers.length ?? 0) > 0 || geofenceState === 'Outside' || geofenceState === null || arrivalOnCooldown || deviceClockWrong;
  const departureBlocked =
    (today?.departureBlockers.length ?? 0) > 0 || geofenceState === 'Outside' || geofenceState === null || departureOnCooldown || deviceClockWrong;

  const arrivalReason = deviceClockWrong
    ? "Your phone's date/time is incorrect. Please fix it to mark attendance."
    : arrivalOnCooldown
      ? `Please wait ${arrivalCooldownSecondsLeft}s before trying again.`
      : today?.arrivalBlockers[0]
        ? blockerMessages[today.arrivalBlockers[0]]
        : null;

  const departureReason = deviceClockWrong
    ? "Your phone's date/time is incorrect. Please fix it to mark attendance."
    : departureOnCooldown
      ? `Please wait ${departureCooldownSecondsLeft}s before trying again.`
      : today?.departureBlockers[0]
        ? blockerMessages[today.departureBlockers[0]]
        : null;

  const activeReason = departureReason || arrivalReason;

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
            <View
              style={[
                s.statusBanner,
                {
                  backgroundColor: locationServicesOff ? `${theme.colors.warning}10` : `${theme.colors.error}10`,
                  borderColor: locationServicesOff ? `${theme.colors.warning}30` : `${theme.colors.error}30`,
                },
              ]}
            >
              <ShieldAlert
                size={16}
                color={locationServicesOff ? theme.colors.warning : theme.colors.error}
                style={s.bannerIcon}
              />
              <Text
                variant="caption"
                style={[
                  s.statusBannerText,
                  { color: locationServicesOff ? theme.colors.warning : theme.colors.error },
                ]}
              >
                {locationError}
              </Text>
            </View>
          ) : geofenceState === 'Outside' ? (
            <View style={[s.statusBanner, { backgroundColor: `${theme.colors.error}10`, borderColor: `${theme.colors.error}30` }]}>
              <AlertCircle size={16} color={theme.colors.error} style={s.bannerIcon} />
              <Text variant="caption" style={[s.statusBannerText, { color: theme.colors.error }]}>
                Move within {today.geofenceRadiusMeters}m to mark attendance
              </Text>
            </View>
          ) : geofenceState === 'Uncertain' ? (
            <View style={[s.statusBanner, { backgroundColor: `${theme.colors.warning}10`, borderColor: `${theme.colors.warning}30` }]}>
              <AlertCircle size={16} color={theme.colors.warning} style={s.bannerIcon} />
              <Text variant="caption" style={[s.statusBannerText, { color: theme.colors.warning }]}>
                Close to boundary - flagged for mentor review
              </Text>
            </View>
          ) : geofenceState === 'Inside' ? (
            <View style={[s.statusBanner, { backgroundColor: `${theme.colors.success}10`, borderColor: `${theme.colors.success}30` }]}>
              <CheckCircle2 size={16} color={theme.colors.success} style={s.bannerIcon} />
              <Text variant="caption" style={[s.statusBannerText, { color: theme.colors.success }]}>
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
            label="CHECK IN"
            value={today.arrivalMarked ? formatTime(today.arrivalAtUtc) : 'Not marked'}
            badge={today.arrivalIsLate ? 'Late' : today.arrivalMarked ? 'On Time' : null}
            isLate={today.arrivalIsLate}
          />
          <View style={s.metricDivider} />
          <MetricBox
            label="CHECK OUT"
            value={today.departureMarked ? formatTime(today.departureAtUtc) : 'Not marked'}
            badge={today.departureIsEarly ? 'Early' : today.departureMarked ? 'Done' : null}
            isLate={today.departureIsEarly}
          />
        </View>
      </View>

      <View style={s.actionsGroup}>
        <Button
          label={startingEvent === 'Arrival' ? 'Initializing...' : 'Check IN'}
          onPress={() => onStart('Arrival')}
          disabled={arrivalBlocked || startingEvent !== null}
          loading={startingEvent === 'Arrival'}
          fullWidth
        />

        <Button
          label={startingEvent === 'Departure' ? 'Initializing...' : 'Check OUT'}
          variant="outline"
          onPress={() => onStart('Departure')}
          disabled={departureBlocked || startingEvent !== null}
          loading={startingEvent === 'Departure'}
          fullWidth
        />

        {activeReason ? (
          <View style={s.reasonBox}>
            <AlertCircle size={16} color={theme.colors.textSecondary} style={s.reasonIcon} />
            <Text variant="caption" style={s.reasonText}>
              {activeReason}
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
              submittingEventTypeRef.current = activeSession.eventType;
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
  container: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: t.spacing.xl },
  centerLoading: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, gap: t.spacing.sm },
  loadingText: { color: t.colors.textSecondary },
  statusCard: { alignItems: 'center' as const, backgroundColor: t.colors.surface, borderRadius: t.radii.lg, borderWidth: 1.5, paddingVertical: t.spacing.md, paddingHorizontal: t.spacing.md, marginBottom: t.spacing.md, shadowColor: t.colors.textPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  iconBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 4 },
  distanceText: { fontSize: 28, fontWeight: '800' as const, color: t.colors.textPrimary, letterSpacing: -0.5 },
  departmentText: { color: t.colors.textSecondary, fontSize: 13 },
  deptName: { color: t.colors.textPrimary, fontWeight: '600' as const },
  badgeContainer: { marginTop: t.spacing.md, width: '100%' as const },
  statusBanner: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, paddingVertical: 10, paddingHorizontal: 12, borderRadius: t.radii.md, borderWidth: 1, width: '100%' as const, gap: 10 },
  bannerIcon: { marginTop: 2 },
  statusBannerText: { fontSize: 12, lineHeight: 18, fontWeight: '500' as const, textAlign: 'left' as const, flex: 1 },
  card: { backgroundColor: t.colors.surface, borderRadius: t.radii.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.lg, marginBottom: t.spacing.lg },
  cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: t.spacing.md },
  cardTitle: { color: t.colors.textSecondary, fontWeight: '700' as const, letterSpacing: 0.8, fontSize: 11 },
  metricsRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  metricBox: { flex: 1, alignItems: 'center' as const, gap: 2 },
  metricDivider: { width: 1, height: '70%' as const, backgroundColor: t.colors.border },
  metricLabel: { color: t.colors.textSecondary, fontSize: 12 },
  metricValue: { fontSize: 16, fontWeight: '700' as const, color: t.colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: t.radii.full, marginTop: 4 },
  actionsGroup: { gap: t.spacing.sm },
  reasonBox: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: t.colors.surfaceSunken, paddingVertical: 12, paddingHorizontal: 16, borderRadius: t.radii.md, marginTop: 4, gap: 8, width: '100%' as const },
  reasonIcon: { flexShrink: 0 },
  reasonText: { flexShrink: 1, textAlign: 'left' as const, color: t.colors.textSecondary, fontSize: 12, fontWeight: '500' as const, lineHeight: 18 },
});