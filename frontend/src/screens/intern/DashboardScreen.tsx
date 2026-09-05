import React, { useCallback, useState, useRef } from 'react';
import { Pressable, View, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Pencil, Info, User, ShieldCheck } from 'lucide-react-native';
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

function formatCnic(cnic?: string | null): string | null {
  if (!cnic) return null;
  const digits = cnic.replace(/\D/g, '').slice(0, 13);
  if (digits.length !== 13) return cnic;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

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

  const scrollRef = useRef<ScrollView>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', 'dashboard'],
    queryFn: documentsApi.getDashboard,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [refetch]),
  );

  const goToDocuments = () => (navigation.getParent()?.navigate as (name: string) => void)?.('Documents');

  if (isLoading || !data) {
    return (
      <Screen scroll={false}>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" style={s.loadingText}>Loading Dashboard profile...</Text>
        </View>
      </Screen>
    );
  }

  const isSelfDetailsSubmitted = Boolean(
    data.address || data.emergencyContactName || data.emergencyContactPhone || data.bloodGroup
  );

  return (
    <Screen scroll={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={s.profileHeader}>
          <View style={s.photoWrap}>
            {data.approvedPhotoFileId ? (
              <AuthImage fileId={data.approvedPhotoFileId} size={110} style={s.photo} />
            ) : (
              <RoleAvatar name={data.fullName} size={110} />
            )}
            <Pressable onPress={goToDocuments} style={s.editButton} hitSlop={4}>
              <Pencil size={14} color={theme.colors.onPrimary} />
            </Pressable>
          </View>

          <Text variant="h1" style={s.name}>
            {data.fullName}
          </Text>
          <Text variant="caption" style={s.internCode}>
            {data.internCode}
          </Text>
        </View>

        <VerificationBanner status={data.verificationStatus} />

        {/* Internship Details Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <ShieldCheck size={16} color={theme.colors.primary} />
            <Text variant="overline" style={s.cardTitle}>
              INTERNSHIP DETAILS
            </Text>
          </View>

          <View style={s.detailsGroup}>
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
        </View>

        {/* Self Details Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <User size={16} color={theme.colors.primary} />
            <Text variant="overline" style={s.cardTitle}>
              PERSONAL DETAILS
            </Text>
          </View>

          {isSelfDetailsSubmitted ? (
            <View style={s.detailsGroup}>
              <Row label="Address" value={data.address} />
              <Row label="Emergency Contact Name" value={data.emergencyContactName} />
              <Row label="Emergency Contact Phone" value={data.emergencyContactPhone ? formatPhone(data.emergencyContactPhone) : null} />
              <Row label="Blood Group" value={data.bloodGroup} isLast />

              <View style={s.noticeBox}>
                <Info size={15} color={theme.colors.textSecondary} />
                <Text variant="caption" style={s.noticeText}>
                  To modify or update these details, please contact your mentor.
                </Text>
              </View>
            </View>
          ) : (
            <SelfDetailsForm
              initial={data}
              onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['documents', 'dashboard'] })}
            />
          )}
        </View>
      </ScrollView>
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
    <View style={s.formGroup}>
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
    <View style={s.infoRowGroup}>
      <View style={s.infoRow}>
        <Text variant="caption" style={s.rowLabel}>
          {label}
        </Text>
        <Text variant="body" style={s.rowValue}>
          {value}
        </Text>
      </View>
      {!isLast && <View style={s.rowDivider} />}
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 3,
    paddingTop: t.spacing.md,
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
    borderRadius: 16,
    backgroundColor: t.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: t.colors.surface,
    elevation: 3,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: t.colors.textPrimary,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  internCode: {
    color: t.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 2,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: t.spacing.sm,
  },
  cardTitle: {
    color: t.colors.textSecondary,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  detailsGroup: {
    gap: 0,
  },
  infoRowGroup: {
    width: '100%' as const,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 4,
  },
  rowLabel: {
    color: t.colors.textSecondary,
    fontSize: 13,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.colors.textPrimary,
    textAlign: 'right' as const,
    flexShrink: 1,
    marginLeft: t.spacing.sm,
  },
  rowDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: 6,
  },
  noticeBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.xs,
    backgroundColor: t.colors.surfaceSunken,
    padding: t.spacing.sm,
    borderRadius: t.radii.md,
    marginTop: t.spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  formGroup: {
    gap: t.spacing.md,
  },
  saveBtn: {
    marginTop: t.spacing.xs,
  },
});