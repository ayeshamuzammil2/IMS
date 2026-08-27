import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Pencil } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { AuthImage } from '../../components/media/AuthImage';
import { RoleAvatar } from '../../components/media/RoleAvatar';
import { VerificationBanner } from '../../components/data/VerificationBanner';
import { documentsApi, type InternDashboardDto } from '../../api/resources/documents.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(hms: string): string {
  const [h, m] = hms.split(':');
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function DashboardScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', 'dashboard'],
    queryFn: documentsApi.getDashboard,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const goToDocuments = () => (navigation.getParent()?.navigate as (name: string) => void)?.('Documents');

  if (isLoading || !data) {
    return (
      <Screen>
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      </Screen>
    );
  }

  // Check if self details have already been submitted
  const isSelfDetailsSubmitted = Boolean(
    data.address || data.emergencyContactName || data.emergencyContactPhone || data.bloodGroup
  );

  return (
    <Screen scroll>
      <View style={s.photoWrap}>
        {data.approvedPhotoFileId ? (
          <AuthImage fileId={data.approvedPhotoFileId} size={130} style={s.photo} />
        ) : (
          <RoleAvatar name={data.fullName} size={110} />
        )}
        <Pressable onPress={goToDocuments} style={[s.editButton, { backgroundColor: theme.colors.primary }]} hitSlop={4}>
          <Pencil size={16} color={theme.colors.onPrimary} />
        </Pressable>
      </View>

      <Text variant="h2" style={s.name}>
        {data.fullName}
      </Text>
      <Text variant="caption" tone="muted" style={s.internCode}>
        {data.internCode}
      </Text>

      <VerificationBanner status={data.verificationStatus} />

      <Text variant="overline" tone="muted" style={s.sectionLabel}>
        INTERNSHIP DETAILS
      </Text>
      <View style={s.card}>
        <Row label="Department" value={data.departmentName} />
        <Row label="Mentor" value={data.mentorName} />
        <Row label="Start Date" value={formatDate(data.internshipStartDate)} />
        <Row label="End Date" value={formatDate(data.internshipEndDate)} />
        <Row label="Daily Hours" value={`${formatTime(data.dailyStartTime)} - ${formatTime(data.dailyEndTime)}`} />
        <Row label="University" value={data.universityName} />
        <Row label="Degree Program" value={data.degreeProgram} />
        <Row label="Email" value={data.email} />
        <Row label="Phone" value={data.phone} />
        <Row label="CNIC" value={data.cnic} />
      </View>

      <Text variant="overline" tone="muted" style={s.sectionLabel}>
        SELF DETAILS
      </Text>
      <View style={s.card}>
        {isSelfDetailsSubmitted ? (
          <>
            <Row label="Address" value={data.address} />
            <Row label="Emergency Contact Name" value={data.emergencyContactName} />
            <Row label="Emergency Contact Phone" value={data.emergencyContactPhone} />
            <Row label="Blood Group" value={data.bloodGroup} />
            
            {/* Professional Notice Message */}
            <Text variant="caption" tone="muted" style={s.noticeText}>
              To modify or update these details, please contact your mentor.
            </Text>
          </>
        ) : (
          <SelfDetailsForm
            initial={data}
            onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['documents', 'dashboard'] })}
          />
        )}
      </View>
    </Screen>
  );
}

function SelfDetailsForm({ initial, onSubmitted }: { initial: InternDashboardDto; onSubmitted: () => void }) {
  const [address, setAddress] = useState(initial.address ?? '');
  const [emergencyName, setEmergencyName] = useState(initial.emergencyContactName ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(initial.emergencyContactPhone ?? '');
  const [bloodGroup, setBloodGroup] = useState(initial.bloodGroup ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await documentsApi.submitSelfDetails({
        address: address.trim() || null,
        emergencyContactName: emergencyName.trim() || null,
        emergencyContactPhone: emergencyPhone.trim() || null,
        bloodGroup: bloodGroup.trim() || null,
      });
      Toast.show({ type: 'success', text1: 'Details saved successfully' });
      onSubmitted();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not save details', text2: error?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Input label="Address" value={address} onChangeText={setAddress} multiline />
      <Input label="Emergency Contact Name" value={emergencyName} onChangeText={setEmergencyName} />
      <Input label="Emergency Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />
      <Input label="Blood Group" value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. O+" />
      <Button label="Save Details" onPress={handleSubmit} loading={submitting} fullWidth />
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  const s = useThemedStyles(makeStyles);
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  photoWrap: {
    alignSelf: 'center' as const,
    marginBottom: t.spacing.md,
    position: 'relative' as const,
    borderRadius: t.radii.lg,
    padding: 3,
    backgroundColor: t.colors.surface,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  photo: {
    width: 110,
    height: 140,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.primary,
  },
  editButton: {
    position: 'absolute' as const,
    bottom: -4,
    right: -4,
    width: 34,
    height: 34,
    borderRadius: t.radii.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: t.colors.surface,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  name: { textAlign: 'center' as const, marginTop: t.spacing.xs },
  internCode: { textAlign: 'center' as const, marginBottom: t.spacing.lg },
  sectionLabel: { marginTop: t.spacing.sm, marginBottom: t.spacing.xs, marginLeft: t.spacing.xs },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    marginBottom: t.spacing.lg,
  },
  infoRow: { gap: 2 },
  noticeText: {
    marginTop: t.spacing.xs,
    fontStyle: 'italic' as const,
  },
});