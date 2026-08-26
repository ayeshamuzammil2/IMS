import React, { useState } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
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
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordScreen() {
  const s = useThemedStyles(makeStyles);
  const { user, changePassword } = useAuth();
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = watch('newPassword');

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      Toast.show({ type: 'success', text1: 'Password changed' });
      if (navigation.canGoBack()) navigation.goBack();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not change password', text2: error?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      
      <Text variant="body" tone="secondary" style={s.subtitle}>
        Choose a strong new password.
      </Text>

      <Controller
        control={control}
        name="currentPassword"
        render={({ field }) => (
          <Input
            label="Current Password"
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

      <View style={s.spacer} />
      <Button label="Save New Password" onPress={handleSubmit(onSubmit)} loading={submitting} fullWidth />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  title: { marginBottom: t.spacing.xs },
  subtitle: { marginBottom: t.spacing.lg },
  spacer: { height: t.spacing.sm },
});
