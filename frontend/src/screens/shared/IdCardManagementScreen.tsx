import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { internsApi } from '../../api/resources/interns.api';
import { idCardsApi } from '../../api/resources/idcards.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

const CARD_STATUS_TONE: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  Draft: 'muted',
  PendingApproval: 'warning',
  Approved: 'warning',
  Issued: 'success',
  Rejected: 'error',
};

export function IdCardManagementScreen() {
  const s = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();

  const [internProfileId, setInternProfileId] = useState<number | null>(null);
  const [designation, setDesignation] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: interns = [] } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });
  const internOptions = useMemo(() => interns.map((i) => ({ value: i.id, label: `${i.fullName} (${i.internCode})` })), [interns]);

  const cardQuery = useQuery({
    queryKey: ['idcards', 'intern', internProfileId],
    queryFn: () => idCardsApi.getForIntern(internProfileId!),
    enabled: internProfileId !== null,
  });

  const invalidateCard = () => queryClient.invalidateQueries({ queryKey: ['idcards', 'intern', internProfileId] });

  const handleSubmit = async () => {
    if (!internProfileId) return;
    setBusy(true);
    try {
      await idCardsApi.submit(internProfileId, designation.trim() || null);
      Toast.show({ type: 'success', text1: 'ID card generated' });
      invalidateCard();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not generate ID card', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!internProfileId) return;
    setBusy(true);
    try {
      await idCardsApi.approve(internProfileId);
      Toast.show({ type: 'success', text1: 'ID card approved' });
      invalidateCard();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleIssue = async () => {
    if (!internProfileId) return;
    setBusy(true);
    try {
      await idCardsApi.issue(internProfileId);
      Toast.show({ type: 'success', text1: 'ID card issued' });
      invalidateCard();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not issue', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!cardQuery.data?.generatedFileId) return;
    setDownloading(true);
    try {
      await downloadAndShare(`${apiBaseUrl}/api/files/${cardQuery.data.generatedFileId}`, `idcard-${cardQuery.data.internCode ?? 'intern'}.pdf`);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open ID card', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen scroll>
      <SelectField label="Intern" required placeholder="Select an intern" value={internProfileId} options={internOptions} onChange={setInternProfileId} />

      {internProfileId ? (
        <View style={s.card}>
          <Input label="Designation" placeholder="e.g. ERP Intern" value={designation} onChangeText={setDesignation} />
          <Button label="Generate ID Card" onPress={handleSubmit} loading={busy} fullWidth />

          {cardQuery.data ? (
            <>
              <Text variant="bodyStrong" tone={CARD_STATUS_TONE[cardQuery.data.status]}>
                Status: {cardQuery.data.status}
                {cardQuery.data.cardNumber ? ` - ${cardQuery.data.cardNumber}` : ''}
              </Text>
              {isAdmin && cardQuery.data.status === 'PendingApproval' ? <Button label="Approve" onPress={handleApprove} loading={busy} fullWidth /> : null}
              {isAdmin && cardQuery.data.status === 'Approved' ? <Button label="Issue" onPress={handleIssue} loading={busy} fullWidth /> : null}
              {cardQuery.data.status === 'Issued' && cardQuery.data.generatedFileId ? (
                <Button label="Download" variant="outline" onPress={handleDownload} loading={downloading} fullWidth />
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    marginTop: t.spacing.md,
  },
});
