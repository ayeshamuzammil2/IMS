import React from 'react';
import { View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { Text } from '../primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { PASSWORD_RULES, containsName } from '../../lib/passwordPolicy';
import type { AppTheme } from '../../theme/types';

interface Props {
  password: string;
  /** When provided, also shows a live "doesn't contain your name" check (mirrors the backend rule). */
  fullName?: string | null;
}

/** Real-time complexity hints shown below a password input, re-evaluated on every keystroke. */
export function PasswordStrengthChecklist({ password, fullName }: Props) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const nameIsClean = !containsName(password, fullName);

  return (
    <View style={s.container}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <View key={rule.key} style={s.row}>
            {ok ? <Check size={14} color={theme.colors.success} /> : <X size={14} color={theme.colors.textMuted} />}
            <Text variant="caption" tone={ok ? 'success' : 'muted'}>
              {rule.label}
            </Text>
          </View>
        );
      })}
      {fullName ? (
        <View style={s.row}>
          {nameIsClean ? <Check size={14} color={theme.colors.success} /> : <X size={14} color={theme.colors.error} />}
          <Text variant="caption" tone={nameIsClean ? 'success' : 'error'}>
            Doesn&apos;t contain your name
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: { gap: 4, marginTop: -t.spacing.sm, marginBottom: t.spacing.md },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.xs },
});
