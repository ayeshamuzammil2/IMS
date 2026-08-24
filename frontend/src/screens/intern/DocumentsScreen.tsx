import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { CheckCircle2, Clock, XCircle, FileWarning } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { VerificationBanner } from '../../components/data/VerificationBanner';
import { documentsApi, type DocumentDto, type DocumentTypeKey } from '../../api/resources/documents.api';
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

export function DocumentsScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<DocumentTypeKey | null>(null);

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
      Toast.show({ type: 'success', text1: 'Extra document uploaded', text2: 'Awaiting review by your mentor.' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: error?.message });
    } finally {
      setUploadingType(null);
    }
  };

  return (
    <Screen scroll>
      {data ? <VerificationBanner status={data.verificationStatus} /> : null}

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <>
          {REQUIRED_TYPES.map((typeConfig) => {
            const doc = documentsByType.get(typeConfig.key);
            return (
              <View key={typeConfig.key} style={s.card}>
                <View style={s.cardHeader}>
                  <Text variant="bodyStrong">{typeConfig.label}</Text>
                  <StatusBadge status={doc?.status ?? null} />
                </View>
                <Text variant="caption" tone="muted" style={s.helper}>
                  {typeConfig.helper}
                </Text>
                {doc?.status === 'Rejected' && doc.remarks ? (
                  <View style={s.remarksRow}>
                    <FileWarning size={16} color={theme.colors.error} />
                    <Text variant="caption" tone="error" style={s.remarksText}>
                      {doc.remarks}
                    </Text>
                  </View>
                ) : null}
                <Button
                  label={doc ? 'Re-upload' : 'Upload'}
                  variant={doc?.status === 'Rejected' ? 'danger' : doc ? 'outline' : 'primary'}
                  size="sm"
                  loading={uploadingType === typeConfig.key}
                  onPress={() => handleUpload(typeConfig)}
                  style={s.uploadButton}
                />
              </View>
            );
          })}

          <ExtraDocumentCard
            doc={extraDocument}
            uploading={uploadingType === 'ExtraDocument'}
            onUploadFile={handleUploadExtraFile}
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
        </>
      )}
    </Screen>
  );
}

function ExtraDocumentCard({
  doc,
  uploading,
  onUploadFile,
  onSubmitLink,
}: {
  doc: DocumentDto | undefined;
  uploading: boolean;
  onUploadFile: () => void;
  onSubmitLink: (url: string) => void;
}) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [link, setLink] = useState(doc?.externalLinkUrl ?? '');

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text variant="bodyStrong">Extra Document (Optional)</Text>
        <StatusBadge status={doc?.status ?? null} />
      </View>
      <Text variant="caption" tone="muted" style={s.helper}>
        Anything else worth sharing - a portfolio, a certificate, a writing sample. Upload a file or paste a link.
      </Text>
      {doc?.status === 'Rejected' && doc.remarks ? (
        <View style={s.remarksRow}>
          <FileWarning size={16} color={theme.colors.error} />
          <Text variant="caption" tone="error" style={s.remarksText}>
            {doc.remarks}
          </Text>
        </View>
      ) : null}
      {doc?.externalLinkUrl ? (
        <Text variant="caption" tone="secondary" style={s.helper} numberOfLines={1}>
          {doc.externalLinkUrl}
        </Text>
      ) : null}
      <Button
        label={doc ? 'Re-upload File' : 'Upload File'}
        variant={doc?.status === 'Rejected' ? 'danger' : doc ? 'outline' : 'primary'}
        size="sm"
        loading={uploading}
        onPress={onUploadFile}
        style={s.uploadButton}
      />
      <Input label="Or paste a link" value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://..." />
      <Button
        label="Submit Link"
        variant="outline"
        size="sm"
        loading={uploading}
        disabled={!link.trim()}
        onPress={() => onSubmitLink(link.trim())}
        style={s.uploadButton}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: DocumentDto['status'] | null }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  if (!status) {
    return (
      <View style={[s.badge, { backgroundColor: theme.colors.surfaceSunken }]}>
        <Text variant="caption" tone="muted">
          Missing
        </Text>
      </View>
    );
  }
  const config: Record<DocumentDto['status'], { bg: string; tone: 'success' | 'warning' | 'error'; icon: React.ReactNode; label: string }> = {
    Approved: { bg: theme.colors.successBg, tone: 'success', icon: <CheckCircle2 size={14} color={theme.colors.success} />, label: 'Approved' },
    Pending: { bg: theme.colors.warningBg, tone: 'warning', icon: <Clock size={14} color={theme.colors.warning} />, label: 'Pending Review' },
    Rejected: { bg: theme.colors.errorBg, tone: 'error', icon: <XCircle size={14} color={theme.colors.error} />, label: 'Rejected' },
  };
  const c = config[status];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      {c.icon}
      <Text variant="caption" tone={c.tone}>
        {c.label}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    gap: t.spacing.xs,
  },
  cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  helper: { marginBottom: t.spacing.xs },
  remarksRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.xs },
  remarksText: { flex: 1 },
  uploadButton: { alignSelf: 'flex-start' as const, marginTop: t.spacing.xs },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    borderRadius: t.radii.full,
  },
});
