import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Paperclip } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { DateField } from '../../components/forms/DateField';
import { internsApi } from '../../api/resources/interns.api';
import { projectsApi } from '../../api/resources/projects.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

export function AssignProjectScreen() {
  const s = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();
  const [internProfileId, setInternProfileId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: interns = [] } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });
  const internOptions = useMemo(() => interns.map((i) => ({ value: i.id, label: `${i.fullName} (${i.internCode})` })), [interns]);

  const { data: assignments = [], refetch } = useQuery({
    queryKey: ['projects', 'intern', internProfileId],
    queryFn: () => projectsApi.getForIntern(internProfileId!),
    enabled: internProfileId !== null,
  });

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null });
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(null);
    setPickedFile(null);
  };

  const handleAssign = async () => {
    if (!internProfileId || !title.trim()) return;
    setSubmitting(true);
    try {
      await projectsApi.assign(internProfileId, {
        title: title.trim(),
        description: description.trim() || null,
        dueDate,
        file: pickedFile,
      });
      Toast.show({ type: 'success', text1: 'Project assigned' });
      resetForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projects', 'intern', internProfileId] });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not assign project', text2: error?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <SelectField
        label="Intern"
        required
        placeholder="Select an intern"
        value={internProfileId}
        options={internOptions}
        onChange={setInternProfileId}
      />

      {internProfileId ? (
        <>
          <View style={s.card}>
            <Input label="Title" required value={title} onChangeText={setTitle} />
            <Input label="Description" value={description} onChangeText={setDescription} multiline />
            <DateField label="Due Date" value={dueDate} onChange={setDueDate} />
            <Button
              label={pickedFile ? pickedFile.name : 'Attach File (PDF/JPG/PNG)'}
              variant="outline"
              size="sm"
              onPress={handlePickFile}
              style={s.attachButton}
            />
            <Button label="Assign Project" onPress={handleAssign} loading={submitting} disabled={!title.trim()} fullWidth />
          </View>

          <Text variant="overline" tone="muted" style={s.sectionLabel}>
            PREVIOUSLY ASSIGNED
          </Text>
          {assignments.length === 0 ? (
            <Text variant="body" tone="muted">
              No projects assigned to this intern yet.
            </Text>
          ) : (
            assignments.map((a) => (
              <View key={a.id} style={s.assignmentCard}>
                <View style={s.assignmentHeader}>
                  <Text variant="bodyStrong" style={s.assignmentTitle}>
                    {a.title}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {a.status}
                  </Text>
                </View>
                {a.fileId ? (
                  <View style={s.fileIndicator}>
                    <Paperclip size={14} />
                    <Text variant="caption" tone="muted">
                      Has attachment
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </>
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
    marginBottom: t.spacing.lg,
  },
  attachButton: { alignSelf: 'flex-start' as const },
  sectionLabel: { marginBottom: t.spacing.xs, marginLeft: t.spacing.xs },
  assignmentCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
    gap: t.spacing.xs,
  },
  assignmentHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  assignmentTitle: { flex: 1 },
  fileIndicator: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
});
