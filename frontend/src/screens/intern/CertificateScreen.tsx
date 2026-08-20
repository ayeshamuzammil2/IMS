import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Award, Clock, XCircle, Lock } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { certificatesApi, type CertificateStatusKey } from '../../api/resources/certificates.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const STATUS_CONFIG: Record<CertificateStatusKey, { tone: 'success' | 'warning' | 'error' | 'muted'; label: string; Icon: typeof Award }> = {
  Locked: { tone: 'muted', label: 'Not yet available - completes after your internship period and verification.', Icon: Lock },
  PendingApproval: { tone: 'warning', label: 'Generated - pending admin approval.', Icon: Clock },
  Approved: { tone: 'warning', label: 'Approved - awaiting issuance.', Icon: Clock },
  Issued: { tone: 'success', label: 'Issued', Icon: Award },
  Rejected: { tone: 'error', label: 'Rejected', Icon: XCircle },
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

  return (
    <Screen scroll>
      <View style={s.iconWrap}>
        <config.Icon size={48} color={theme.colors[config.tone === 'muted' ? 'textMuted' : config.tone]} />
      </View>
      <Text variant="h3" style={s.statusLabel} tone={config.tone}>
        {config.label}
      </Text>
      {data.certificateNumber ? (
        <Text variant="caption" tone="muted" style={s.centerText}>
          Certificate No: {data.certificateNumber}
        </Text>
      ) : null}
      {data.issueDate ? (
        <Text variant="caption" tone="muted" style={s.centerText}>
          Issued: {new Date(data.issueDate).toLocaleDateString()}
        </Text>
      ) : null}

      {data.status === 'Issued' && data.generatedFileId ? (
        <Button label="Download Certificate" onPress={handleDownload} loading={downloading} fullWidth style={s.downloadButton} />
      ) : null}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  iconWrap: { alignItems: 'center' as const, marginTop: t.spacing.xl, marginBottom: t.spacing.md },
  statusLabel: { textAlign: 'center' as const, marginBottom: t.spacing.xs, paddingHorizontal: t.spacing.lg },
  centerText: { textAlign: 'center' as const },
  downloadButton: { marginTop: t.spacing.xl },
});
