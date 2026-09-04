import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { FileText, AlertCircle, ShieldCheck, Clock, X, File } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { AuthImage } from '../../components/media/AuthImage';
import { documentsApi, type DocumentDto, type DocumentTypeKey } from '../../api/resources/documents.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const REQUIRED_TYPES: { key: DocumentTypeKey; label: string; helper: string; imageOnly: boolean }[] = [
  { key: 'ProfilePhoto', label: 'Profile Photo', helper: 'Passport-style photo, plain white or blue background.', imageOnly: true },
  { key: 'CnicFront', label: 'CNIC (Front)', helper: 'A clear scan or photo of the front of your CNIC.', imageOnly: false },
  { key: 'CnicBack', label: 'CNIC (Back)', helper: 'A clear scan or photo of the back of your CNIC.', imageOnly: false },
  { key: 'Resume', label: 'Resume', helper: 'Your latest resume (PDF or image).', imageOnly: false },
  { key: 'ReferenceLetter', label: 'Reference Letter', helper: 'A reference or recommendation letter.', imageOnly: false },
];

function isImageFile(doc: DocumentDto | undefined): boolean {
  if (!doc) return false;
  return (
    ['ProfilePhoto', 'CnicFront', 'CnicBack'].includes(doc.documentType) ||
    Boolean((doc as any).contentType?.startsWith('image/')) ||
    Boolean((doc as any).mimeType?.startsWith('image/'))
  );
}

export function DocumentsScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<DocumentTypeKey | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentDto | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', 'dashboard'],
    queryFn: documentsApi.getDashboard,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const documentsByType = new Map<DocumentTypeKey, DocumentDto>();
  for (const doc of data?.documents ?? []) documentsByType.set(doc.documentType, doc);
  const extraDocument = documentsByType.get('ExtraDocument');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['documents', 'dashboard'] });

  const handleUpload = async (typeConfig: (typeof REQUIRED_TYPES)[number]) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: typeConfig.imageOnly ? 'image/*' : ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingType(typeConfig.key);
    try {
      await documentsApi.upload({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }, typeConfig.key);
      Toast.show({ type: 'success', text1: `${typeConfig.label} uploaded`, text2: 'Awaiting review by your mentor.' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: error?.message });
    } finally {
      setUploadingType(null);
    }
  };

  const handleUploadExtraFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingType('ExtraDocument');
    try {
      await documentsApi.upload({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }, 'ExtraDocument');
      Toast.show({ type: 'success', text1: 'Additional document uploaded', text2: 'Awaiting review by your mentor.' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: error?.message });
    } finally {
      setUploadingType(null);
    }
  };

  const handleDocumentClick = async (doc: DocumentDto) => {
    if (!doc.fileId) return;

    if (isImageFile(doc)) {
      setPreviewDoc(doc);
    } else {
      try {
        await downloadAndShare(`${apiBaseUrl}/api/files/${doc.fileId}`, `doc-${doc.id}`);
      } catch (error: any) {
        Toast.show({ type: 'error', text1: 'Could not open file', text2: error?.message });
      }
    }
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" tone="muted">Loading document details...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={s.screenContainer}>
      {data?.verificationStatus ? (
        <EnhancedVerificationBanner status={data.verificationStatus} />
      ) : null}

      <View style={s.listContainer}>
        {REQUIRED_TYPES.map((typeConfig) => {
          const doc = documentsByType.get(typeConfig.key);
          const isImg = isImageFile(doc);

          return (
            <View key={typeConfig.key} style={s.card}>
              <View style={s.cardHeader}>
                <Pressable
                  onPress={() => doc && handleDocumentClick(doc)}
                  disabled={!doc}
                  style={[s.avatarBadge, doc && !isImg && s.pdfAvatarBadge]}
                >
                  {doc?.fileId ? (
                    isImg ? (
                      <AuthImage fileId={doc.fileId} size={44} style={s.avatarImage} />
                    ) : (
                      <File size={20} color={theme.colors.primary} />
                    )
                  ) : (
                    <FileText size={20} color={theme.colors.textMuted} />
                  )}
                </Pressable>

                <View style={s.cardHeaderText}>
                  <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
                    {typeConfig.label}
                  </Text>
                  <Text variant="caption" tone="muted" style={s.subText} numberOfLines={2}>
                    {typeConfig.helper}
                  </Text>
                </View>
              </View>

              <View style={s.statusRow}>
                <View style={s.metaLeftGroup}>
                  <Text variant="caption" tone="muted" style={s.deptText} numberOfLines={1}>
                    Status
                  </Text>
                </View>

                <StatusBadge status={doc?.status ?? null} />
              </View>

              {doc?.status === 'Rejected' && doc.remarks ? (
                <View style={s.remarksCard}>
                  <View style={s.remarksHeader}>
                    <AlertCircle size={15} color={theme.colors.error} />
                    <Text variant="overline" style={s.remarksTitle}>
                      REJECTION REASON
                    </Text>
                  </View>
                  <Text variant="caption" style={s.remarksText}>
                    {doc.remarks}
                  </Text>
                </View>
              ) : null}

              <View style={s.divider} />

              <View style={s.actionRow}>
                <Button
                  label={doc ? 'Re-upload' : 'Upload'}
                  size="sm"
                  variant={doc?.status === 'Rejected' ? 'danger' : 'primary'}
                  loading={uploadingType === typeConfig.key}
                  onPress={() => handleUpload(typeConfig)}
                  style={s.actionBtn}
                />
              </View>
            </View>
          );
        })}

        <ExtraDocumentCard
          doc={extraDocument}
          uploading={uploadingType === 'ExtraDocument'}
          onUploadFile={handleUploadExtraFile}
          onDocumentClick={handleDocumentClick}
          onSubmitLink={async (url) => {
            setUploadingType('ExtraDocument');
            try {
              await documentsApi.submitExtraLink(url);
              Toast.show({ type: 'success', text1: 'Link submitted', text2: 'Awaiting review by your mentor.' });
              invalidate();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Could not submit link', text2: error?.response?.data?.message ?? error?.message });
            } finally {
              setUploadingType(null);
            }
          }}
        />
      </View>

      <Modal visible={Boolean(previewDoc)} transparent animationType="fade" onRequestClose={() => setPreviewDoc(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text variant="body" style={s.modalTitle}>
                Document Preview
              </Text>
              <Pressable onPress={() => setPreviewDoc(null)} hitSlop={10}>
                <X size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
            {previewDoc?.fileId ? (
              <AuthImage fileId={previewDoc.fileId} style={s.previewImage} contentFit="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function EnhancedVerificationBanner({ status }: { status: string }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const isApproved = status === 'Approved' || status === 'Verified';

  return (
    <View style={[s.bannerCard, { borderColor: isApproved ? theme.colors.success : theme.colors.warning }]}>
      <View style={[s.iconBox, { backgroundColor: isApproved ? `${theme.colors.success}15` : `${theme.colors.warning}15` }]}>
        {isApproved ? (
          <ShieldCheck size={20} color={theme.colors.success} />
        ) : (
          <Clock size={20} color={theme.colors.warning} />
        )}
      </View>
      <View style={s.bannerTextContainer}>
        <Text variant="body" style={[s.bannerTitle, { color: isApproved ? theme.colors.success : theme.colors.warning }]}>
          {isApproved ? 'Verification Completed' : 'Verification Pending'}
        </Text>
        <Text variant="caption" style={s.bannerDesc}>
          {isApproved ? 'All required documents have been reviewed and verified.' : 'Documents are under review by your mentor.'}
        </Text>
      </View>
    </View>
  );
}

function ExtraDocumentCard({
  doc,
  uploading,
  onUploadFile,
  onDocumentClick,
  onSubmitLink,
}: {
  doc: DocumentDto | undefined;
  uploading: boolean;
  onUploadFile: () => void;
  onDocumentClick: (doc: DocumentDto) => void;
  onSubmitLink: (url: string) => void;
}) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [link, setLink] = useState(doc?.externalLinkUrl ?? '');
  const isImg = isImageFile(doc);

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Pressable
          onPress={() => doc && onDocumentClick(doc)}
          disabled={!doc}
          style={[s.avatarBadge, doc && !isImg && s.pdfAvatarBadge]}
        >
          {doc?.fileId ? (
            isImg ? (
              <AuthImage fileId={doc.fileId} size={44} style={s.avatarImage} />
            ) : (
              <File size={20} color={theme.colors.primary} />
            )
          ) : (
            <FileText size={20} color={theme.colors.textMuted} />
          )}
        </Pressable>

        <View style={s.cardHeaderText}>
          <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
            Extra Document
          </Text>
          <Text variant="caption" tone="muted" style={s.subText} numberOfLines={2}>
            Portfolio, certificate, or writing sample.
          </Text>
        </View>
      </View>

      <View style={s.statusRow}>
        <View style={s.metaLeftGroup}>
          <Text variant="caption" tone="muted" style={s.deptText} numberOfLines={1}>
            Status
          </Text>
        </View>

        <StatusBadge status={doc?.status ?? null} />
      </View>

      {doc?.status === 'Rejected' && doc.remarks ? (
        <View style={s.remarksCard}>
          <View style={s.remarksHeader}>
            <AlertCircle size={15} color={theme.colors.error} />
            <Text variant="overline" style={s.remarksTitle}>
              REJECTION REASON
            </Text>
          </View>
          <Text variant="caption" style={s.remarksText}>
            {doc.remarks}
          </Text>
        </View>
      ) : null}

      <View style={s.divider} />

      <View style={s.actionRow}>
        <Button
          label={doc ? 'Re-upload File' : 'Upload File'}
          size="sm"
          variant={doc?.status === 'Rejected' ? 'danger' : 'primary'}
          loading={uploading}
          onPress={onUploadFile}
          style={s.actionBtn}
        />
      </View>

      <View style={s.formGroup}>
        <Input label="Or paste a link" value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://..." />
        <Button
          label="Submit Link"
          variant="outline"
          size="sm"
          loading={uploading}
          disabled={!link.trim()}
          onPress={() => onSubmitLink(link.trim())}
          fullWidth
        />
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: DocumentDto['status'] | null }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();

  if (!status) {
    return (
      <View style={[s.badge, { backgroundColor: theme.colors.surfaceSunken }]}>
        <Text variant="caption" style={[s.badgeText, { color: theme.colors.textMuted }]}>
          Missing
        </Text>
      </View>
    );
  }

  const isApproved = status === 'Approved';
  const isPending = status === 'Pending';

  const bg = isApproved
    ? `${theme.colors.success}15`
    : isPending
    ? theme.colors.warningBg || '#FFFBEB'
    : `${theme.colors.error}15`;

  const color = isApproved
    ? theme.colors.success
    : isPending
    ? theme.colors.warning || '#D97706'
    : theme.colors.error;

  const label = isApproved ? 'Approved' : isPending ? 'Pending Review' : 'Rejected';

  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text variant="caption" style={[s.badgeText, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
  },
  bannerCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
    borderWidth: 1.5,
    marginBottom: t.spacing.md,
    elevation: 2,
    gap: t.spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  bannerDesc: {
    color: t.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  listContainer: {
    gap: t.spacing.md,
    paddingBottom: t.spacing.xl * 1.5,
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
    overflow: 'hidden' as const,
  },
  pdfAvatarBadge: {
    backgroundColor: `${t.colors.primary}12`,
    borderWidth: 1,
    borderColor: `${t.colors.primary}30`,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  subText: {
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
  deptText: {
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
  remarksCard: {
    backgroundColor: t.colors.errorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.error,
    padding: t.spacing.md,
    marginTop: t.spacing.sm,
  },
  remarksHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  remarksTitle: {
    color: t.colors.error,
    fontWeight: '700' as const,
    fontSize: 11,
  },
  remarksText: {
    color: t.colors.error,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  actionRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: t.spacing.sm,
  },
  actionBtn: {
    minWidth: 100,
  },
  formGroup: {
    marginTop: t.spacing.md,
    gap: t.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: t.spacing.lg,
  },
  modalContainer: {
    width: '100%' as const,
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    padding: t.spacing.lg,
    alignItems: 'center' as const,
  },
  modalHeader: {
    width: '100%' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: t.colors.textPrimary,
  },
  previewImage: {
    alignSelf: 'center' as const,
    width: '100%' as const,
    height: 220,
    borderRadius: 12,
    marginTop: t.spacing.sm,
    backgroundColor: t.colors.surface,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: t.spacing.sm,
  },
});