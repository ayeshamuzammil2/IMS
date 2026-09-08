import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Award, Clock, XCircle, Lock, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { certificatesApi, type CertificateStatusKey } from '../../api/resources/certificates.api';
import { filesApi, extensionForContentType } from '../../api/resources/files.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

type Tone = 'success' | 'warning' | 'error' | 'muted';

const STATUS_CONFIG: Record<
  CertificateStatusKey,
  {
    tone: Tone;
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

const stateTone: Record<Tone, 'success' | 'warning' | 'error'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  muted: 'warning',
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
      // Same reasoning as the mentor's preview: this can be a generated .pdf or a mentor-uploaded
      // .docx, so ask the server for the real content type instead of assuming .pdf.
      const meta = await filesApi.meta(data.generatedFileId);
      const extension = extensionForContentType(meta.contentType) || '.pdf';
      await downloadAndShare(
        `${apiBaseUrl}/api/files/${data.generatedFileId}`,
        `certificate-${data.internCode ?? 'me'}${extension}`,
        meta.contentType,
      );
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open certificate', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Screen scroll={false}>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" style={s.loadingText}>Loading Certificate details...</Text>
        </View>
      </Screen>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const IconComponent = config.Icon;
  const canDownload = data.status === 'Issued' && Boolean(data.generatedFileId);
  const activeToneColor = config.tone === 'muted' ? theme.colors.textMuted : theme.colors[stateTone[config.tone]];

  return (
    <Screen scroll style={s.container}>
      {/* Main Status Header Card (Compact Sizing) */}
      <View style={[s.statusCard, { borderColor: activeToneColor }]}>
        <View style={[s.iconBadge, { backgroundColor: `${activeToneColor}15` }]}>
          <IconComponent size={22} color={activeToneColor} />
        </View>

        <Text variant="h2" style={s.statusTitleText}>
          {config.title}
        </Text>

        <Text variant="caption" style={s.statusDescText}>
          {config.description}
        </Text>
      </View>

      {/* Certificate Details Meta Card */}
      {(data.certificateNumber || data.issueDate || data.attendanceRemark) && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Award size={16} color={theme.colors.primary} />
            <Text variant="overline" style={s.cardTitle}>
              CERTIFICATE DETAILS
            </Text>
          </View>

          <View style={s.detailsGroup}>
            {data.certificateNumber ? (
              <View style={s.detailRow}>
                <Text variant="caption" style={s.detailLabel}>Certificate No</Text>
                <Text variant="body" style={s.detailValue}>{data.certificateNumber}</Text>
              </View>
            ) : null}

            {data.certificateNumber && data.issueDate ? <View style={s.rowDivider} /> : null}

            {data.issueDate ? (
              <View style={s.detailRow}>
                <Text variant="caption" style={s.detailLabel}>Issued On</Text>
                <Text variant="body" style={s.detailValue}>
                  {new Date(data.issueDate).toLocaleDateString()}
                </Text>
              </View>
            ) : null}

            {(data.certificateNumber || data.issueDate) && data.attendanceRemark ? <View style={s.rowDivider} /> : null}

            {data.attendanceRemark ? (
              <View style={s.detailRow}>
                <Text variant="caption" style={s.detailLabel}>Remarks</Text>
                <Text variant="body" style={[s.detailValue, { textAlign: 'right', flexShrink: 1 }]}>
                  {data.attendanceRemark}
                  {data.attendancePercentage !== null ? ` (${data.attendancePercentage}% attendance)` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Actions Group */}
      <View style={s.actionsGroup}>
        <Button
          label={downloading ? 'Downloading...' : 'Download Certificate'}
          onPress={handleDownload}
          disabled={!canDownload || downloading}
          loading={downloading}
          fullWidth
          style={s.actionButton}
        />

        {!canDownload ? (
          <View style={s.reasonBox}>
            <AlertCircle size={14} color={theme.colors.textSecondary} />
            <Text variant="caption" style={s.reasonText}>
              Download unlocks after admin approval
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: t.spacing.xl,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  loadingText: {
    color: t.colors.textSecondary,
  },
  statusCard: {
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    marginBottom: t.spacing.sm,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 4,
  },
  statusTitleText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: t.colors.textPrimary,
    textAlign: 'center' as const,
    marginTop: 2,
    marginBottom: 2,
  },
  statusDescText: {
    color: t.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center' as const,
    paddingHorizontal: t.spacing.xs,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: t.spacing.md,
  },
  cardTitle: {
    color: t.colors.textSecondary,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  detailsGroup: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: 4,
  },
  detailLabel: {
    color: t.colors.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.colors.textPrimary,
  },
  actionsGroup: {
    gap: t.spacing.xs,
  },
  actionButton: {
    marginTop: t.spacing.xs,
  },
  reasonBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: t.spacing.xs,
  },
  reasonText: {
    textAlign: 'center' as const,
    color: t.colors.textSecondary,
    fontSize: 11.5,
  },
});