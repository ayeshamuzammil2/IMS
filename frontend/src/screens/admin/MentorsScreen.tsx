import React, { useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Power, PowerOff, KeyRound, ArrowRightLeft, Trash2 } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { FormModal } from '../../components/forms/FormModal';
import { SelectField } from '../../components/forms/SelectField';
import { PasswordStrengthChecklist } from '../../components/forms/PasswordStrengthChecklist';
import { passwordSchema } from '../../lib/passwordPolicy';
import { DataTable, type DataTableColumn } from '../../components/data/DataTable';
import { departmentsApi } from '../../api/resources/departments.api';
import { mentorsApi, type MentorDto } from '../../api/resources/mentors.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const passwordFields = {
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm the password.'),
};
const withPasswordMatch = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine((data: any) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

const createSchema = withPasswordMatch(
  z.object({
    fullName: z.string().min(1, 'Full name is required.').max(150),
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    cnic: z.string().min(1, 'CNIC is required.'),
    phone: z.string().optional(),
    departmentId: z.coerce.number({ message: 'Select a department.' }).int().positive('Select a department.'),
    ...passwordFields,
  }),
);
const updateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.').max(150),
  phone: z.string().optional(),
  cnic: z.string().optional(),
});
const resetPasswordSchema = withPasswordMatch(z.object(passwordFields));

// departmentId is z.coerce.number(), which accepts unknown as input - useForm needs the raw input
// shape for on-screen field values and the coerced output shape for what actually gets submitted.
type CreateInput = z.input<typeof createSchema>;
type CreateOutput = z.output<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function MentorsScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<MentorDto | null>(null);
  const [editing, setEditing] = useState<MentorDto | null>(null);
  const [transferDeptId, setTransferDeptId] = useState<number | null>(null);

  const { data: mentors = [], isLoading } = useQuery({ queryKey: ['mentors'], queryFn: () => mentorsApi.list() });
  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
  });
  const deptSelectOptions = useMemo(() => departmentOptions.map((d) => ({ value: d.id, label: d.name })), [departmentOptions]);

  const createForm = useForm<CreateInput, any, CreateOutput>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: '', email: '', cnic: '', phone: '', departmentId: 0, password: '', confirmPassword: '' },
  });
  const updateForm = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { fullName: '', phone: '', cnic: '' },
  });
  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const createPassword = createForm.watch('password');
  const createFullName = createForm.watch('fullName');
  const resetPassword = resetPasswordForm.watch('password');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mentors'] });

  const createMutation = useMutation({
    mutationFn: (values: CreateOutput) =>
      mentorsApi.create({ ...values, phone: values.phone?.trim() ? values.phone : null }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Mentor created', text2: 'Share the password you set with them directly.' });
      invalidate();
      closeModal();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not create mentor', text2: error?.response?.data?.message ?? error?.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateValues }) =>
      mentorsApi.update(id, { ...body, phone: body.phone?.trim() ? body.phone : null, cnic: body.cnic?.trim() ? body.cnic : null }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Mentor updated' });
      invalidate();
      closeModal();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not update mentor', text2: error?.response?.data?.message ?? error?.message }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (m: MentorDto) => (m.isActive ? mentorsApi.deactivate(m.id) : mentorsApi.reactivate(m.id)),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Mentor updated' });
      invalidate();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not update mentor', text2: error?.response?.data?.message ?? error?.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mentorsApi.delete(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Mentor deleted' });
      invalidate();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not delete mentor', text2: error?.response?.data?.message ?? error?.message }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => mentorsApi.resetPassword(id, newPassword),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Password reset', text2: 'They must sign in with the new password and set their own.' });
      setResetPasswordTarget(null);
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not reset password', text2: error?.response?.data?.message ?? error?.message }),
  });

  const confirmToggleActive = (mentor: MentorDto) => {
    if (!mentor.isActive) {
      toggleActiveMutation.mutate(mentor);
      return;
    }
    Alert.alert('Deactivate mentor', `Deactivate ${mentor.fullName}? They will lose access until reactivated.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => toggleActiveMutation.mutate(mentor) },
    ]);
  };

  const openResetPassword = (mentor: MentorDto) => {
    resetPasswordForm.reset({ password: '', confirmPassword: '' });
    setResetPasswordTarget(mentor);
  };

  const confirmDelete = (mentor: MentorDto) => {
    Alert.alert('Delete mentor', `Permanently delete ${mentor.fullName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(mentor.id) },
    ]);
  };

  const transferMutation = useMutation({
    mutationFn: ({ id, newDepartmentId }: { id: number; newDepartmentId: number }) => mentorsApi.transfer(id, newDepartmentId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Mentor transferred' });
      invalidate();
      setTransferOpen(false);
      setEditing(null);
    },
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not transfer mentor', text2: error?.message }),
  });

  const openCreate = () => {
    setEditing(null);
    createForm.reset({ fullName: '', email: '', cnic: '', phone: '', departmentId: 0, password: '', confirmPassword: '' });
    setModalOpen(true);
  };

  const openEdit = (mentor: MentorDto) => {
    setEditing(mentor);
    updateForm.reset({ fullName: mentor.fullName, phone: mentor.phone ?? '', cnic: mentor.cnic ?? '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const openTransfer = (mentor: MentorDto) => {
    setEditing(mentor);
    setTransferDeptId(mentor.departmentId);
    setTransferOpen(true);
  };

  const columns: DataTableColumn<MentorDto>[] = [
    { key: 'fullName', label: 'Name', width: 170, render: (m) => <Text variant="bodyStrong">{m.fullName}</Text> },
    { key: 'email', label: 'Email', width: 200, render: (m) => <Text variant="body">{m.email}</Text> },
    { key: 'department', label: 'Department', width: 140, render: (m) => <Text variant="body">{m.departmentName}</Text> },
    { key: 'interns', label: 'Interns', width: 70, render: (m) => <Text variant="body">{m.internCount}</Text> },
    {
      key: 'status',
      label: 'Status',
      width: 90,
      render: (m) => (
        <Text variant="caption" tone={m.isActive ? 'success' : 'error'}>
          {m.isActive ? 'Active' : 'Inactive'}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 160,
      render: (m) => {
        const busyToggle = toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === m.id;
        const busyDelete = deleteMutation.isPending && deleteMutation.variables === m.id;
        return (
          <View style={s.actionsRow}>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                openTransfer(m);
              }}
            >
              <ArrowRightLeft size={18} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                openResetPassword(m);
              }}
            >
              <KeyRound size={18} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                confirmToggleActive(m);
              }}
            >
              {busyToggle ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : m.isActive ? (
                <PowerOff size={18} color={theme.colors.error} />
              ) : (
                <Power size={18} color={theme.colors.success} />
              )}
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                confirmDelete(m);
              }}
            >
              {busyDelete ? <ActivityIndicator size="small" color={theme.colors.textSecondary} /> : <Trash2 size={18} color={theme.colors.error} />}
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
          {mentors.length} mentor{mentors.length === 1 ? '' : 's'}
        </Text>
        <Button label="Add Mentor" size="sm" onPress={openCreate} />
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <DataTable
          columns={columns}
          rows={mentors}
          keyExtractor={(m) => String(m.id)}
          onRowPress={openEdit}
          emptyLabel="No mentors yet. Add one to get started."
        />
      )}

      <FormModal
        visible={modalOpen}
        title={editing ? 'Edit Mentor' : 'Add Mentor'}
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
              <Button
                label="Create"
                onPress={createForm.handleSubmit((values) => createMutation.mutate(values))}
                loading={createMutation.isPending}
              />
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
                <Input
                  label="Full Name"
                  required
                  value={field.value}
                  onChangeText={field.onChange}
                  error={updateForm.formState.errors.fullName?.message}
                />
              )}
            />
            <Input label="Email" value={editing.email} editable={false} />
            <Controller
              control={updateForm.control}
              name="cnic"
              render={({ field }) => (
                <Input label="CNIC" placeholder="42101-1234567-1" value={field.value} onChangeText={field.onChange} />
              )}
            />
            <Controller
              control={updateForm.control}
              name="phone"
              render={({ field }) => <Input label="Phone" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />}
            />
          </>
        ) : (
          <>
            <Controller
              control={createForm.control}
              name="fullName"
              render={({ field }) => (
                <Input
                  label="Full Name"
                  required
                  value={field.value}
                  onChangeText={field.onChange}
                  error={createForm.formState.errors.fullName?.message}
                />
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
            <Controller
              control={createForm.control}
              name="departmentId"
              render={({ field }) => (
                <SelectField
                  label="Department"
                  required
                  value={(field.value as number | undefined) || null}
                  options={deptSelectOptions}
                  onChange={field.onChange}
                  error={createForm.formState.errors.departmentId?.message}
                />
              )}
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
        visible={transferOpen}
        title="Transfer Mentor"
        onClose={() => setTransferOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setTransferOpen(false)} />
            <Button
              label="Transfer"
              loading={transferMutation.isPending}
              onPress={() => {
                if (editing && transferDeptId) transferMutation.mutate({ id: editing.id, newDepartmentId: transferDeptId });
              }}
            />
          </>
        }
      >
        <Text variant="body" tone="secondary" style={s.transferHint}>
          Move {editing?.fullName} to a different department.
        </Text>
        <SelectField label="New Department" required value={transferDeptId} options={deptSelectOptions} onChange={setTransferDeptId} />
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
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.md },
  transferHint: { marginBottom: t.spacing.md },
});
