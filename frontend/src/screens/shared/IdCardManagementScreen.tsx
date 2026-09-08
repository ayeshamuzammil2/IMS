import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { View, Pressable } from 'react-native';
import { appAlert } from '../../lib/appAlert';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Search, X, Trash2 } from 'lucide-react-native';
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
import { useFocusEffect } from '@react-navigation/native';

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

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowSearch(false);
        setSearch('');
        setInternProfileIdState(null);
        setDesignationOverride(null);
      };
    }, [])
  );

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

  const handleDelete = () => {
    if (!internProfileId) return;
    appAlert.alert('Delete ID Card', 'Are you sure you want to delete this ID card?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            if (idCardsApi.delete) {
              await idCardsApi.delete(internProfileId);
            }
            Toast.show({ type: 'success', text1: 'ID card deleted' });
            invalidateCard();
          } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Could not delete', text2: error?.message });
          } finally {
            setBusy(false);
          }
        }
      }
    ]);
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
    <Screen scroll style={s.screenContainer}>
      {/* Header Container matching Document Review screen styling */}
      <View style={s.headerContainer}>
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {internOptions.length} {internOptions.length === 1 ? 'INTERN' : 'INTERNS'} FOUND
            </Text>
          </View>

          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? <X size={18} color={theme.colors.primary} /> : <Search size={18} color={theme.colors.textMuted} />}
          </Pressable>
        </View>

        {showSearch ? (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by intern name or code..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        ) : null}

        <View style={s.filterWrapper}>
          <SelectField
            label="Intern"
            required
            placeholder="Select an intern"
            value={internProfileId ? String(internProfileId) : ''}
            options={internOptions}
            onChange={setInternProfileId}
          />
        </View>
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

          {/* Generate ID Card Button */}
          <Button label="Generate ID Card" onPress={handleSubmit} loading={busy} disabled={!designation.trim()} fullWidth />

          {cardQuery.data ? (
            <>
              <View style={s.statusDeleteRow}>
                <Text variant="bodyStrong" tone={CARD_STATUS_TONE[cardQuery.data.status]} style={{ flex: 1 }}>
                  Status: {cardQuery.data.status}
                  {cardQuery.data.cardNumber ? ` - ${cardQuery.data.cardNumber}` : ''}
                </Text>
                
                {/* Delete Icon Button */}
                <Pressable hitSlop={8} style={s.deleteIconBtn} onPress={handleDelete}>
                  <Trash2 size={18} color={theme.colors.error} />
                </Pressable>
              </View>

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
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: 16,
  },
  headerContainer: {
    marginBottom: t.spacing.md,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  titleIndicator: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: t.colors.primary,
  },
  headerLabel: {
    letterSpacing: 1,
  },
  filterWrapper: {
    marginTop: t.spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconButtonActive: {
    borderColor: t.colors.primary,
    backgroundColor: `${t.colors.primary}10`,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    gap: t.spacing.md,
    marginTop: t.spacing.md,
  },
  statusDeleteRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  deleteIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: t.colors.errorBg || '#FEF2F2',
  },
});