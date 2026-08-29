import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Pencil, Info } from 'lucide-react-native';
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

// Display Helper: CNIC (XXXXX-XXXXXXX-X)
function formatCnic(cnic?: string | null): string | null {
  if (!cnic) return null;
  const digits = cnic.replace(/\D/g, '').slice(0, 13);
  if (digits.length !== 13) return cnic;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

// Display/Input Helper: Phone (+92 3XX XXXXXXX)
function formatPhone(phone?: string | null): string {
  if (!phone) return '+92 ';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (digits.length === 0) return '+92 ';
  return `+92 ${digits}`;
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
      <View style={s.profileHeader}>
        <View style={s.photoWrap}>
          {data.approvedPhotoFileId ? (
            <AuthImage fileId={data.approvedPhotoFileId} size={110} style={s.photo} />
          ) : (
            <RoleAvatar name={data.fullName} size={110} />
          )}
          <Pressable onPress={goToDocuments} style={[s.editButton, { backgroundColor: theme.colors.primary }]} hitSlop={4}>
            <Pencil size={15} color={theme.colors.onPrimary} />
          </Pressable>
        </View>

        <Text variant="h2" style={s.name}>
          {data.fullName}
        </Text>
        <Text variant="caption" tone="muted" style={s.internCode}>
          {data.internCode}
        </Text>
      </View>

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
        <Row label="Phone" value={data.phone ? formatPhone(data.phone) : null} />
        <Row label="CNIC" value={formatCnic(data.cnic)} isLast />
      </View>

      <Text variant="overline" tone="muted" style={s.sectionLabel}>
        SELF DETAILS
      </Text>
      <View style={s.card}>
        {isSelfDetailsSubmitted ? (
          <>
            <Row label="Address" value={data.address} />
            <Row label="Emergency Contact Name" value={data.emergencyContactName} />
            <Row label="Emergency Contact Phone" value={data.emergencyContactPhone ? formatPhone(data.emergencyContactPhone) : null} />
            <Row label="Blood Group" value={data.bloodGroup} isLast />

            <View style={s.noticeBox}>
              <Info size={16} color={theme.colors.textMuted} />
              <Text variant="caption" tone="muted" style={s.noticeText}>
                To modify or update these details, please contact your mentor.
              </Text>
            </View>
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
  const s = useThemedStyles(makeStyles);
  const [address, setAddress] = useState(initial.address ?? '');
  const [emergencyName, setEmergencyName] = useState(initial.emergencyContactName ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(formatPhone(initial.emergencyContactPhone));
  const [bloodGroup, setBloodGroup] = useState(initial.bloodGroup ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const cleanEmPhone = emergencyPhone.trim() === '+92' ? null : emergencyPhone.trim();
      await documentsApi.submitSelfDetails({
        address: address.trim() || null,
        emergencyContactName: emergencyName.trim() || null,
        emergencyContactPhone: cleanEmPhone,
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
    <View style={s.formGap}>
      <Input label="Address" value={address} onChangeText={setAddress} multiline />
      <Input label="Emergency Contact Name" value={emergencyName} onChangeText={setEmergencyName} />
      <Input
        label="Emergency Contact Phone"
        value={emergencyPhone}
        onChangeText={(text) => setEmergencyPhone(formatPhone(text))}
        keyboardType="phone-pad"
        placeholder="+92 3XX XXXXXXX"
      />
      <Input label="Blood Group" value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. O+" />
      <Button label="Save Details" onPress={handleSubmit} loading={submitting} fullWidth style={s.saveBtn} />
    </View>
  );
}

function Row({ label, value, isLast }: { label: string; value?: string | null; isLast?: boolean }) {
  const s = useThemedStyles(makeStyles);
  if (!value) return null;
  return (
    <View style={[s.infoRow, !isLast && s.rowBorder]}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="body" style={s.rowValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  profileHeader: {
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  photoWrap: {
    alignSelf: 'center' as const,
    marginBottom: t.spacing.xs,
    position: 'relative' as const,
    borderRadius: t.radii.lg,
    padding: 3,
    backgroundColor: t.colors.surface,
    borderWidth: 1.5,
    borderColor: t.colors.border,
  },
  photo: {
    width: 110,
    height: 130,
    borderRadius: t.radii.md,
  },
  editButton: {
    position: 'absolute' as const,
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: t.radii.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: t.colors.surface,
    zIndex: 2,
  },
  name: {
    textAlign: 'center' as const,
    fontSize: 20,
    marginTop: t.spacing.xs,
  },
  internCode: {
    textAlign: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  sectionLabel: {
    marginTop: t.spacing.md,
    marginBottom: t.spacing.xs,
    marginLeft: t.spacing.xs,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.xs,
  },
  infoRow: {
    gap: 2,
    paddingVertical: t.spacing.xs,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    paddingBottom: t.spacing.xs + 2,
    marginBottom: t.spacing.xs,
  },
  rowValue: {
    fontWeight: '500' as const,
  },
  noticeBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.xs,
    backgroundColor: t.colors.surfaceSunken,
    padding: t.spacing.md,
    borderRadius: t.radii.md,
    marginTop: t.spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
  },
  formGap: {
    gap: t.spacing.sm,
  },
  saveBtn: {
    marginTop: t.spacing.xs,
  },
});