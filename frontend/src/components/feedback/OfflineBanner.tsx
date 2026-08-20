import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { Text } from '../primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

/** Rendered once at the app root, above the navigator, so it's visible regardless of which
 * screen is active - `isConnected` is the device radio state, `isInternetReachable` catches the
 * "connected to Wi-Fi with no internet" case that isConnected alone misses. */
export function OfflineBanner() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  if (!isOffline) return null;

  return (
    <View style={[s.container, { paddingTop: insets.top, backgroundColor: theme.colors.error }]} accessibilityRole="alert">
      <View style={s.row}>
        <WifiOff size={14} color={theme.colors.textOnDark} />
        <Text variant="caption" tone="inverse" style={s.text}>
          No internet connection
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xs,
  },
  text: {},
});
