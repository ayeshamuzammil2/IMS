import React from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShieldAlert } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

/** Reached only when login fails with UNOFFICIAL_ACTIVITY_LOCKOUT (5-strike face-verification
 * failures or exceeding the daily attempt cap - see AttendanceService.TriggerUnofficialActivityLockAsync).
 * The message (with the intern's mentor's email already interpolated server-side) comes as a route param.
 * Header/container styling deliberately mirrors ForgotPasswordScreen (same green LeftAlignedAuthHeader,
 * same container padding) so the two auth sub-screens feel like the same app instead of two different ones -
 * the title now lives in the header, so it isn't repeated again in the body. */
export function LockedAccountScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'LockedAccount'>>();

  return (
    <Screen scroll style={s.container}>
      <View style={s.card}>
        <View style={s.iconWrap}>
          <ShieldAlert size={56} color={theme.colors.error} />
        </View>
        <Text variant="body" tone="secondary" style={s.message}>
          {route.params?.message ??
            'Your account has been locked due to unofficial activity. Kindly contact your mentor or meet your mentor in person to unlock your account.'}
        </Text>
        <Button label="Back to Sign In" variant="outline" onPress={() => navigation.navigate('Login')} fullWidth style={s.button} />
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  iconWrap: { alignItems: 'center' as const, marginTop: t.spacing.md, marginBottom: t.spacing.md },
  message: { textAlign: 'center' as const, lineHeight: 22 },
  button: { marginTop: t.spacing.xl },
});