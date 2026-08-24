import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'caption' | 'overline';
export type TextTone = 'primary' | 'secondary' | 'muted' | 'inverse' | 'success' | 'warning' | 'error' | 'brand' | 'slate';

interface Props extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

export function Text({ variant = 'body', tone = 'primary', style, ...rest }: Props) {
  const theme = useTheme();
  const toneColor: Record<TextTone, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    inverse: theme.colors.textOnDark,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    brand: theme.colors.primary,
    slate: theme.colors.slate,
  };

  return <RNText style={[theme.typography[variant], { color: toneColor[tone] }, style]} {...rest} />;
}
