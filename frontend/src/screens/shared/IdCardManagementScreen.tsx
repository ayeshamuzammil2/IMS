import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { FilterBar } from '../../components/filters/FilterBar';
import { internsApi } from '../../api/resources/interns.api';
import { idCardsApi } from '../../api/resources/idcards.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { IdCardPreview } from '../../components/media/IdCardPreview';
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
  const cardShotRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  const [internProfileId, setInternProfileIdState] = useState<number | null>(null);
  const [designationOverride, setDesignationOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);

  const { data: interns = [] } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });

  // Only Admin sees a department filter - a Mentor's intern list is already scoped by the
  // backend to their own department, so a department picker would add nothing for them.
  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });
  const departmentSelectOptions = useMemo(() => departmentOptions.map((d) => ({ value: d.id, label: d.name })), [departmentOptions]);

  const filteredInterns = useMemo(() => {
    const term = search.trim().toLowerCase();
    return interns.filter((i) => {
      if (isAdmin && departmentFilter && i.departmentId !== departmentFilter) return false;
      if (!term) return true;
      return i.fullName.toLowerCase().includes(term) || i.internCode.toLowerCase().includes(term);
    });
  }, [interns, isAdmin, departmentFilter, search]);

  const internOptions = useMemo(
    () => filteredInterns.map((i) => ({ value: i.id, label: `${i.fullName} (${i.internCode})` })),
    [filteredInterns],
  );

  const handleDepartmentChange = (value: number | null) => {
    setDepartmentFilter(value);
    if (internProfileId && !interns.some((i) => i.id === internProfileId && (!value || i.departmentId === value))) {
      setInternProfileId(null);
    }
  };

  const cardQuery = useQuery({
    queryKey: ['idcards', 'intern', internProfileId],
    queryFn: () => idCardsApi.getForIntern(internProfileId!),
    enabled: internProfileId !== null,
  });

  const invalidateCard = () => queryClient.invalidateQueries({ queryKey: ['idcards', 'intern', internProfileId] });

  const designation = designationOverride ?? cardQuery.data?.designation ?? '';

  const setInternProfileId = (id: number | null) => {
    setInternProfileIdState(id);
    setDesignationOverride(null);
  };

  const handleSubmit = async () => {
    if (!internProfileId || !designation.trim()) return;
    setBusy(true);
    try {
      await idCardsApi.submit(internProfileId, designation.trim());
      Toast.show({ type: 'success', text1: 'ID card generated' });
      invalidateCard();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not generate ID card', text2: error?.response?.data?.message ?? error?.message });
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

  // Captures the EXACT on-screen IdCardPreview as a PNG and shares it via Expo's Sharing API.
  // The capture already produces a local file URI, so no separate download step is needed —
  // this guarantees the shared/saved card looks identical to what's on screen.
  const handleDownload = async () => {
    if (!cardShotRef.current?.capture) return;
    setDownloading(true);
    try {
      const uri = await cardShotRef.current.capture();
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save or share ID card' });
      } else {
        Toast.show({ type: 'error', text1: 'Sharing is not available on this device' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not save ID card', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen scroll>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by intern name or code"
        departmentOptions={isAdmin ? departmentSelectOptions : undefined}
        departmentValue={departmentFilter}
        onDepartmentChange={isAdmin ? handleDepartmentChange : undefined}
      />

      <SelectField label="Intern" required placeholder="Select an intern" value={internProfileId} options={internOptions} onChange={setInternProfileId} />

      {internProfileId ? (
        <View style={s.card}>
          <Input
            label="Designation"
            required
            placeholder="e.g. ERP Intern"
            value={designation}
            onChangeText={setDesignationOverride}
            error={!designation.trim() ? 'Designation is required before a card can be previewed or generated.' : undefined}
          />

          {designation.trim() ? (
            <IdCardPreview
              ref={cardShotRef}
              fullName={interns.find((i) => i.id === internProfileId)?.fullName ?? ''}
              designation={designation.trim()}
              email={cardQuery.data?.email ?? interns.find((i) => i.id === internProfileId)?.email ?? null}
              departmentName={cardQuery.data?.departmentName ?? null}
              cardNumber={cardQuery.data?.cardNumber ?? null}
              emergencyContactPhone={cardQuery.data?.emergencyContactPhone ?? null}
              photoFileId={cardQuery.data?.photoFileId ?? null}
            />
          ) : null}

          <Button label="Generate ID Card" onPress={handleSubmit} loading={busy} disabled={!designation.trim()} fullWidth />

          {cardQuery.data ? (
            <>
              <Text variant="bodyStrong" tone={CARD_STATUS_TONE[cardQuery.data.status]}>
                Status: {cardQuery.data.status}
                {cardQuery.data.cardNumber ? ` - ${cardQuery.data.cardNumber}` : ''}
              </Text>
              {isAdmin && cardQuery.data.status === 'PendingApproval' ? <Button label="Approve" onPress={handleApprove} loading={busy} fullWidth /> : null}
              {isAdmin && cardQuery.data.status === 'Approved' ? <Button label="Issue" onPress={handleIssue} loading={busy} fullWidth /> : null}
              {cardQuery.data.status === 'Issued' ? (
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
