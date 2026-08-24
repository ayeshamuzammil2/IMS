import React, { useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Power, PowerOff, KeyRound, Trash2, Unlock } from 'lucide-react-native';
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
import { DataTable, type DataTableColumn } from '../../components/data/DataTable';
import { mentorsApi } from '../../api/resources/mentors.api';
import { internsApi, type InternDto } from '../../api/resources/interns.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

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
  phone: '',
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

const statusTone: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  PendingSubmission: 'muted',
  PendingReview: 'warning',
  Verified: 'success',
  Rejected: 'error',
};

/** Shared between Admin and Mentor navigators - the backend already scopes the list/actions to a
 * mentor's own mentees, so the only UI difference here is whether the mentor picker is shown. */
export function InternsScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InternDto | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<InternDto | null>(null);

  const { data: interns = [], isLoading } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });
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
    defaultValues: { ...emptyCreate, ...{ address: '', emergencyContactName: '', emergencyContactPhone: '', bloodGroup: '' } },
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
    mutationFn: (values: CreateValues) =>
      internsApi.create({
        ...values,
        phone: values.phone?.trim() ? values.phone : null,
        universityName: values.universityName?.trim() ? values.universityName : null,
        degreeProgram: values.degreeProgram?.trim() ? values.degreeProgram : null,
      }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Intern created', text2: 'Share the password you set with them directly.' });
      invalidate();
      closeModal();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not create intern', text2: error?.response?.data?.message ?? error?.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateValues }) =>
      internsApi.update(id, {
        ...body,
        phone: body.phone?.trim() ? body.phone : null,
        universityName: body.universityName?.trim() ? body.universityName : null,
        degreeProgram: body.degreeProgram?.trim() ? body.degreeProgram : null,
        address: body.address?.trim() ? body.address : null,
        emergencyContactName: body.emergencyContactName?.trim() ? body.emergencyContactName : null,
        emergencyContactPhone: body.emergencyContactPhone?.trim() ? body.emergencyContactPhone : null,
        bloodGroup: body.bloodGroup?.trim() ? body.bloodGroup : null,
      }),
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

  const openCreate = () => {
    setEditing(null);
    createForm.reset(emptyCreate);
    setModalOpen(true);
  };

  const openEdit = (intern: InternDto) => {
    setEditing(intern);
    updateForm.reset({
      fullName: intern.fullName,
      phone: intern.phone ?? '',
      mentorId: intern.mentorId,
      internshipStartDate: intern.internshipStartDate,
      internshipEndDate: intern.internshipEndDate,
      dailyStartTime: intern.dailyStartTime,
      dailyEndTime: intern.dailyEndTime,
      universityName: intern.universityName ?? '',
      degreeProgram: intern.degreeProgram ?? '',
      address: intern.address ?? '',
      emergencyContactName: intern.emergencyContactName ?? '',
      emergencyContactPhone: intern.emergencyContactPhone ?? '',
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

  const columns: DataTableColumn<InternDto>[] = [
    { key: 'fullName', label: 'Name', width: 170, render: (i) => <Text variant="bodyStrong">{i.fullName}</Text> },
    { key: 'code', label: 'Intern Code', width: 150, render: (i) => <Text variant="body">{i.internCode}</Text> },
    { key: 'mentor', label: 'Mentor', width: 150, render: (i) => <Text variant="body">{i.mentorName}</Text> },
    { key: 'department', label: 'Department', width: 130, render: (i) => <Text variant="body">{i.departmentName}</Text> },
    {
      key: 'verification',
      label: 'Verification',
      width: 120,
      render: (i) => (
        <Text variant="caption" tone={statusTone[i.verificationStatus] ?? 'muted'}>
          {i.verificationStatus}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 90,
      render: (i) => (
        <View>
          <Text variant="caption" tone={i.isActive ? 'success' : 'error'}>
            {i.isActive ? 'Active' : 'Inactive'}
          </Text>
          {i.isLockedForUnofficialActivity ? (
            <Text variant="caption" tone="error">
              Locked
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 160,
      render: (i) => {
        const busyToggle = toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === i.id;
        const busyDelete = deleteMutation.isPending && deleteMutation.variables === i.id;
        const busyUnlock = unlockMutation.isPending && unlockMutation.variables === i.id;
        return (
          <View style={s.actionsRow}>
            {i.isLockedForUnofficialActivity ? (
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  confirmUnlock(i);
                }}
              >
                {busyUnlock ? <ActivityIndicator size="small" color={theme.colors.success} /> : <Unlock size={18} color={theme.colors.success} />}
              </Pressable>
            ) : null}
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                openResetPassword(i);
              }}
            >
              <KeyRound size={18} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                confirmToggleActive(i);
              }}
            >
              {busyToggle ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : i.isActive ? (
                <PowerOff size={18} color={theme.colors.error} />
              ) : (
                <Power size={18} color={theme.colors.success} />
              )}
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                confirmDelete(i);
              }}
            >
              {busyDelete ? <ActivityIndicator size="small" color={theme.colors.error} /> : <Trash2 size={18} color={theme.colors.error} />}
            </Pressable>
          </View>
        );
      },
    },
  ];

  return (
    <Screen scroll={false}>
      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {interns.length} intern{interns.length === 1 ? '' : 's'}
        </Text>
        <Button label="Add Intern" size="sm" onPress={openCreate} />
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <DataTable
          columns={columns}
          rows={interns}
          keyExtractor={(i) => String(i.id)}
          onRowPress={openEdit}
          emptyLabel="No interns yet. Add one to get started."
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
              render={({ field }) => <Input label="Phone" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />}
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
              render={({ field }) => <Input label="Emergency Contact Phone" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />}
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
                  onChangeText={field.onChange}
                  error={createForm.formState.errors.cnic?.message}
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="phone"
              render={({ field }) => <Input label="Phone" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />}
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
        <Text variant="body" tone="secondary" style={s.resetHint}>
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
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.md },
  resetHint: { marginBottom: t.spacing.md },
});
