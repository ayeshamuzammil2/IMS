import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Award, Clock, XCircle, Lock, ShieldCheck, Download, AlertCircle } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { certificatesApi, type CertificateStatusKey } from '../../api/resources/certificates.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const STATUS_CONFIG: Record<
  CertificateStatusKey,
  {
    tone: 'success' | 'warning' | 'error' | 'muted';
    title: string;
    description: string;
    Icon: typeof Award;
  }
> = {
  Locked: {
    tone: 'muted',
    title: 'Certificate Locked',
    description: 'Not yet available. It will unlock automatically after your internship period and document verification are completed.',
    Icon: Lock,
  },
  PendingApproval: {
    tone: 'warning',
    title: 'Pending Admin Approval',
    description: 'Your certificate has been generated and is awaiting final approval from the administration.',
    Icon: Clock,
  },
  Approved: {
    tone: 'warning',
    title: 'Approved - Awaiting Issuance',
    description: 'Your certificate is approved and will be issued very soon.',
    Icon: Clock,
  },
  Issued: {
    tone: 'success',
    title: 'Certificate Successfully Issued!',
    description: 'Congratulations! Your official internship completion certificate is ready for download.',
    Icon: ShieldCheck,
  },
  Rejected: {
    tone: 'error',
    title: 'Certificate Request Rejected',
    description: 'Your certificate issuance was rejected. Please contact your coordinator or support for details.',
    Icon: XCircle,
  },
};

export function CertificateScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['certificates', 'mine'],
    queryFn: certificatesApi.getMine,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleDownload = async () => {
    if (!data?.generatedFileId) return;
    setDownloading(true);
    try {
      await downloadAndShare(`${apiBaseUrl}/api/files/${data.generatedFileId}`, `certificate-${data.internCode ?? 'me'}.pdf`);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open certificate', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Screen>
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      </Screen>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const IconComponent = config.Icon;

  return (
    <Screen scroll>
      {/* Main Status Banner Card */}
      <View style={[s.card, s[`card_${config.tone}`]]}>
        <View style={[s.iconWrapper, s[`iconWrapper_${config.tone}`]]}>
          <IconComponent size={32} color={getIconColor(config.tone, theme)} />
        </View>

        <Text variant="h3" style={s.cardTitle}>
          {config.title}
        </Text>

        <Text variant="caption" tone="muted" style={s.cardDescription}>
          {config.description}
        </Text>

        {/* Dynamic Badges & Meta Info */}
        {(data.certificateNumber || data.issueDate) && (
          <View style={s.metaContainer}>
            {data.certificateNumber ? (
              <View style={s.metaRow}>
                <Text variant="caption" tone="muted">
                  Certificate No:
                </Text>
                <Text variant="caption" style={s.metaValue}>
                  {data.certificateNumber}
                </Text>
              </View>
            ) : null}

            {data.issueDate ? (
              <View style={s.metaRow}>
                <Text variant="caption" tone="muted">
                  Issued On:
                </Text>
                <Text variant="caption" style={s.metaValue}>
                  {new Date(data.issueDate).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Action Button for Issued State */}
        {data.status === 'Issued' && data.generatedFileId ? (
          <Button
            label="Download Certificate"
            onPress={handleDownload}
            loading={downloading}
            fullWidth
            style={s.downloadButton}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function getIconColor(tone: 'success' | 'warning' | 'error' | 'muted', theme: AppTheme) {
  switch (tone) {
    case 'success':
      return theme.colors.success;
    case 'warning':
      return theme.colors.warning;
    case 'error':
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
}

const makeStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    padding: t.spacing.xl,
    alignItems: 'center' as const,
    marginTop: t.spacing.md,
  },
  card_success: {
    borderColor: t.colors.success,
    backgroundColor: t.colors.successBg,
  },
  card_warning: {
    borderColor: t.colors.warning,
    backgroundColor: t.colors.warningBg,
  },
  card_error: {
    borderColor: t.colors.error,
    backgroundColor: t.colors.errorBg,
  },
  card_muted: {
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },

  iconWrapper: {
    padding: t.spacing.md,
    borderRadius: 50,
    marginBottom: t.spacing.md,
  },
  iconWrapper_success: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  iconWrapper_warning: { backgroundColor: 'rgba(234, 179, 8, 0.15)' },
  iconWrapper_error: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  iconWrapper_muted: { backgroundColor: t.colors.surfaceSunken },

  cardTitle: {
    textAlign: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  cardDescription: {
    textAlign: 'center' as const,
    lineHeight: 18,
    marginBottom: t.spacing.md,
  },

  metaContainer: {
    width: '100%' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    padding: t.spacing.md,
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  metaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  metaValue: {
    fontWeight: '600' as const,
  },

  downloadButton: {
    marginTop: t.spacing.lg,
  },
});