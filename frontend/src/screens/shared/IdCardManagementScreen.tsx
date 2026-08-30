import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { View, Pressable } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Search, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { internsApi } from '../../api/resources/interns.api';
import { idCardsApi } from '../../api/resources/idcards.api';
import { IdCardPreview } from '../../components/media/IdCardPreview';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
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
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const cardShotRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  const [internProfileId, setInternProfileIdState] = useState<number | null>(null);
  const [designationOverride, setDesignationOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const { data: interns = [] } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });

  const filteredInterns = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return interns;
    return interns.filter(
      (i) =>
        i.fullName.toLowerCase().includes(term) ||
        i.internCode.toLowerCase().includes(term)
    );
  }, [interns, search]);

  const internOptions = useMemo(
    () => filteredInterns.map((i) => ({ value: String(i.id), label: `${i.fullName} (${i.internCode})` })),
    [filteredInterns]
  );

  // Auto-sync search results with active intern selection
  useEffect(() => {
    if (search.trim() && filteredInterns.length > 0) {
      const matchExists = filteredInterns.some((i) => i.id === internProfileId);
      if (!matchExists) {
        setInternProfileIdState(filteredInterns[0].id);
        setDesignationOverride(null);
      }
    }
  }, [search, filteredInterns, internProfileId]);

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

  const cardQuery = useQuery({
    queryKey: ['idcards', 'intern', internProfileId],
    queryFn: () => idCardsApi.getForIntern(internProfileId!),
    enabled: internProfileId !== null,
  });

  const invalidateCard = () => queryClient.invalidateQueries({ queryKey: ['idcards', 'intern', internProfileId] });

  const designation = designationOverride ?? cardQuery.data?.designation ?? '';

  const setInternProfileId = (id: string | number | null) => {
    setInternProfileIdState(id ? Number(id) : null);
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
      <SelectField
        label="Intern"
        required
        placeholder="Select an intern"
        value={internProfileId ? String(internProfileId) : ''}
        options={internOptions}
        onChange={setInternProfileId}
      />

      {/* Search Icon Trigger & Expandable Input under Intern SelectField */}
      <View style={s.searchBarSection}>
        <View style={s.searchIconRow}>
          <Pressable onPress={toggleSearch} style={s.iconButton} hitSlop={8}>
            {showSearch ? (
              <X size={20} color={theme.colors.textSecondary} />
            ) : (
              <Search size={20} color={theme.colors.textSecondary} />
            )}
          </Pressable>
        </View>

        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by intern name or code..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}
      </View>

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
  searchBarSection: {
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.sm,
  },
  searchIconRow: {
    alignItems: 'flex-end' as const,
  },
  iconButton: {
    padding: 8,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
  },
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