import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { ChevronRight } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { internsApi } from '../../api/resources/interns.api';
import { certificatesApi } from '../../api/resources/certificates.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

const CERT_STATUS_TONE: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  Locked: 'muted',
  PendingApproval: 'warning',
  Approved: 'warning',
  Issued: 'success',
  Rejected: 'error',
};

const CERT_STATUS_BG: Record<string, 'surfaceSunken' | 'warningBg' | 'successBg' | 'errorBg'> = {
  Locked: 'surfaceSunken',
  PendingApproval: 'warningBg',
  Approved: 'warningBg',
  Issued: 'successBg',
  Rejected: 'errorBg',
};

export function CertificateManagementScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();

  const [internProfileId, setInternProfileId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: interns = [] } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });
  const internOptions = useMemo(() => interns.map((i) => ({ value: i.id, label: `${i.fullName} (${i.internCode})` })), [interns]);

  const { data: templates = [] } = useQuery({ queryKey: ['certificates', 'templates'], queryFn: certificatesApi.templates.list });
  const templateOptions = useMemo(() => templates.map((t) => ({ value: t.id, label: t.name })), [templates]);

  const certQuery = useQuery({
    queryKey: ['certificates', 'intern', internProfileId],
    queryFn: () => certificatesApi.getForIntern(internProfileId!),
    enabled: internProfileId !== null,
  });

  const invalidateCert = () => queryClient.invalidateQueries({ queryKey: ['certificates', 'intern', internProfileId] });

  const handlePickTemplateFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null });
  };

  const handleUploadTemplate = async () => {
    if (!templateName.trim() || !pickedFile) return;
    setBusy(true);
    try {
      await certificatesApi.templates.upload(templateName.trim(), null, pickedFile);
      Toast.show({ type: 'success', text1: 'Template uploaded' });
      setTemplateName('');
      setPickedFile(null);
      queryClient.invalidateQueries({ queryKey: ['certificates', 'templates'] });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not upload template', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!internProfileId || !templateId) return;
    setBusy(true);
    try {
      await certificatesApi.generate(internProfileId, templateId);
      Toast.show({ type: 'success', text1: 'Certificate generated' });
      invalidateCert();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not generate certificate', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!internProfileId) return;
    setBusy(true);
    try {
      await certificatesApi.approve(internProfileId);
      Toast.show({ type: 'success', text1: 'Certificate approved' });
      invalidateCert();
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
      await certificatesApi.issue(internProfileId);
      Toast.show({ type: 'success', text1: 'Certificate issued' });
      invalidateCert();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not issue', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!certQuery.data?.generatedFileId) return;
    setDownloading(true);
    try {
      await downloadAndShare(`${apiBaseUrl}/api/files/${certQuery.data.generatedFileId}`, `certificate-${certQuery.data.internCode ?? 'intern'}.pdf`);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open certificate', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="caption" tone="muted" style={s.sectionTitle}>
        UPLOAD TEMPLATE
      </Text>
      <View style={s.card}>
        <Input label="Template Name" value={templateName} onChangeText={setTemplateName} />
        <Button
          label={pickedFile ? pickedFile.name : 'Choose .docx File'}
          variant="outline"
          size="sm"
          onPress={handlePickTemplateFile}
          style={{ alignSelf: 'flex-start' }}
        />
        <Button label="Upload Template" onPress={handleUploadTemplate} loading={busy} disabled={!templateName.trim() || !pickedFile} fullWidth />
      </View>

      <Text variant="caption" tone="muted" style={[s.sectionTitle, { marginTop: theme.spacing.lg }]}>
        GENERATE FOR INTERN
      </Text>
      <View style={s.card}>
        <SelectField label="Intern" required placeholder="Select an intern" value={internProfileId} options={internOptions} onChange={setInternProfileId} />
        <SelectField label="Template" required placeholder="Select a template" value={templateId} options={templateOptions} onChange={setTemplateId} />
        <Button label="Generate Certificate" onPress={handleGenerate} loading={busy} disabled={!internProfileId || !templateId} fullWidth />

        {certQuery.data ? (
          <>
            <View style={s.divider} />
            <View style={s.cardMain}>
              <View>
                <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                  Certificate Details
                </Text>
                {certQuery.data.certificateNumber ? (
                  <Text variant="caption" tone="muted">
                    {certQuery.data.certificateNumber}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </View>

            <View style={{ flexDirection: 'row', marginTop: theme.spacing.xs }}>
              <View style={[s.badge, { backgroundColor: theme.colors[CERT_STATUS_BG[certQuery.data.status] ?? 'surfaceSunken'] }]}>
                <Text variant="caption" tone={CERT_STATUS_TONE[certQuery.data.status] ?? 'muted'}>
                  {certQuery.data.status}
                </Text>
              </View>
            </View>

            {isAdmin && certQuery.data.status === 'PendingApproval' ? (
              <Button label="Approve Certificate" onPress={handleApprove} loading={busy} fullWidth style={{ marginTop: theme.spacing.md }} />
            ) : null}
            {isAdmin && certQuery.data.status === 'Approved' ? (
              <Button label="Issue Certificate" onPress={handleIssue} loading={busy} fullWidth style={{ marginTop: theme.spacing.md }} />
            ) : null}
            {certQuery.data.status === 'Issued' && certQuery.data.generatedFileId ? (
              <Button label="Download Certificate" variant="outline" onPress={handleDownload} loading={downloading} fullWidth style={{ marginTop: theme.spacing.md }} />
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  sectionTitle: {
    marginBottom: t.spacing.sm,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    ...t.shadows.sm,
  },
  cardMain: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.xs,
  },
  badge: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 3,
    borderRadius: t.radii.full,
  },
});