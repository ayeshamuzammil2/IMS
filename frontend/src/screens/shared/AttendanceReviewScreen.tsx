import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ShieldAlert, ClipboardList, Lock } from 'lucide-react-native';
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
          {queue.length} attendance review{queue.length === 1 ? '' : 's'}, {overrides.length} override{overrides.length === 1 ? '' : 's'}
        </Text>
        <Button label="Request Override" size="sm" onPress={() => setRequestModalOpen(true)} />
      </View>

      <Text variant="overline" tone="muted" style={s.sectionLabel}>
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
            <View style={s.row}>
              {item.arrivalSelfieFileId ? <AuthImage fileId={item.arrivalSelfieFileId} size={48} /> : null}
              {item.departureSelfieFileId ? <AuthImage fileId={item.departureSelfieFileId} size={48} /> : null}
              <View style={s.infoCol}>
                <Text variant="bodyStrong">{item.internFullName}</Text>
                <Text variant="caption" tone="muted">
                  {item.internCode} - {new Date(item.workDate).toLocaleDateString()}
                </Text>
                {item.distanceM !== null ? (
                  <Text variant="caption" tone="muted">
                    {item.distanceM.toFixed(0)}m - {item.geofenceState}
                  </Text>
                ) : null}
              </View>
            </View>
            {item.flags.length > 0 ? (
              <Text variant="caption" tone="warning">
                {item.flags.join(', ')}
              </Text>
            ) : null}
            {!item.attendanceReady ? (
              <View style={s.row}>
                <Lock size={14} color={theme.colors.error} />
                <Text variant="caption" tone="error">
                  Profile Picture approval or Face Enrollment is no longer verified for this intern - review is locked.
                </Text>
              </View>
            ) : null}
            <View style={s.actionsRow}>
              <Button
                label="Reject"
                variant="danger"
                size="sm"
                onPress={() => {
                  setNote('');
                  setNoteModal({ dayId: item.attendanceDayId, kind: 'review' });
                }}
                disabled={busyId === item.attendanceDayId || !item.attendanceReady}
                style={s.actionButton}
              />
              <Button
                label="Approve"
                variant="primary"
                size="sm"
                onPress={() => handleApproveReview(item)}
                loading={busyId === item.attendanceDayId}
                disabled={!item.attendanceReady}
                style={s.actionButton}
              />
            </View>
          </View>
        ))
      )}

      <Text variant="overline" tone="muted" style={s.sectionLabel}>
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
            <Text variant="bodyStrong">{item.internFullName}</Text>
            <Text variant="caption" tone="muted">
              {item.eventType} - {item.reasonCode}
              {item.quotaExceeded ? ' - quota exceeded' : ''}
            </Text>
            <Text variant="body" tone="secondary">
              {item.justification}
            </Text>
            <Text variant="caption" tone="muted">
              Requested: {new Date(item.requestedAtUtc).toLocaleString()}
            </Text>
            {isAdmin ? (
              <View style={s.actionsRow}>
                <Button
                  label="Reject"
                  variant="danger"
                  size="sm"
                  onPress={() => {
                    setNote('');
                    setNoteModal({ overrideId: item.id, kind: 'override' });
                  }}
                  disabled={busyId === item.id}
                  style={s.actionButton}
                />
                <Button
                  label="Approve"
                  variant="primary"
                  size="sm"
                  onPress={() => handleApproveOverride(item)}
                  loading={busyId === item.id}
                  style={s.actionButton}
                />
              </View>
            ) : (
              <Text variant="caption" tone="muted">
                Awaiting admin countersignature.
              </Text>
            )}
          </View>
        ))
      )}

      <FormModal
        visible={noteModal !== null}
        title="Reject"
        onClose={() => setNoteModal(null)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setNoteModal(null)} />
            <Button label="Confirm Reject" variant="danger" size="sm" onPress={handleConfirmReject} loading={busyId !== null} />
          </>
        }
      >
        <Input label="Note" value={note} onChangeText={setNote} multiline placeholder="Optional note" />
      </FormModal>

      <RequestOverrideModal visible={requestModalOpen} onClose={() => setRequestModalOpen(false)} onRequested={() => queryClient.invalidateQueries({ queryKey: ['attendance', 'review', 'overrides'] })} />
    </Screen>
  );
}

function RequestOverrideModal({ visible, onClose, onRequested }: { visible: boolean; onClose: () => void; onRequested: () => void }) {
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

  const reset = () => {
    setInternProfileId(null);
    setEventType(null);
    setReasonCode(null);
    setJustification('');
    setWorkDate(null);
    setMarkedTime(null);
  };

  const canSubmit = internProfileId && eventType && reasonCode && justification.trim().length >= 20 && workDate && markedTime;

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
      Toast.show({ type: 'error', text1: 'Could not request override', text2: error?.message });
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
          <Button label="Cancel" variant="ghost" size="sm" onPress={onClose} />
          <Button label="Submit" size="sm" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
        </>
      }
    >
      <SelectField label="Intern" required placeholder="Select an intern" value={internProfileId} options={internOptions} onChange={setInternProfileId} />
      <SelectField label="Event" required placeholder="Arrival or Departure" value={eventType} options={eventTypeOptions} onChange={(v) => setEventType(v as AttendanceEventType)} />
      <SelectField label="Reason" required placeholder="Select a reason" value={reasonCode} options={REASON_OPTIONS} onChange={setReasonCode} />
      <DateField label="Work Date" required value={workDate} onChange={setWorkDate} />
      <TimeField label="Marked At (local)" required value={markedTime} onChange={setMarkedTime} />
      <Input
        label="Justification"
        required
        multiline
        value={justification}
        onChangeText={setJustification}
        helper="At least 20 characters."
      />
    </FormModal>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: t.spacing.md, gap: t.spacing.md },
  sectionLabel: { marginTop: t.spacing.md, marginBottom: t.spacing.xs, marginLeft: t.spacing.xs },
  emptyContainer: { alignItems: 'center' as const, padding: t.spacing.lg, gap: t.spacing.sm },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    gap: t.spacing.xs,
  },
  row: { flexDirection: 'row' as const, gap: t.spacing.sm, alignItems: 'center' as const },
  infoCol: { flex: 1, gap: 2 },
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.sm, marginTop: t.spacing.sm },
  actionButton: { flex: 1 },
});
