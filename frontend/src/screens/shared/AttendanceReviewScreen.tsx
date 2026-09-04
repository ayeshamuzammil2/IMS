import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ShieldAlert, ClipboardList, Lock, ChevronRight, Check, X, Search } from 'lucide-react-native';
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

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

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

  const filteredQueue = useMemo(() => {
    if (!search.trim()) return queue;
    const q = search.toLowerCase().trim();
    return queue.filter((i) => i.internFullName?.toLowerCase().includes(q) || i.internCode?.toLowerCase().includes(q));
  }, [queue, search]);

  const filteredOverrides = useMemo(() => {
    if (!search.trim()) return overrides;
    const q = search.toLowerCase().trim();
    return overrides.filter((i) => i.internFullName?.toLowerCase().includes(q) || i.reasonCode?.toLowerCase().includes(q));
  }, [overrides, search]);

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

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

  const renderQueueItem = ({ item }: { item: ReviewQueueItemDto }) => {
    const isBusy = busyId === item.attendanceDayId;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.imageGroup}>
            {item.arrivalSelfieFileId ? (
              <AuthImage fileId={item.arrivalSelfieFileId} size={44} style={s.avatarImage} />
            ) : null}
            {item.departureSelfieFileId ? (
              <AuthImage fileId={item.departureSelfieFileId} size={44} style={s.avatarImage} />
            ) : null}
            {!item.arrivalSelfieFileId && !item.departureSelfieFileId && (
              <View style={s.avatarBadge}>
                <Text variant="bodyStrong" style={s.avatarText}>
                  {item.internFullName?.charAt(0).toUpperCase() || 'I'}
                </Text>
              </View>
            )}
          </View>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
              {item.internFullName}
            </Text>
            <Text variant="caption" tone="muted" style={s.emailText} numberOfLines={1}>
              {item.internCode} · {new Date(item.workDate).toLocaleDateString()}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </View>

        <View style={s.metaInfoRow}>
          {item.distanceM !== null && (
            <View style={s.metaChip}>
              <Text variant="caption" tone="secondary" style={s.metaChipText}>
                {item.distanceM.toFixed(0)}m · {item.geofenceState}
              </Text>
            </View>
          )}

          {item.flags.length > 0 && (
            <View style={s.flagsRow}>
              {item.flags.map((flag, idx) => (
                <View key={idx} style={[s.badge, { backgroundColor: theme.colors.warningBg || '#FEF3C7' }]}>
                  <Text variant="caption" tone="warning" style={s.badgeText}>
                    {flag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!item.attendanceReady && (
          <View style={s.lockRow}>
            <Lock size={14} color={theme.colors.error} />
            <Text variant="caption" tone="error" style={{ flex: 1 }}>
              Verification pending - review locked.
            </Text>
          </View>
        )}

        <View style={s.divider} />

        <View style={s.actionsRow}>
          <Pressable
            hitSlop={8}
            style={s.actionIcon}
            disabled={isBusy || !item.attendanceReady}
            onPress={() => {
              setNote('');
              setNoteModal({ dayId: item.attendanceDayId, kind: 'review' });
            }}
          >
            <X size={16} color={theme.colors.error} />
          </Pressable>
          <Pressable
            hitSlop={8}
            style={s.actionIcon}
            disabled={isBusy || !item.attendanceReady}
            onPress={() => handleApproveReview(item)}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Check size={16} color={theme.colors.success} />
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderOverrideItem = ({ item }: { item: AttendanceOverrideDto }) => {
    const isBusy = busyId === item.id;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.avatarBadge}>
            <Text variant="bodyStrong" style={s.avatarText}>
              {item.internFullName?.charAt(0).toUpperCase() || 'I'}
            </Text>
          </View>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
              {item.internFullName}
            </Text>
            <Text variant="caption" tone="muted" style={s.emailText} numberOfLines={1}>
              {item.eventType} · {item.reasonCode}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </View>

        <View style={s.metaInfoRow}>
          <Text variant="body" tone="secondary" style={s.justificationText}>
            {item.justification}
          </Text>
        </View>

        {isAdmin && (
          <>
            <View style={s.divider} />
            <View style={s.actionsRow}>
              <Pressable
                hitSlop={8}
                style={s.actionIcon}
                disabled={isBusy}
                onPress={() => {
                  setNote('');
                  setNoteModal({ overrideId: item.id, kind: 'override' });
                }}
              >
                <X size={16} color={theme.colors.error} />
              </Pressable>
              <Pressable hitSlop={8} style={s.actionIcon} disabled={isBusy} onPress={() => handleApproveOverride(item)}>
                {isBusy ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Check size={16} color={theme.colors.success} />
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <Screen scroll={false} style={s.screenContainer}>
      <View style={s.headerContainer}>
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {queue.length} REVIEWS · {overrides.length} OVERRIDES
            </Text>
          </View>
          <Button label="Request Override" size="sm" onPress={() => setRequestModalOpen(true)} />
        </View>

        <View style={s.subHeaderRow}>
          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? (
              <X size={18} color={theme.colors.primary} />
            ) : (
              <Search size={18} color={theme.colors.textMuted} />
            )}
          </Pressable>
        </View>

        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search reviews or overrides..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        style={s.list}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <Text variant="caption" tone="muted" style={s.sectionTitle}>
              FLAGGED ATTENDANCE
            </Text>

            {queueLoading ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : filteredQueue.length === 0 ? (
              <View style={s.emptyBox}>
                <ShieldAlert size={28} color={theme.colors.textMuted} />
                <Text variant="body" tone="muted" style={{ marginTop: 8 }}>
                  Nothing flagged for review.
                </Text>
              </View>
            ) : (
              filteredQueue.map((item) => <React.Fragment key={item.attendanceDayId}>{renderQueueItem({ item })}</React.Fragment>)
            )}

            <Text variant="caption" tone="muted" style={[s.sectionTitle, { marginTop: theme.spacing.lg }]}>
              PENDING OVERRIDES
            </Text>

            {overridesLoading ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : filteredOverrides.length === 0 ? (
              <View style={s.emptyBox}>
                <ClipboardList size={28} color={theme.colors.textMuted} />
                <Text variant="body" tone="muted" style={{ marginTop: 8 }}>
                  No override requests pending.
                </Text>
              </View>
            ) : (
              filteredOverrides.map((item) => <React.Fragment key={item.id}>{renderOverrideItem({ item })}</React.Fragment>)
            )}
          </>
        }
      />

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
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  headerContainer: {
    marginBottom: t.spacing.md,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  headerTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flexShrink: 1,
  },
  titleIndicator: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: t.colors.primary,
  },
  headerLabel: {
    letterSpacing: 1,
  },
  subHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    marginTop: t.spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconButtonActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.surfaceSunken,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
  },
  sectionTitle: {
    marginBottom: t.spacing.sm,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  list: { flex: 1 },
  listContent: {
    paddingBottom: t.spacing.xl * 1.5,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
  },
  imageGroup: {
    flexDirection: 'row' as const,
    gap: 4,
  },
  avatarImage: {
    borderRadius: 12,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    color: t.colors.primary,
    fontSize: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  emailText: {
    marginTop: 3,
  },
  metaInfoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 14,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  metaChip: {
    backgroundColor: t.colors.surfaceSunken,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 12,
  },
  flagsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  justificationText: {
    fontSize: 13,
  },
  lockRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.xs,
    marginTop: t.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    paddingTop: 4,
  },
  actionIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: t.colors.surfaceSunken,
  },
  emptyBox: {
    paddingVertical: t.spacing.xl,
    alignItems: 'center' as const,
  },
  centerBox: {
    paddingVertical: t.spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});