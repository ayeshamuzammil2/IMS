import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { useAuth } from '../../providers/AuthProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

export function LoginScreen() {
  const s = useThemedStyles(makeStyles);
  const { signIn } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err?.message ?? 'Incorrect email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={s.logoBlock}>
        <Image source={require('../../../assets/pia-logo.png')} style={s.logo} resizeMode="contain" />
        <Text variant="h2" style={s.appName}>
          PIA Internee Management
        </Text>
      </View>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@pia.com.pk"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureToggle
        secureTextEntry
        textContentType="password"
        placeholder="••••••••"
      />

      <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={s.forgotLink}>
        <Text variant="caption" tone="brand">
          Forgot Password?
        </Text>
      </Pressable>

      {error ? (
        <Text variant="caption" tone="error" style={s.error}>
          {error}
        </Text>
      ) : null}

      <Button label="Sign In" onPress={onSubmit} loading={submitting} fullWidth style={s.submitButton} />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  logoBlock: { alignItems: 'center' as const, marginTop: t.spacing.xxl, marginBottom: t.spacing.xxl, gap: t.spacing.sm },
  logo: { width: 200, height: 200 },
  appName: { textAlign: 'center' as const },
  forgotLink: { alignSelf: 'flex-end' as const, marginBottom: t.spacing.lg },
  error: { marginBottom: t.spacing.md },
  submitButton: { marginTop: t.spacing.sm },
});
