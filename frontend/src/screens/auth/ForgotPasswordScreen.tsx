import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { PasswordStrengthChecklist } from '../../components/forms/PasswordStrengthChecklist';
import { passwordSchema } from '../../lib/passwordPolicy';
import { authApi } from '../../api/resources/auth.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

const forgotPasswordSchema = z
  .object({
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm the password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordScreen() {
  const s = useThemedStyles(makeStyles);
  const navigation = useNavigation();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      await authApi.forgotPassword({
        email: values.email.trim(),
        newPassword: values.password,
      } as any);

      Toast.show({
        type: 'success',
        text1: 'Password reset successful',
        text2: 'You can now sign in with your new password.',
      });

      navigation.goBack();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Could not reset password',
        text2: err?.response?.data?.message ?? err?.message ?? 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <Screen scroll>
      <Text variant="body" tone="secondary" style={s.subtitle}>
        Enter your email and set a new password for your account.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@pia.com.pk"
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Input
            label="New Password"
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />

      <PasswordStrengthChecklist password={password ?? ''} />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <Input
            label="Confirm New Password"
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            error={errors.confirmPassword?.message}
          />
        )}
      />

      <View style={s.spacer} />

      <Button
        label="Reset Password"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        fullWidth
      />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  subtitle: { marginBottom: t.spacing.lg, fontWeight: '500' as const },
  spacer: { height: t.spacing.sm },
});