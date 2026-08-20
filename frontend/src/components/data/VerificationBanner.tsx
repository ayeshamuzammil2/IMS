import React from 'react';
import { View } from 'react-native';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react-native';
import { Text } from '../primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

export type VerificationStatus = 'PendingSubmission' | 'PendingReview' | 'Verified' | 'Rejected';

export function VerificationBanner({ status }: { status: VerificationStatus }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const config: Record<VerificationStatus, { bg: string; tone: 'success' | 'warning' | 'error'; label: string; Icon: typeof ShieldCheck }> = {
    Verified: { bg: theme.colors.successBg, tone: 'success', label: 'Verification complete - attendance is unlocked.', Icon: ShieldCheck },
    PendingReview: { bg: theme.colors.warningBg, tone: 'warning', label: 'Verification Pending - your mentor is reviewing your documents.', Icon: ShieldAlert },
    PendingSubmission: { bg: theme.colors.warningBg, tone: 'warning', label: 'Verification Pending - please upload all required documents.', Icon: ShieldAlert },
    Rejected: { bg: theme.colors.errorBg, tone: 'error', label: 'One or more documents were rejected. Please resubmit them.', Icon: ShieldX },
  };
  const c = config[status];
  return (
    <View style={[s.banner, { backgroundColor: c.bg }]}>
      <c.Icon size={18} color={theme.colors[c.tone]} />
      <Text variant="bodyStrong" tone={c.tone} style={s.text}>
        {c.label}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  banner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    borderRadius: t.radii.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.lg,
  },
  text: { flex: 1 },
});
