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
    setError,
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
      });

      Toast.show({
        type: 'success',
        text1: 'Password reset',
        text2: 'You can now sign in with your new password.',
      });

      navigation.goBack();
    } catch (err: any) {
      // "Email does not exist" comes back as a field-level error from the server - show it
      // right under the Email input, same as any other validation error, instead of just a toast.
      const emailError = err?.fieldErrors?.email?.[0];
      if (emailError) {
        setError('email', { message: emailError });
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Could not reset password',
        text2: err?.message ?? 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <Screen scroll style={s.container}>
      <Text variant="body" tone="secondary" style={s.subtitle}>
        Enter your email and set a new password for your account.
      </Text>

      <View style={s.card}>
        <View style={s.inputGap}>
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
        </View>

        <View style={s.inputGap}>
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
        </View>

        <View style={s.checklistGap}>
          <PasswordStrengthChecklist password={password ?? ''} />
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
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </View>

        <Button
          label="Reset Password"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
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
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
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
  button: {
    marginTop: 12,
  },
});