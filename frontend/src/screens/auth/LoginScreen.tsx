import React, { useState } from 'react';
import {
  Image,
  ImageStyle,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

export function LoginScreen() {
  /* ----------------------------------------- */
  /* THEME */
  /* ----------------------------------------- */

  const theme = useTheme();
  const s = makeStyles(theme);

  /* ----------------------------------------- */
  /* AUTH */
  /* ----------------------------------------- */

  const { signIn } = useAuth();

  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  /* ----------------------------------------- */
  /* STATE */
  /* ----------------------------------------- */

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ----------------------------------------- */
  /* LOGIN */
  /* ----------------------------------------- */

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
      if (err?.code === 'UNOFFICIAL_ACTIVITY_LOCKOUT') {
        navigation.navigate('LockedAccount', {
          message: err.message,
        });
        return;
      }

      setError(
        err?.message ?? 'Incorrect email or password.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------------------- */
  /* UI */
  /* ----------------------------------------- */

  return (
    <Screen scroll style={s.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.keyboardArea}
      >

        {/* ================================= */}
        {/* BRANDING */}
        {/* ================================= */}

        <View style={s.brandSection}>

          <Image
            source={require('../../../assets/pia-logo.png')}
            style={s.logo}
            resizeMode="contain"
          />

          <Text style={s.appName}>
            PIA Wings
          </Text>

          <Text
            variant="caption"
            tone="secondary"
            style={s.appTagline}
          >
            INTERNSHIP MANAGEMENT & OPERATIONS PORTAL
          </Text>

        </View>

        {/* ================================= */}
        {/* LOGIN CARD */}
        {/* ================================= */}

        <View style={s.loginCard}>

          {/* HEADER */}

          <View style={s.loginHeader}>

            <Text style={s.welcomeTitle}>
              Welcome back
            </Text>

            <Text
              variant="caption"
              tone="secondary"
              style={s.description}
            >
              Sign in to continue to your dashboard
            </Text>

          </View>

          {/* EMAIL */}

          <View style={s.inputContainer}>
            <Input
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);

                if (error) {
                  setError(null);
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@pia.com.pk"
            />
          </View>

          {/* PASSWORD */}

          <View style={s.inputContainer}>
            <Input
              label="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);

                if (error) {
                  setError(null);
                }
              }}
              secureToggle
              secureTextEntry
              textContentType="password"
              placeholder="Enter your password"
            />
          </View>

          {/* FORGOT PASSWORD */}

          <View style={s.forgotContainer}>
            <Pressable
              onPress={() =>
                navigation.navigate('ForgotPassword')
              }
              hitSlop={10}
            >
              <Text
                variant="caption"
                tone="brand"
                style={s.forgotText}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          {/* ERROR */}

          {error ? (
            <View style={s.errorContainer}>
              <Text
                variant="caption"
                tone="error"
                style={s.errorText}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* SIGN IN */}

          <Button
            label="Sign In"
            onPress={onSubmit}
            loading={submitting}
            fullWidth
            style={s.submitButton}
          />

        </View>

        {/* ================================= */}
        {/* FOOTER */}
        {/* ================================= */}

        <View style={s.footer}>

          <Text
            variant="caption"
            tone="secondary"
            style={s.footerText}
          >
            Pakistan International Airlines
          </Text>

          <Text
            variant="caption"
            tone="secondary"
            style={s.footerSubText}
          >
            Internship Management System
          </Text>

        </View>

      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ================================================= */
/* STYLES */
/* ================================================= */

interface Styles {
  screen: ViewStyle;
  keyboardArea: ViewStyle;
  brandSection: ViewStyle;
  logo: ImageStyle;
  appName: TextStyle;
  appTagline: TextStyle;
  loginCard: ViewStyle;
  loginHeader: ViewStyle;
  welcomeTitle: TextStyle;
  description: TextStyle;
  inputContainer: ViewStyle;
  forgotContainer: ViewStyle;
  forgotText: TextStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  submitButton: ViewStyle;
  footer: ViewStyle;
  footerText: TextStyle;
  footerSubText: TextStyle;
}

const makeStyles = (t: AppTheme): Styles => ({
  /* --------------------------------------------- */
  /* SCREEN */
  /* --------------------------------------------- */

  screen: {
    paddingHorizontal: t.spacing.xl,
  },

  keyboardArea: {
    width: '100%',
  },

  /* --------------------------------------------- */
  /* BRANDING */
  /* --------------------------------------------- */

  brandSection: {
    alignItems: 'center',
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.md,
  },

  logo: {
    width: 180,
    height: 150,
    marginBottom: -16, // Logo ki extra whitespace reduce ki hai
  },

  appName: {
    color: t.colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginTop: 0,
  },

  appTagline: {
    color: t.colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 290,
  },

  /* --------------------------------------------- */
  /* LOGIN CARD */
  /* --------------------------------------------- */

  loginCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingHorizontal: 22,
    paddingVertical: 26,

    shadowColor: '#0F3D13',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },

  /* --------------------------------------------- */
  /* LOGIN HEADER */
  /* --------------------------------------------- */

  loginHeader: {
    marginBottom: t.spacing.lg,
  },

  welcomeTitle: {
    color: t.colors.textPrimary,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  description: {
    color: t.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '400',
  },

  /* --------------------------------------------- */
  /* INPUTS */
  /* --------------------------------------------- */

  inputContainer: {
    marginBottom: t.spacing.md,
  },

  /* --------------------------------------------- */
  /* FORGOT PASSWORD */
  /* --------------------------------------------- */

  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: -2,
    marginBottom: t.spacing.lg,
  },

  forgotText: {
    color: t.colors.primary,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  /* --------------------------------------------- */
  /* ERROR */
  /* --------------------------------------------- */

  errorContainer: {
    backgroundColor: t.colors.errorBg,
    borderWidth: 1,
    borderColor: t.colors.error,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: t.spacing.md,
  },

  errorText: {
    color: t.colors.error,
    fontSize: 11.5,
    lineHeight: 17,
  },

  /* --------------------------------------------- */
  /* BUTTON */
  /* --------------------------------------------- */

  submitButton: {
    marginTop: t.spacing.xs,
  },

  /* --------------------------------------------- */
  /* FOOTER */
  /* --------------------------------------------- */

  footer: {
    alignItems: 'center',
    paddingTop: t.spacing.xl,
    paddingBottom: t.spacing.lg,
  },

  footerText: {
    color: t.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  footerSubText: {
    color: t.colors.textMuted,
    fontSize: 11.5,
    marginTop: 3,
    textAlign: 'center',
  },
});