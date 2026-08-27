import React, { useState } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { PasswordStrengthChecklist } from '../../components/forms/PasswordStrengthChecklist';
import { passwordSchema } from '../../lib/passwordPolicy';
import { useAuth } from '../../providers/AuthProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter the temporary password you were given.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

/** Forced, non-dismissable first-login reset - the account cannot be used until this completes. */
export function SetNewPasswordScreen() {
  const s = useThemedStyles(makeStyles);
  const { user, changePassword } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = watch('newPassword');

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
    } catch (err: any) {
      setServerError(err?.message ?? 'Could not set your new password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="body" tone="secondary" style={s.subtitle}>
        For your security, you must set a new password before continuing.
      </Text>

      <Controller
        control={control}
        name="currentPassword"
        render={({ field }) => (
          <Input
            label="Temporary Password"
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            error={formState.errors.currentPassword?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="newPassword"
        render={({ field }) => (
          <Input
            label="New Password"
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            error={formState.errors.newPassword?.message}
          />
        )}
      />
      <PasswordStrengthChecklist password={newPassword} fullName={user?.fullName} />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <Input
            label="Confirm New Password"
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            error={formState.errors.confirmPassword?.message}
          />
        )}
      />

      {serverError ? (
        <Text variant="caption" tone="error" style={s.error}>
          {serverError}
        </Text>
      ) : null}

      <View style={s.spacer} />
      <Button label="Save & Continue" onPress={handleSubmit(onSubmit)} loading={submitting} fullWidth />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  subtitle: { marginBottom: t.spacing.lg, fontWeight: '500' as const },
  error: { marginBottom: t.spacing.md },
  spacer: { height: t.spacing.sm },
});