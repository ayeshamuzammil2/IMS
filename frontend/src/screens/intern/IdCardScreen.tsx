import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { IdCard as IdCardIcon, Clock, XCircle, Lock } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { idCardsApi, type IdCardStatusKey } from '../../api/resources/idcards.api';
import { IdCardPreview } from '../../components/media/IdCardPreview';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const STATUS_CONFIG: Record<IdCardStatusKey, { tone: 'success' | 'warning' | 'error' | 'muted'; label: string; Icon: typeof IdCardIcon }> = {
  Draft: { tone: 'muted', label: 'Not yet requested by your mentor.', Icon: Lock },
  PendingApproval: { tone: 'warning', label: 'Generated - pending admin approval.', Icon: Clock },
  Approved: { tone: 'warning', label: 'Approved - awaiting issuance.', Icon: Clock },
  Issued: { tone: 'success', label: 'Issued', Icon: IdCardIcon },
  Rejected: { tone: 'error', label: 'Rejected', Icon: XCircle },
};

export function IdCardScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['idcards', 'mine'],
    queryFn: idCardsApi.getMine,
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
      await downloadAndShare(`${apiBaseUrl}/api/files/${data.generatedFileId}`, `idcard-${data.internCode ?? 'me'}.pdf`);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open ID card', text2: error?.message });
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
      {data.status !== 'Draft' ? (
        <IdCardPreview
          fullName={data.internFullName ?? ''}
          designation={data.designation ?? ''}
          email={data.email}
          departmentName={data.departmentName}
          cardNumber={data.cardNumber}
          emergencyContactPhone={data.emergencyContactPhone}
          photoFileId={data.photoFileId}
        />
      ) : null}

      <View style={s.iconWrap}>
        <config.Icon size={48} color={theme.colors[config.tone === 'muted' ? 'textMuted' : config.tone]} />
      </View>
      <Text variant="h3" style={s.statusLabel} tone={config.tone}>
        {config.label}
      </Text>
      {data.validUntil ? (
        <Text variant="caption" tone="muted" style={s.centerText}>
          Valid until: {new Date(data.validUntil).toLocaleDateString()}
        </Text>
      ) : null}

      {data.status === 'Issued' && data.generatedFileId ? (
        <Button label="Download ID Card" onPress={handleDownload} loading={downloading} fullWidth style={s.downloadButton} />
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
