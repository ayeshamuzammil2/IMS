import React, { useMemo, useState, useCallback } from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { appAlert } from '../../lib/appAlert';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Search, X, Eye, Edit2, Trash2, UploadCloud } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { internsApi } from '../../api/resources/interns.api';
import { certificatesApi } from '../../api/resources/certificates.api';
import { filesApi, extensionForContentType } from '../../api/resources/files.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';
import { useFocusEffect } from '@react-navigation/native';

// --- Card Component For Each Intern ---
const InternCertificateCard = ({ intern, isAdmin, theme, s }: any) => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const certQuery = useQuery({
    queryKey: ['certificates', 'intern', intern.id],
    queryFn: () => certificatesApi.getForIntern(intern.id),
  });

  const cert = certQuery.data;
  const status = cert?.status || 'No Document';

  // Status Styling Logic
  let statusBg = theme.colors.surfaceSunken;
  let statusToneType: 'muted' | 'success' | 'warning' | 'error' = 'muted';
  
  if (status === 'Issued') {
    statusBg = theme.colors.successBg || '#F0FDF4';
    statusToneType = 'success';
  } else if (status === 'PendingApproval' || status === 'Approved') {
    statusBg = theme.colors.warningBg || '#FFFBEB';
    statusToneType = 'warning';
  } else if (status === 'Rejected') {
    statusBg = theme.colors.errorBg || '#FEF2F2';
    statusToneType = 'error';
  }

  const invalidateCert = () => queryClient.invalidateQueries({ queryKey: ['certificates', 'intern', intern.id] });

  // 1. Upload / Replace File
  const handleUploadFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      copyToCacheDirectory: true,
    });
    
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    
    setBusy(true);
    try {
      await certificatesApi.uploadForIntern(intern.id, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? null,
      });
      Toast.show({ type: 'success', text1: 'Document uploaded successfully!' });
      invalidateCert();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not upload document', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  // 2. Preview
  const handlePreview = async () => {
    if (!cert?.generatedFileId) {
      Toast.show({ type: 'error', text1: 'File not available yet' });
      return;
    }
    setDownloading(true);
    try {
      // The certificate file can be a generated .pdf OR a mentor-uploaded .docx - fetch its real
      // content type instead of assuming .pdf, otherwise a .docx opens with the wrong
      // extension/mime type and most viewers refuse to open it (looks like "not viewable").
      const meta = await filesApi.meta(cert.generatedFileId);
      const extension = extensionForContentType(meta.contentType) || '.pdf';
      await downloadAndShare(
        `${apiBaseUrl}/api/files/${cert.generatedFileId}`,
        `certificate-${intern.internCode}${extension}`,
        meta.contentType,
      );
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open preview', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  // 3. Delete
  const handleDelete = () => {
    appAlert.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await certificatesApi.delete(intern.id); 
            Toast.show({ type: 'success', text1: 'Document deleted' });
            invalidateCert();
          } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Could not delete', text2: error?.message });
          } finally {
            setBusy(false);
          }
        }
      }
    ]);
  };

  // Admin Actions
  const handleApprove = async () => {
    setBusy(true);
    try {
      await certificatesApi.approve(intern.id);
      Toast.show({ type: 'success', text1: 'Certificate approved' });
      invalidateCert();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally { setBusy(false); }
  };

  const handleIssue = async () => {
    setBusy(true);
    try {
      await certificatesApi.issue(intern.id);
      Toast.show({ type: 'success', text1: 'Certificate issued' });
      invalidateCert();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not issue', text2: error?.message });
    } finally { setBusy(false); }
  };

  return (
    <View style={s.card}>
      {/* Header Info */}
      <View style={s.cardHeader}>
        <View style={s.avatarBadge}>
          <Text variant="bodyStrong" style={s.avatarText}>
            {intern.fullName?.charAt(0).toUpperCase() || 'I'}
          </Text>
        </View>
        <View style={s.cardHeaderText}>
          <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
            {intern.fullName}
          </Text>
          <Text variant="caption" tone="muted" style={s.emailText} numberOfLines={1}>
            Code: {intern.internCode}
          </Text>
        </View>
      </View>

      {/* Status Row */}
      <View style={s.statusRow}>
        <View style={s.metaLeftGroup}>
          <Text variant="caption" tone="muted" style={s.mentorText} numberOfLines={1}>
            Cert No: {cert?.certificateNumber || 'N/A'}
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: statusBg }]}>
          <Text variant="caption" tone={statusToneType} style={s.badgeText}>
            {status}
          </Text>
        </View>
      </View>

      {cert?.attendanceRemark ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 4 }} numberOfLines={2}>
          Remarks: {cert.attendanceRemark}
          {cert.attendancePercentage !== null ? ` (${cert.attendancePercentage}% attendance)` : ''}
        </Text>
      ) : null}

      <View style={s.divider} />

      {/* Actions Row (Pushed completely to the Right) */}
      <View style={s.actionsRowContainer}>
        {!cert && !certQuery.isLoading && (
          <Text variant="caption" tone="muted" style={{ paddingLeft: 4 }}>
            No document attached
          </Text>
        )}
        
        <View style={s.actionsRow}>
          {certQuery.isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : !cert ? (
            <Pressable hitSlop={8} style={s.actionIcon} onPress={handleUploadFile}>
              {busy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <UploadCloud size={16} color={theme.colors.primary} />}
            </Pressable>
          ) : (
            <>
              <Pressable hitSlop={8} style={s.actionIcon} onPress={handlePreview} disabled={downloading}>
                {downloading ? <ActivityIndicator size="small" color={theme.colors.textMuted} /> : <Eye size={16} color={theme.colors.textMuted} />}
              </Pressable>

              <Pressable hitSlop={8} style={s.actionIcon} onPress={handleUploadFile}>
                {busy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Edit2 size={16} color={theme.colors.primary} />}
              </Pressable>

              <Pressable hitSlop={8} style={s.actionIcon} onPress={handleDelete}>
                {busy ? <ActivityIndicator size="small" color={theme.colors.error} /> : <Trash2 size={16} color={theme.colors.error} />}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Admin Quick Actions */}
      {isAdmin && cert?.status === 'PendingApproval' && (
        <Button label="Approve Certificate" size="sm" onPress={handleApprove} loading={busy} fullWidth style={{ marginTop: theme.spacing.md }} />
      )}
      {isAdmin && cert?.status === 'Approved' && (
        <Button label="Issue Certificate" size="sm" onPress={handleIssue} loading={busy} fullWidth style={{ marginTop: theme.spacing.md }} />
      )}
    </View>
  );
};

// --- Main Screen ---
export function CertificateManagementScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [internFilter, setInternFilter] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowSearch(false);
        setSearch('');
        setInternFilter(null);
      };
    }, [])
  );

  const { data: interns = [], isLoading } = useQuery({ 
    queryKey: ['interns'], 
    queryFn: () => internsApi.list() 
  });

  const internSelectOptions = useMemo(() => {
    return interns
      .map((i: any) => ({ value: i.id, label: `${i.fullName} (${i.internCode})` }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label));
  }, [interns]);

  const filteredInterns = useMemo(() => {
    const term = search.trim().toLowerCase();
    return interns.filter((i: any) => {
      if (internFilter && i.id !== internFilter) return false;
      if (!term) return true;
      return i.fullName?.toLowerCase().includes(term) || i.internCode?.toLowerCase().includes(term);
    });
  }, [interns, internFilter, search]);

  const toggleSearch = () => {
    if (showSearch) setSearch('');
    setShowSearch((prev) => !prev);
  };

  return (
    <Screen scroll={false} style={s.screenContainer}>
      <View style={s.headerContainer}>
        {/* Header Label Row */}
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {filteredInterns.length} {filteredInterns.length === 1 ? 'INTERN' : 'INTERNS'} FOUND
            </Text>
          </View>

          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? (
              <X size={18} color={theme.colors.primary} />
            ) : (
              <Search size={18} color={theme.colors.textMuted} />
            )}
          </Pressable>
        </View>

        {/* Expandable Search Input */}
        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search intern by name or code..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}

        {/* Intern Filter Dropdown */}
        <View style={s.filterWrapper}>
          <SelectField
            label="Intern"
            placeholder="All interns"
            value={internFilter ? String(internFilter) : ''}
            options={internSelectOptions}
            onChange={(val) => setInternFilter(val ? Number(val) : null)}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading interns...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInterns}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={({ item }) => <InternCertificateCard intern={item} isAdmin={isAdmin} theme={theme} s={s} />}
          style={s.list}
          contentContainerStyle={filteredInterns.length === 0 ? s.emptyListContent : s.listContent}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text variant="body" tone="muted">
                {search.trim() || internFilter ? 'No intern matching search criteria.' : 'No interns available.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: 8,
  },
  headerContainer: {
    marginTop: t.spacing.sm,
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
  list: { flex: 1 },
  listContent: {
    gap: t.spacing.md,
    paddingBottom: t.spacing.xl * 1.5,
  },
  emptyListContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    color: t.colors.primary,
    fontSize: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  emailText: {
    marginTop: 3,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 12,
    paddingLeft: 2,
  },
  metaLeftGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
  },
  mentorText: {
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  actionsRowContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    paddingTop: 4,
    marginLeft: 'auto',
  },
  actionIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: t.colors.surfaceSunken,
  },
  emptyBox: {
    paddingVertical: t.spacing.xl * 2,
    alignItems: 'center' as const,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});