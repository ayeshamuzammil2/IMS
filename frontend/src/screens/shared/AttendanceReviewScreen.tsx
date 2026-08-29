import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ShieldAlert, ClipboardList, Lock, ChevronRight, Check, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { FormModal } from '../../components/forms/FormModal';
import { SelectField } from '../../components/forms/SelectField';
import { DateField } from '../../components/forms/DateField';
import { TimeField } from '../../components/forms/TimeField';
import { AuthImage } from '../../components/media/AuthImage';
import {
  attendanceReviewApi,
  type ReviewQueueItemDto,
  type AttendanceOverrideDto,
  type AttendanceEventType,
} from '../../api/resources/attendance.api';
import { internsApi } from '../../api/resources/interns.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

const REASON_OPTIONS = [
  { value: 'DeviceIssue', label: 'Device Issue' },
  { value: 'NetworkOutage', label: 'Network Outage' },
  { value: 'MedicalException', label: 'Medical Exception / Accommodation' },
  { value: 'Other', label: 'Other' },
];

export function AttendanceReviewScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();

  const [noteModal, setNoteModal] = useState<{ dayId: number; kind: 'review' } | { overrideId: number; kind: 'override' } | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const { data: queue = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['attendance', 'review', 'queue'],
    queryFn: attendanceReviewApi.getQueue,
  });
  const { data: overrides = [], isLoading: overridesLoading, refetch: refetchOverrides } = useQuery({
    queryKey: ['attendance', 'review', 'overrides'],
    queryFn: attendanceReviewApi.getPendingOverrides,
  });

  useFocusEffect(
    useCallback(() => {
      refetchQueue();
      refetchOverrides();
    }, [refetchQueue, refetchOverrides]),
  );

  const handleApproveReview = async (item: ReviewQueueItemDto) => {
    setBusyId(item.attendanceDayId);
    try {
      await attendanceReviewApi.decide(item.attendanceDayId, true);
      Toast.show({ type: 'success', text1: 'Attendance approved' });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'review', 'queue'] });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveOverride = async (item: AttendanceOverrideDto) => {
    setBusyId(item.id);
    try {
      await attendanceReviewApi.decideOverride(item.id, true);
      Toast.show({ type: 'success', text1: 'Override approved' });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'review', 'overrides'] });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve override', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!noteModal) return;
    const id = noteModal.kind === 'review' ? noteModal.dayId : noteModal.overrideId;
    setBusyId(id);
    try {
      if (noteModal.kind === 'review') {
        await attendanceReviewApi.decide(noteModal.dayId, false, note.trim() || undefined);
        queryClient.invalidateQueries({ queryKey: ['attendance', 'review', 'queue'] });
      } else {
        await attendanceReviewApi.decideOverride(noteModal.overrideId, false, note.trim() || undefined);
        queryClient.invalidateQueries({ queryKey: ['attendance', 'review', 'overrides'] });
      }
      Toast.show({ type: 'success', text1: 'Rejected' });
      setNoteModal(null);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not reject', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen scroll>
      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {queue.length} review{queue.length === 1 ? '' : 's'} · {overrides.length} override{overrides.length === 1 ? '' : 's'}
        </Text>
        <Button label="Request Override" size="sm" onPress={() => setRequestModalOpen(true)} />
      </View>

      <Text variant="caption" tone="muted" style={s.sectionTitle}>
        FLAGGED ATTENDANCE
      </Text>
      {queueLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : queue.length === 0 ? (
        <View style={s.emptyContainer}>
          <ShieldAlert size={28} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted">
            Nothing flagged for review.
          </Text>
        </View>
      ) : (
        queue.map((item) => (
          <View key={item.attendanceDayId} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.imageGroup}>
                {item.arrivalSelfieFileId ? <AuthImage fileId={item.arrivalSelfieFileId} size={42} /> : null}
                {item.departureSelfieFileId ? <AuthImage fileId={item.departureSelfieFileId} size={42} /> : null}
              </View>
              <View style={s.cardHeaderText}>
                <Text variant="bodyStrong" style={s.nameText}>
                  {item.internFullName}
                </Text>
                <Text variant="caption" tone="muted">
                  {item.internCode} · {new Date(item.workDate).toLocaleDateString()}
                </Text>
                {item.distanceM !== null ? (
                  <Text variant="caption" tone="secondary">
                    {item.distanceM.toFixed(0)}m · {item.geofenceState}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </View>

            {item.flags.length > 0 ? (
              <View style={s.badgeRow}>
                {item.flags.map((flag, idx) => (
                  <View key={idx} style={[s.badge, { backgroundColor: theme.colors.warningBg }]}>
                    <Text variant="caption" tone="warning">
                      {flag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {!item.attendanceReady ? (
              <View style={s.lockRow}>
                <Lock size={14} color={theme.colors.error} />
                <Text variant="caption" tone="error" style={{ flex: 1 }}>
                  Verification pending - review locked.
                </Text>
              </View>
            ) : null}

            <View style={s.divider} />

            <View style={s.iconActionRow}>
              <Pressable
                onPress={() => {
                  setNote('');
                  setNoteModal({ dayId: item.attendanceDayId, kind: 'review' });
                }}
                disabled={busyId === item.attendanceDayId || !item.attendanceReady}
                style={s.iconBtn}
              >
                <X size={20} color={theme.colors.error} />
              </Pressable>
              <Pressable
                onPress={() => handleApproveReview(item)}
                disabled={busyId === item.attendanceDayId || !item.attendanceReady}
                style={s.iconBtn}
              >
                <Check size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Text variant="caption" tone="muted" style={[s.sectionTitle, { marginTop: theme.spacing.lg }]}>
        PENDING OVERRIDES
      </Text>
      {overridesLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : overrides.length === 0 ? (
        <View style={s.emptyContainer}>
          <ClipboardList size={28} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted">
            No override requests pending.
          </Text>
        </View>
      ) : (
        overrides.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardHeaderText}>
                <Text variant="bodyStrong" style={s.nameText}>
                  {item.internFullName}
                </Text>
                <Text variant="caption" tone="muted">
                  {item.eventType} · {item.reasonCode}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </View>

            <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
              {item.justification}
            </Text>

            {isAdmin ? (
              <>
                <View style={s.divider} />
                <View style={s.iconActionRow}>
                  <Pressable
                    onPress={() => {
                      setNote('');
                      setNoteModal({ overrideId: item.id, kind: 'override' });
                    }}
                    disabled={busyId === item.id}
                    style={s.iconBtn}
                  >
                    <X size={20} color={theme.colors.error} />
                  </Pressable>
                  <Pressable onPress={() => handleApproveOverride(item)} disabled={busyId === item.id} style={s.iconBtn}>
                    <Check size={20} color={theme.colors.primary} />
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        ))
      )}

      <FormModal
        visible={noteModal !== null}
        title="Reject Request"
        onClose={() => setNoteModal(null)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setNoteModal(null)} />
            <Button label="Reject" variant="danger" onPress={handleConfirmReject} loading={busyId !== null} />
          </>
        }
      >
        <Input label="Note" value={note} onChangeText={setNote} multiline placeholder="Optional note" />
      </FormModal>

      <RequestOverrideModal
        visible={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequested={() => queryClient.invalidateQueries({ queryKey: ['attendance', 'review', 'overrides'] })}
      />
    </Screen>
  );
}

function RequestOverrideModal({ visible, onClose, onRequested }: { visible: boolean; onClose: () => void; onRequested: () => void }) {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);
  const [internProfileId, setInternProfileId] = useState<number | null>(null);
  const [eventType, setEventType] = useState<AttendanceEventType | null>(null);
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [workDate, setWorkDate] = useState<string | null>(null);
  const [markedTime, setMarkedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: interns = [] } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list(), enabled: visible });
  const internOptions = useMemo(() => interns.map((i) => ({ value: i.id, label: `${i.fullName} (${i.internCode})` })), [interns]);
  const eventTypeOptions = [
    { value: 'Arrival', label: 'Arrival' },
    { value: 'Departure', label: 'Departure' },
  ];

  const selectedIntern = useMemo(
    () => interns.find((i) => i.id === internProfileId) ?? null,
    [interns, internProfileId],
  );
  // Same dual-lock as normal attendance: an override can't be requested for an intern whose
  // profile photo / face enrollment isn't verified yet - it would otherwise be a backdoor around
  // face verification. Mirrors the ATTENDANCE_LOCKED check enforced server-side.
  const isOverrideLocked = selectedIntern !== null && !selectedIntern.attendanceReady;

  const reset = () => {
    setInternProfileId(null);
    setEventType(null);
    setReasonCode(null);
    setJustification('');
    setWorkDate(null);
    setMarkedTime(null);
  };

  const canSubmit = internProfileId && eventType && reasonCode && justification.trim().length >= 20 && workDate && markedTime && !isOverrideLocked;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await attendanceReviewApi.requestOverride(internProfileId, {
        eventType: eventType as AttendanceEventType,
        reasonCode: reasonCode!,
        justification: justification.trim(),
        workDate: workDate!,
        markedAtLocalTime: markedTime!,
      });
      Toast.show({ type: 'success', text1: 'Override requested' });
      reset();
      onRequested();
      onClose();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Could not request override',
        text2: error?.response?.data?.message ?? error?.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      title="Request Attendance Override"
      onClose={onClose}
      footer={
        <>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button label="Submit" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
        </>
      }
    >
      <SelectField label="Intern" required placeholder="Select an intern" value={internProfileId} options={internOptions} onChange={setInternProfileId} />
      {isOverrideLocked ? (
        <View style={s.lockRow}>
          <Lock size={14} color={theme.colors.error} />
          <Text variant="caption" tone="error" style={{ flex: 1 }}>
            Override is locked - this intern's profile photo and face enrollment must be verified first.
          </Text>
        </View>
      ) : null}
      <SelectField label="Event" required placeholder="Arrival or Departure" value={eventType} options={eventTypeOptions} onChange={(v) => setEventType(v as AttendanceEventType)} />
      <SelectField label="Reason" required placeholder="Select a reason" value={reasonCode} options={REASON_OPTIONS} onChange={setReasonCode} />
      <DateField label="Work Date" required value={workDate} onChange={setWorkDate} />
      <TimeField label="Marked At (local)" required value={markedTime} onChange={setMarkedTime} />
      <Input label="Justification" required multiline value={justification} onChangeText={setJustification} helper="At least 20 characters." />
    </FormModal>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  sectionTitle: {
    marginBottom: t.spacing.sm,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    padding: t.spacing.xl,
    gap: t.spacing.sm,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    ...t.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  imageGroup: { flexDirection: 'row' as const, gap: 4 },
  cardHeaderText: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: '600' as const },
  badgeRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: t.spacing.xs,
    marginTop: t.spacing.sm,
  },
  badge: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 3,
    borderRadius: t.radii.full,
  },
  lockRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  iconActionRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: t.spacing.lg,
  },
  iconBtn: { padding: 4 },
});