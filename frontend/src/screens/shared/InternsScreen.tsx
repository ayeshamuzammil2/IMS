import React, { useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Power, PowerOff, KeyRound, Trash2, Unlock, Fingerprint, ChevronRight, Search, X, Users } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { FormModal } from '../../components/forms/FormModal';
import { SelectField } from '../../components/forms/SelectField';
import { DateField } from '../../components/forms/DateField';
import { TimeField } from '../../components/forms/TimeField';
import { PasswordStrengthChecklist } from '../../components/forms/PasswordStrengthChecklist';
import { passwordSchema } from '../../lib/passwordPolicy';
import { mentorsApi } from '../../api/resources/mentors.api';
import { internsApi, type InternDto } from '../../api/resources/interns.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

// Helper: Format Phone (+92 3XX XXXXXXX)
function formatPhoneInput(text: string): string {
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('92')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (digits.length === 0) return '+92 ';
  return `+92 ${digits}`;
}

// Helper: Format CNIC (XXXXX-XXXXXXX-X)
function formatCnicInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  } else if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  } else {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }
}

const formShape = {
  fullName: z.string().min(1, 'Full name is required.').max(150),
  phone: z.string().optional(),
  mentorId: z.number().int().positive().nullable(),
  internshipStartDate: z.string().min(1, 'Start date is required.'),
  internshipEndDate: z.string().min(1, 'End date is required.'),
  dailyStartTime: z.string().min(1, 'Start time is required.'),
  dailyEndTime: z.string().min(1, 'End time is required.'),
  universityName: z.string().optional(),
  degreeProgram: z.string().optional(),
};

const selfDetailsShape = {
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bloodGroup: z.string().optional(),
};

const dateTimeRefines = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine((data: any) => data.internshipEndDate > data.internshipStartDate, {
      message: 'End date must be after start date.',
      path: ['internshipEndDate'],
    })
    .refine((data: any) => data.dailyEndTime > data.dailyStartTime, {
      message: 'End time must be after start time.',
      path: ['dailyEndTime'],
    });

const createSchema = dateTimeRefines(
  z.object({
    ...formShape,
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    cnic: z.string().min(1, 'CNIC is required.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm the password.'),
  }),
).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});
const updateSchema = dateTimeRefines(z.object({ ...formShape, ...selfDetailsShape }));
const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1, 'Please confirm the password.') })
  .refine((data) => data.password === data.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

type CreateValues = z.infer<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const emptyCreate: CreateValues = {
  fullName: '',
  email: '',
  cnic: '',
  phone: '+92 ',
  mentorId: null,
  internshipStartDate: '',
  internshipEndDate: '',
  dailyStartTime: '',
  dailyEndTime: '',
  universityName: '',
  degreeProgram: '',
  password: '',
  confirmPassword: '',
};

export function InternsScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InternDto | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<InternDto | null>(null);

  // Search State
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch(!showSearch);
  };

  const { data: interns = [], isLoading } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });

  // Filtered Interns Logic
  const filteredInterns = useMemo(() => {
    if (!search.trim()) return interns;
    const query = search.toLowerCase().trim();
    return interns.filter(
      (i) =>
        i.fullName.toLowerCase().includes(query) ||
        i.internCode.toLowerCase().includes(query) ||
        i.email.toLowerCase().includes(query) ||
        (i.mentorName && i.mentorName.toLowerCase().includes(query)),
    );
  }, [interns, search]);

  const { data: mentorOptions = [] } = useQuery({
    queryKey: ['mentors', 'active'],
    queryFn: () => mentorsApi.list({ isActive: true }),
    enabled: isAdmin,
  });
  const mentorSelectOptions = useMemo(
    () => mentorOptions.map((m) => ({ value: m.id, label: `${m.fullName} (${m.departmentName})` })),
    [mentorOptions],
  );

  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: emptyCreate });
  const updateForm = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { ...emptyCreate, ...{ address: '', emergencyContactName: '', emergencyContactPhone: '+92 ', bloodGroup: '' } },
  });
  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const createPassword = createForm.watch('password');
  const createFullName = createForm.watch('fullName');
  const resetPassword = resetPasswordForm.watch('password');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['interns'] });

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) => {
      const cleanPhone = values.phone?.trim() === '+92' ? null : values.phone?.trim();
      return internsApi.create({
        ...values,
        phone: cleanPhone || null,
        universityName: values.universityName?.trim() ? values.universityName : null,
        degreeProgram: values.degreeProgram?.trim() ? values.degreeProgram : null,
      });
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Intern created', text2: 'Share the password you set with them directly.' });
      invalidate();
      closeModal();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not create intern', text2: error?.response?.data?.message ?? error?.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateValues }) => {
      const cleanPhone = body.phone?.trim() === '+92' ? null : body.phone?.trim();
      const cleanEmPhone = body.emergencyContactPhone?.trim() === '+92' ? null : body.emergencyContactPhone?.trim();
      return internsApi.update(id, {
        ...body,
        phone: cleanPhone || null,
        universityName: body.universityName?.trim() ? body.universityName : null,
        degreeProgram: body.degreeProgram?.trim() ? body.degreeProgram : null,
        address: body.address?.trim() ? body.address : null,
        emergencyContactName: body.emergencyContactName?.trim() ? body.emergencyContactName : null,
        emergencyContactPhone: cleanEmPhone || null,
        bloodGroup: body.bloodGroup?.trim() ? body.bloodGroup : null,
      });
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Intern updated' });
      invalidate();
      closeModal();
    },
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not update intern', text2: error?.message }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (i: InternDto) => (i.isActive ? internsApi.deactivate(i.id) : internsApi.reactivate(i.id)),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Intern updated' });
      invalidate();
    },
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not update intern', text2: error?.message }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => internsApi.resetPassword(id, newPassword),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Password reset', text2: 'They must sign in with the new password and set their own.' });
      setResetPasswordTarget(null);
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not reset password', text2: error?.response?.data?.message ?? error?.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => internsApi.delete(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Intern deleted' });
      invalidate();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not delete intern', text2: error?.response?.data?.message ?? error?.message }),
  });

  const confirmToggleActive = (intern: InternDto) => {
    if (!intern.isActive) {
      toggleActiveMutation.mutate(intern);
      return;
    }
    Alert.alert('Deactivate intern', `Deactivate ${intern.fullName}? They will lose access until reactivated.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => toggleActiveMutation.mutate(intern) },
    ]);
  };

  const openResetPassword = (intern: InternDto) => {
    resetPasswordForm.reset({ password: '', confirmPassword: '' });
    setResetPasswordTarget(intern);
  };

  const confirmDelete = (intern: InternDto) => {
    Alert.alert('Delete intern', `Permanently delete ${intern.fullName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(intern.id) },
    ]);
  };

  const unlockMutation = useMutation({
    mutationFn: (id: number) => internsApi.unlockAttendance(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Account unlocked' });
      invalidate();
    },
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not unlock account', text2: error?.message }),
  });

  const confirmUnlock = (intern: InternDto) => {
    Alert.alert(
      'Unlock account',
      `Unlock ${intern.fullName}'s account and reset their failed face-verification counter to zero?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unlock', onPress: () => unlockMutation.mutate(intern.id) },
      ],
    );
  };

  const unlockFaceEnrollmentMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => internsApi.unlockFaceEnrollment(id, reason),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Face re-enrollment unlocked' });
      invalidate();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not unlock face re-enrollment', text2: error?.message }),
  });

  const confirmUnlockFaceEnrollment = (intern: InternDto) => {
    Alert.alert(
      'Unlock face re-enrollment',
      `${intern.fullName}'s face is already enrolled and locked. Grant one-time permission to re-enroll?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: () =>
            unlockFaceEnrollmentMutation.mutate({ id: intern.id, reason: 'Unlocked by admin from Interns screen' }),
        },
      ],
    );
  };

  const openCreate = () => {
    setEditing(null);
    createForm.reset(emptyCreate);
    setModalOpen(true);
  };

  const openEdit = (intern: InternDto) => {
    setEditing(intern);
    updateForm.reset({
      fullName: intern.fullName,
      phone: intern.phone ? formatPhoneInput(intern.phone) : '+92 ',
      mentorId: intern.mentorId,
      internshipStartDate: intern.internshipStartDate,
      internshipEndDate: intern.internshipEndDate,
      dailyStartTime: intern.dailyStartTime,
      dailyEndTime: intern.dailyEndTime,
      universityName: intern.universityName ?? '',
      degreeProgram: intern.degreeProgram ?? '',
      address: intern.address ?? '',
      emergencyContactName: intern.emergencyContactName ?? '',
      emergencyContactPhone: intern.emergencyContactPhone ? formatPhoneInput(intern.emergencyContactPhone) : '+92 ',
      bloodGroup: intern.bloodGroup ?? '',
    } as UpdateValues);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const onCreateSubmit = (values: CreateValues) => {
    if (isAdmin && !values.mentorId) {
      createForm.setError('mentorId', { message: 'Select a mentor.' });
      return;
    }
    createMutation.mutate(values);
  };

  const renderIntern = ({ item: i }: { item: InternDto }) => {
    const busyToggle = toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === i.id;
    const busyDelete = deleteMutation.isPending && deleteMutation.variables === i.id;
    const busyUnlock = unlockMutation.isPending && unlockMutation.variables === i.id;
    const busyUnlockFace = unlockFaceEnrollmentMutation.isPending && unlockFaceEnrollmentMutation.variables?.id === i.id;
    const faceEnrolledAndLocked = i.faceEnrollmentStatus === 'Active' && !i.faceReEnrollmentAllowed;

    return (
      <Pressable style={s.card} onPress={() => openEdit(i)}>
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={s.avatarBadge}>
            <Text variant="bodyStrong" style={s.avatarText}>
              {i.fullName?.charAt(0).toUpperCase() || 'I'}
            </Text>
          </View>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
              {i.fullName}
            </Text>
            <Text variant="caption" tone="muted" style={s.emailText} numberOfLines={1}>
              {i.internCode} · {i.email}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </View>

        {/* Row 1: Department & Mentor Info */}
        <View style={s.metaInfoRow}>
          <View style={s.metaLeftGroup}>
            <View style={s.metaChip}>
              <Text variant="caption" tone="secondary" style={s.metaChipText}>
                {i.departmentName || 'No Dept'}
              </Text>
            </View>

            <Text variant="caption" tone="muted" style={s.metaDot}>•</Text>

            <View style={s.mentorBadge}>
              <Users size={12} color={theme.colors.textMuted} />
              <Text variant="caption" tone="muted" style={s.mentorText} numberOfLines={1}>
                {i.mentorName || 'No Mentor'}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 2 (Shifted Below): Status Chips & Right-Aligned Active/Inactive Badge */}
        <View style={s.statusRow}>
          <View style={s.statusChipsGroup}>
            {i.isLockedForUnofficialActivity ? (
              <View style={[s.statusChip, { backgroundColor: theme.colors.errorBg || '#FEF2F2' }]}>
                <Text variant="caption" tone="error" style={s.statusChipText}>Locked</Text>
              </View>
            ) : null}
            {i.faceReEnrollmentAllowed ? (
              <View style={[s.statusChip, { backgroundColor: theme.colors.successBg || '#F0FDF4' }]}>
                <Text variant="caption" tone="success" style={s.statusChipText}>Re-enroll Unlocked</Text>
              </View>
            ) : null}
            {i.verificationStatus !== 'Verified' ? (
              <View style={[s.statusChip, { backgroundColor: theme.colors.surfaceSunken }]}>
                <Text variant="caption" tone="muted" style={s.statusChipText}>{i.verificationStatus}</Text>
              </View>
            ) : null}
          </View>

          {/* Active / Inactive Badge shifted 1 step down on the Right Corner */}
          <View style={[s.badge, { backgroundColor: i.isActive ? (theme.colors.successBg || '#F0FDF4') : (theme.colors.errorBg || '#FEF2F2') }]}>
            <View style={[s.badgeDot, { backgroundColor: i.isActive ? theme.colors.success : theme.colors.error }]} />
            <Text variant="caption" tone={i.isActive ? 'success' : 'error'} style={s.badgeText}>
              {i.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Actions Row */}
        <View style={s.actionsRow}>
          {i.isLockedForUnofficialActivity ? (
            <Pressable
              hitSlop={8}
              style={s.actionIcon}
              onPress={(e) => {
                e.stopPropagation();
                confirmUnlock(i);
              }}
            >
              {busyUnlock ? <ActivityIndicator size="small" color={theme.colors.success} /> : <Unlock size={16} color={theme.colors.success} />}
            </Pressable>
          ) : null}
          {faceEnrolledAndLocked ? (
            <Pressable
              hitSlop={8}
              style={s.actionIcon}
              onPress={(e) => {
                e.stopPropagation();
                confirmUnlockFaceEnrollment(i);
              }}
            >
              {busyUnlockFace ? (
                <ActivityIndicator size="small" color={theme.colors.textMuted} />
              ) : (
                <Fingerprint size={16} color={theme.colors.textMuted} />
              )}
            </Pressable>
          ) : null}
          <Pressable
            hitSlop={8}
            style={s.actionIcon}
            onPress={(e) => {
              e.stopPropagation();
              openResetPassword(i);
            }}
          >
            <KeyRound size={16} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            hitSlop={8}
            style={s.actionIcon}
            onPress={(e) => {
              e.stopPropagation();
              confirmToggleActive(i);
            }}
          >
            {busyToggle ? (
              <ActivityIndicator size="small" color={theme.colors.textMuted} />
            ) : i.isActive ? (
              <PowerOff size={16} color={theme.colors.error} />
            ) : (
              <Power size={16} color={theme.colors.success} />
            )}
          </Pressable>
          <Pressable
            hitSlop={8}
            style={s.actionIcon}
            onPress={(e) => {
              e.stopPropagation();
              confirmDelete(i);
            }}
          >
            {busyDelete ? <ActivityIndicator size="small" color={theme.colors.error} /> : <Trash2 size={16} color={theme.colors.error} />}
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen scroll={false} style={s.screenContainer}>
      <View style={s.headerContainer}>
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {filteredInterns.length} {filteredInterns.length === 1 ? 'INTERN' : 'INTERNS'} TOTAL
            </Text>
          </View>
          <View style={s.headerActions}>
            <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
              {showSearch ? (
                <X size={18} color={theme.colors.primary} />
              ) : (
                <Search size={18} color={theme.colors.textMuted} />
              )}
            </Pressable>
            <Button label="Add Intern" size="sm" onPress={openCreate} />
          </View>
        </View>

        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search interns..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading interns...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInterns}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderIntern}
          style={s.list}
          contentContainerStyle={
            filteredInterns.length === 0 ? s.emptyListContent : s.listContent
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text variant="body" tone="muted">
                {search.trim() ? 'No interns found matching your search.' : 'No interns yet. Add one to get started.'}
              </Text>
            </View>
          }
        />
      )}

      <FormModal
        visible={modalOpen}
        title={editing ? 'Edit Intern' : 'Add Intern'}
        onClose={closeModal}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={closeModal} />
            {editing ? (
              <Button
                label="Save"
                onPress={updateForm.handleSubmit((values) => updateMutation.mutate({ id: editing.id, body: values }))}
                loading={updateMutation.isPending}
              />
            ) : (
              <Button label="Create" onPress={createForm.handleSubmit(onCreateSubmit)} loading={createMutation.isPending} />
            )}
          </>
        }
      >
        {editing ? (
          <>
            <Controller
              control={updateForm.control}
              name="fullName"
              render={({ field }) => (
                <Input label="Full Name" required value={field.value} onChangeText={field.onChange} error={updateForm.formState.errors.fullName?.message} />
              )}
            />
            <Input label="Email" value={editing.email} editable={false} />
            <Input label="Intern Code" value={editing.internCode} editable={false} />
            <Controller
              control={updateForm.control}
              name="phone"
              render={({ field }) => (
                <Input
                  label="Phone"
                  value={field.value}
                  onChangeText={(val) => field.onChange(formatPhoneInput(val))}
                  keyboardType="phone-pad"
                  placeholder="+92 3XX XXXXXXX"
                />
              )}
            />
            {isAdmin ? (
              <Controller
                control={updateForm.control}
                name="mentorId"
                render={({ field }) => (
                  <SelectField label="Mentor" required value={field.value} options={mentorSelectOptions} onChange={field.onChange} />
                )}
              />
            ) : null}
            <Controller
              control={updateForm.control}
              name="internshipStartDate"
              render={({ field }) => (
                <DateField label="Internship Start Date" required value={field.value || null} onChange={field.onChange} error={updateForm.formState.errors.internshipStartDate?.message} />
              )}
            />
            <Controller
              control={updateForm.control}
              name="internshipEndDate"
              render={({ field }) => (
                <DateField label="Internship End Date" required value={field.value || null} onChange={field.onChange} error={updateForm.formState.errors.internshipEndDate?.message} />
              )}
            />
            <Controller
              control={updateForm.control}
              name="dailyStartTime"
              render={({ field }) => (
                <TimeField label="Daily Start Time" required value={field.value || null} onChange={field.onChange} error={updateForm.formState.errors.dailyStartTime?.message} />
              )}
            />
            <Controller
              control={updateForm.control}
              name="dailyEndTime"
              render={({ field }) => (
                <TimeField label="Daily End Time" required value={field.value || null} onChange={field.onChange} error={updateForm.formState.errors.dailyEndTime?.message} />
              )}
            />
            <Controller
              control={updateForm.control}
              name="universityName"
              render={({ field }) => <Input label="University" value={field.value} onChangeText={field.onChange} />}
            />
            <Controller
              control={updateForm.control}
              name="degreeProgram"
              render={({ field }) => <Input label="Degree Program" value={field.value} onChangeText={field.onChange} />}
            />
            <Controller
              control={updateForm.control}
              name="address"
              render={({ field }) => <Input label="Address" value={field.value} onChangeText={field.onChange} multiline />}
            />
            <Controller
              control={updateForm.control}
              name="emergencyContactName"
              render={({ field }) => <Input label="Emergency Contact Name" value={field.value} onChangeText={field.onChange} />}
            />
            <Controller
              control={updateForm.control}
              name="emergencyContactPhone"
              render={({ field }) => (
                <Input
                  label="Emergency Contact Phone"
                  value={field.value}
                  onChangeText={(val) => field.onChange(formatPhoneInput(val))}
                  keyboardType="phone-pad"
                  placeholder="+92 3XX XXXXXXX"
                />
              )}
            />
            <Controller
              control={updateForm.control}
              name="bloodGroup"
              render={({ field }) => <Input label="Blood Group" value={field.value} onChangeText={field.onChange} placeholder="O+" />}
            />
          </>
        ) : (
          <>
            <Controller
              control={createForm.control}
              name="fullName"
              render={({ field }) => (
                <Input label="Full Name" required value={field.value} onChangeText={field.onChange} error={createForm.formState.errors.fullName?.message} />
              )}
            />
            <Controller
              control={createForm.control}
              name="email"
              render={({ field }) => (
                <Input
                  label="Email"
                  required
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={createForm.formState.errors.email?.message}
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="cnic"
              render={({ field }) => (
                <Input
                  label="CNIC"
                  required
                  placeholder="42101-1234567-1"
                  value={field.value}
                  onChangeText={(val) => field.onChange(formatCnicInput(val))}
                  keyboardType="number-pad"
                  error={createForm.formState.errors.cnic?.message}
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="phone"
              render={({ field }) => (
                <Input
                  label="Phone"
                  value={field.value}
                  onChangeText={(val) => field.onChange(formatPhoneInput(val))}
                  keyboardType="phone-pad"
                  placeholder="+92 3XX XXXXXXX"
                />
              )}
            />
            {isAdmin ? (
              <Controller
                control={createForm.control}
                name="mentorId"
                render={({ field }) => (
                  <SelectField
                    label="Mentor"
                    required
                    value={field.value}
                    options={mentorSelectOptions}
                    onChange={field.onChange}
                    error={createForm.formState.errors.mentorId?.message}
                  />
                )}
              />
            ) : null}
            <Controller
              control={createForm.control}
              name="internshipStartDate"
              render={({ field }) => (
                <DateField label="Internship Start Date" required value={field.value || null} onChange={field.onChange} error={createForm.formState.errors.internshipStartDate?.message} />
              )}
            />
            <Controller
              control={createForm.control}
              name="internshipEndDate"
              render={({ field }) => (
                <DateField label="Internship End Date" required value={field.value || null} onChange={field.onChange} error={createForm.formState.errors.internshipEndDate?.message} />
              )}
            />
            <Controller
              control={createForm.control}
              name="dailyStartTime"
              render={({ field }) => (
                <TimeField label="Daily Start Time" required value={field.value || null} onChange={field.onChange} error={createForm.formState.errors.dailyStartTime?.message} />
              )}
            />
            <Controller
              control={createForm.control}
              name="dailyEndTime"
              render={({ field }) => (
                <TimeField label="Daily End Time" required value={field.value || null} onChange={field.onChange} error={createForm.formState.errors.dailyEndTime?.message} />
              )}
            />
            <Controller
              control={createForm.control}
              name="universityName"
              render={({ field }) => <Input label="University" value={field.value} onChangeText={field.onChange} />}
            />
            <Controller
              control={createForm.control}
              name="degreeProgram"
              render={({ field }) => <Input label="Degree Program" value={field.value} onChangeText={field.onChange} />}
            />
            <Controller
              control={createForm.control}
              name="password"
              render={({ field }) => (
                <Input
                  label="Initial Password"
                  required
                  secureToggle
                  value={field.value}
                  onChangeText={field.onChange}
                  error={createForm.formState.errors.password?.message}
                />
              )}
            />
            <PasswordStrengthChecklist password={createPassword ?? ''} fullName={createFullName} />
            <Controller
              control={createForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <Input
                  label="Confirm Password"
                  required
                  secureToggle
                  value={field.value}
                  onChangeText={field.onChange}
                  error={createForm.formState.errors.confirmPassword?.message}
                />
              )}
            />
          </>
        )}
      </FormModal>

      <FormModal
        visible={resetPasswordTarget !== null}
        title="Reset Password"
        onClose={() => setResetPasswordTarget(null)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setResetPasswordTarget(null)} />
            <Button
              label="Reset Password"
              loading={resetPasswordMutation.isPending}
              onPress={resetPasswordForm.handleSubmit((values) => {
                if (resetPasswordTarget) resetPasswordMutation.mutate({ id: resetPasswordTarget.id, newPassword: values.password });
              })}
            />
          </>
        }
      >
        <Text variant="body" tone="secondary" style={s.transferHint}>
          Set a new password for {resetPasswordTarget?.fullName}. They will be asked to set their own on next sign-in.
        </Text>
        <Controller
          control={resetPasswordForm.control}
          name="password"
          render={({ field }) => (
            <Input
              label="New Password"
              required
              secureToggle
              value={field.value}
              onChangeText={field.onChange}
              error={resetPasswordForm.formState.errors.password?.message}
            />
          )}
        />
        <PasswordStrengthChecklist password={resetPassword ?? ''} fullName={resetPasswordTarget?.fullName} />
        <Controller
          control={resetPasswordForm.control}
          name="confirmPassword"
          render={({ field }) => (
            <Input
              label="Confirm Password"
              required
              secureToggle
              value={field.value}
              onChangeText={field.onChange}
              error={resetPasswordForm.formState.errors.confirmPassword?.message}
            />
          )}
        />
      </FormModal>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  headerContainer: {
    marginBottom: t.spacing.lg,
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
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
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
    marginTop: t.spacing.md,
  },
  list: { flex: 1 },
  listContent: {
    gap: t.spacing.md,
    paddingBottom: t.spacing.xl * 1.5,
  },
  emptyListContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
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
    marginTop: 12,
    paddingLeft: 2,
  },
  metaLeftGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
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
  metaDot: {
    fontSize: 12,
  },
  mentorBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    flexShrink: 1,
  },
  mentorText: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 10,
    paddingLeft: 2,
  },
  statusChipsGroup: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
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
  transferHint: {
    marginBottom: t.spacing.lg,
  },
  emptyBox: {
    paddingVertical: t.spacing.xl * 2,
    alignItems: 'center' as const,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});