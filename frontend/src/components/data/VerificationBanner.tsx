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

  const config: Record<
    VerificationStatus,
    { bg: string; iconBg: string; tone: 'success' | 'warning' | 'error'; label: string; Icon: typeof ShieldCheck }
  > = {
    Verified: {
      bg: theme.colors.surface,
      iconBg: theme.colors.successBg,
      tone: 'success',
      label: 'Verification Completed',
      Icon: ShieldCheck,
    },
    PendingReview: {
      bg: theme.colors.surface,
      iconBg: theme.colors.warningBg,
      tone: 'warning',
      label: 'Verification Pending — mentor review in progress.',
      Icon: ShieldAlert,
    },
    PendingSubmission: {
      bg: theme.colors.surface,
      iconBg: theme.colors.warningBg,
      tone: 'warning',
      label: 'Verification Pending — please upload required documents.',
      Icon: ShieldAlert,
    },
    Rejected: {
      bg: theme.colors.surface,
      iconBg: theme.colors.errorBg,
      tone: 'error',
      label: 'Document Rejected — please resubmit your files.',
      Icon: ShieldX,
    },
  };

  const c = config[status];

  return (
    <View style={s.banner}>
      <View style={[s.iconBox, { backgroundColor: c.iconBg }]}>
        <c.Icon size={18} color={theme.colors[c.tone]} />
      </View>
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
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: t.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: t.spacing.sm + 2,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: t.radii.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});