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
    <Screen scroll style={s.container}>
      <Text variant="body" tone="secondary" style={s.subtitle}>
        For your security, you must set a new password before continuing.
      </Text>

      <View style={s.card}>
        <View style={s.inputGap}>
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
        </View>

        <View style={s.inputGap}>
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
        </View>

        <View style={s.checklistGap}>
          <PasswordStrengthChecklist password={newPassword} fullName={user?.fullName} />
        </View>

        <View style={s.inputGap}>
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
        </View>

        {serverError ? (
          <Text variant="caption" tone="error" style={s.error}>
            {serverError}
          </Text>
        ) : null}

        <Button
          label="Save & Continue"
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          fullWidth
          style={s.button}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subtitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGap: {
    marginBottom: 8,
  },
  checklistGap: {
    marginVertical: 4,
  },
  error: {
    marginTop: 4,
    marginBottom: 8,
  },
  button: {
    marginTop: 12,
  },
});