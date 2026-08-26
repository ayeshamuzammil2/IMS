import React from 'react';
import { View } from 'react-native';
import { Check, AlertCircle } from 'lucide-react-native';
import { Text } from '../primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { PASSWORD_RULES, containsName } from '../../lib/passwordPolicy';
import type { AppTheme } from '../../theme/types';

interface Props {
  password: string;
  fullName?: string | null;
}

export function PasswordStrengthChecklist({ password, fullName }: Props) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();

  if (!password) return null;

  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.shortLabel);
  const nameIsDirty = containsName(password, fullName);
  if (nameIsDirty) missing.push('remove your name');

  const isValid = missing.length === 0;

  return (
    <View style={s.row}>
      {isValid ? (
        <Check size={14} color={theme.colors.success} />
      ) : (
        <AlertCircle size={14} color={theme.colors.textMuted} />
      )}
      <Text variant="caption" tone={isValid ? 'success' : 'muted'}>
        {isValid ? 'Strong password' : `Add: ${missing.join(', ')}`}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.xs, marginTop: -t.spacing.xs, marginBottom: t.spacing.md },
});