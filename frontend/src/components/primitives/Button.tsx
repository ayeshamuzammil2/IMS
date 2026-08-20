import React from 'react';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { Text } from './Text';
import type { AppTheme } from '../../theme/types';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const heights: Record<Size, number> = { sm: 36, md: 46, lg: 52 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: Props) {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);
  const isDisabled = disabled || loading;

  const variantStyle = variantStyles(theme)[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: theme.colors.overlay }}
      style={[
        s.base,
        { height: heights[size] },
        variantStyle.container,
        fullWidth && s.fullWidth,
        isDisabled && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} />
      ) : (
        <Text variant="bodyStrong" style={{ color: variantStyle.textColor }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function variantStyles(theme: AppTheme) {
  return {
    primary: { container: { backgroundColor: theme.colors.primary }, textColor: theme.colors.onPrimary },
    secondary: { container: { backgroundColor: theme.colors.primaryContainer }, textColor: theme.colors.onPrimaryContainer },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.primary },
      textColor: theme.colors.primary,
    },
    ghost: { container: { backgroundColor: 'transparent' }, textColor: theme.colors.primary },
    danger: { container: { backgroundColor: theme.colors.error }, textColor: theme.colors.textOnDark },
  } as const;
}

const makeStyles = (t: AppTheme) => ({
  base: {
    borderRadius: t.radii.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: t.spacing.lg,
    flexDirection: 'row' as const,
  },
  fullWidth: { width: '100%' as const },
  disabled: { opacity: 0.4 },
});
