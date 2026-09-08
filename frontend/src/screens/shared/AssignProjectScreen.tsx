import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { appAlert } from '../../lib/appAlert';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Paperclip, Search, X, Trash2, Eye, Edit2 } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { DateField } from '../../components/forms/DateField';
import { internsApi } from '../../api/resources/interns.api';
import { projectsApi, type ProjectAssignmentDto } from '../../api/resources/projects.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

export function AssignProjectScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();

  const [internProfileId, setInternProfileId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowSearch(false);
        setSearch('');
        setDepartmentFilter(null);
        setInternProfileId(null);
        setTitle('');
        setDescription('');
        setDueDate(null);
        setPickedFile(null);
        setEditingId(null);
        setTouched(false);
      };
    }, [])
  );

  const { data: interns = [] } = useQuery({ queryKey: ['interns'], queryFn: () => internsApi.list() });

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });

  const departmentSelectOptions = useMemo(() => {
    const list = departmentOptions.map((d) => ({ value: String(d.id), label: d.name }));
    return [{ value: 'all', label: 'All Departments' }, ...list];
  }, [departmentOptions]);

  const filteredInterns = useMemo(() => {
    const term = search.trim().toLowerCase();
    return interns.filter((i) => {
      if (isAdmin && departmentFilter && i.departmentId !== departmentFilter) return false;
      if (!term) return true;
      return i.fullName.toLowerCase().includes(term) || i.internCode.toLowerCase().includes(term);
    });
  }, [interns, isAdmin, departmentFilter, search]);

  const internOptions = useMemo(
    () => filteredInterns.map((i) => ({ value: String(i.id), label: `${i.fullName} (${i.internCode})` })),
    [filteredInterns],
  );

  useEffect(() => {
    if (search.trim() && filteredInterns.length > 0) {
      const matchExists = filteredInterns.some((i) => i.id === internProfileId);
      if (!matchExists) {
        setInternProfileId(filteredInterns[0].id);
      }
    }
  }, [search, filteredInterns, internProfileId]);

  const handleDepartmentChange = (value: string) => {
    const deptId = value === 'all' ? null : Number(value);
    setDepartmentFilter(deptId);
    setInternProfileId(null);
  };

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

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
    setEditingId(null);
    setTouched(false);
  };

  const handleAssign = async () => {
    setTouched(true);
    if (!internProfileId || !title.trim() || !description.trim() || !dueDate || (!pickedFile && !editingId)) {
      Toast.show({ type: 'error', text1: 'Please fill in Title, Description, Due Date, and attach a file' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        if (projectsApi.update) {
          await projectsApi.update(editingId, {
            title: title.trim(),
            description: description.trim(),
            dueDate,
            file: pickedFile,
          });
        } else {
          await projectsApi.assign(internProfileId, {
            title: title.trim(),
            description: description.trim(),
            dueDate,
            file: pickedFile,
          });
        }
        Toast.show({ type: 'success', text1: 'Project updated successfully' });
      } else {
        await projectsApi.assign(internProfileId, {
          title: title.trim(),
          description: description.trim(),
          dueDate,
          file: pickedFile,
        });
        Toast.show({ type: 'success', text1: 'Project assigned successfully' });
      }
      resetForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projects', 'intern', internProfileId] });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not save project', text2: error?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a: ProjectAssignmentDto) => {
    setEditingId(a.id);
    setTitle(a.title);
    setDescription(a.description || '');
    setDueDate(a.dueDate);
    setPickedFile(null);
    setTouched(false);
  };

  const handlePreview = async (a: ProjectAssignmentDto) => {
    if (!a.fileId) {
      Toast.show({ type: 'error', text1: 'No attachment available' });
      return;
    }
    setDownloadingId(a.id);
    try {
      await downloadAndShare(`${apiBaseUrl}/api/files/${a.fileId}`, `project-${a.id}.pdf`);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open preview', text2: error?.message });
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) => projectsApi.delete(assignmentId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Project deleted' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projects', 'intern', internProfileId] });
    },
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not delete project', text2: error?.message }),
  });

  const confirmDelete = (assignment: ProjectAssignmentDto) => {
    appAlert.alert('Delete project', `Delete "${assignment.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(assignment.id) },
    ]);
  };

  return (
    <Screen scroll style={s.screenContainer}>
      <View style={s.headerContainer}>
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {internOptions.length} {internOptions.length === 1 ? 'INTERN' : 'INTERNS'} FOUND
            </Text>
          </View>

          <Pressable onPress={toggleSearch} style={[s.iconButtonHeader, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? <X size={18} color={theme.colors.primary} /> : <Search size={18} color={theme.colors.textMuted} />}
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

        {isAdmin && (
          <View style={s.filterSpacing}>
            <SelectField
              label="Department"
              placeholder="Select Department"
              value={departmentFilter ? String(departmentFilter) : 'all'}
              options={departmentSelectOptions}
              onChange={handleDepartmentChange}
            />
          </View>
        )}

        <View style={s.filterSpacing}>
          <SelectField
            label="Intern"
            required
            placeholder="Select an intern"
            value={internProfileId ? String(internProfileId) : ''}
            options={internOptions}
            onChange={(val) => setInternProfileId(val ? Number(val) : null)}
          />
        </View>
      </View>

      {internProfileId ? (
        <>
          <View style={s.card}>
            <Input
              label="Title"
              required
              value={title}
              onChangeText={setTitle}
              error={touched && !title.trim() ? 'Title is required.' : undefined}
            />
            <Input
              label="Description"
              required
              value={description}
              onChangeText={setDescription}
              multiline
              error={touched && !description.trim() ? 'Description is required.' : undefined}
            />
            <DateField
              label="Due Date"
              required
              value={dueDate}
              onChange={setDueDate}
              error={touched && !dueDate ? 'Due date is required.' : undefined}
            />
            <Button
              label={pickedFile ? pickedFile.name : editingId ? 'Replace File (Optional)' : 'Attach File (PDF/JPG/PNG) *'}
              variant="outline"
              size="sm"
              onPress={handlePickFile}
              style={s.attachButton}
            />
            {touched && !pickedFile && !editingId ? (
              <Text variant="caption" tone="error">
                A file attachment is required.
              </Text>
            ) : null}
            <Button label={editingId ? 'Update Project' : 'Assign Project'} onPress={handleAssign} loading={submitting} fullWidth />
            {editingId ? (
              <Button label="Cancel Edit" variant="ghost" size="sm" onPress={resetForm} fullWidth />
            ) : null}
          </View>

          <Text variant="overline" tone="muted" style={s.sectionLabel}>
            PREVIOUSLY ASSIGNED ({assignments.length})
          </Text>
          {assignments.length === 0 ? (
            <View style={s.emptyBox}>
              <Text variant="body" tone="muted">
                No projects assigned to this intern yet.
              </Text>
            </View>
          ) : (
            assignments.map((a) => {
              const busyDelete = deleteMutation.isPending && deleteMutation.variables === a.id;
              const isDownloading = downloadingId === a.id;
              return (
                <View key={a.id} style={s.card}>
                  <View style={s.assignmentHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" style={s.assignmentTitle}>
                        {a.title}
                      </Text>
                      <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        Status: {a.status} {a.dueDate ? `· Due: ${a.dueDate}` : ''}
                      </Text>
                    </View>
                  </View>

                  {a.fileId ? (
                    <View style={s.fileIndicator}>
                      <Paperclip size={14} color={theme.colors.textMuted} />
                      <Text variant="caption" tone="muted">
                        Has attachment
                      </Text>
                    </View>
                  ) : null}

                  <View style={s.divider} />

                  <View style={s.actionsRowContainer}>
                    <Text variant="caption" tone="muted" style={{ paddingLeft: 4 }}>
                      Actions
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', alignItems: 'center', paddingTop: 4, marginLeft: 'auto' }}>
                      <Pressable
                        hitSlop={8}
                        style={s.actionIcon}
                        onPress={() => handlePreview(a)}
                        disabled={isDownloading || !a.fileId}
                      >
                        {isDownloading ? (
                          <ActivityIndicator size="small" color={theme.colors.textMuted} />
                        ) : (
                          <Eye size={16} color={theme.colors.textMuted} />
                        )}
                      </Pressable>

                      <Pressable hitSlop={8} style={s.actionIcon} onPress={() => handleEdit(a)}>
                        <Edit2 size={16} color={theme.colors.primary} />
                      </Pressable>

                      <Pressable
                        hitSlop={8}
                        style={[s.actionIcon, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => confirmDelete(a)}
                        disabled={busyDelete}
                      >
                        {busyDelete ? (
                          <ActivityIndicator size="small" color={theme.colors.error} />
                        ) : (
                          <Trash2 size={16} color={theme.colors.error} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </>
      ) : null}
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
  filterSpacing: {
    marginTop: t.spacing.xs,
  },
  iconButtonHeader: {
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
    gap: t.spacing.md,
    marginBottom: t.spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  attachButton: { alignSelf: 'flex-start' as const },
  sectionLabel: { marginTop: t.spacing.sm, marginBottom: t.spacing.xs, marginLeft: t.spacing.xs },
  assignmentHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  assignmentTitle: { fontSize: 16 },
  fileIndicator: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: -4 },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xs,
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
    paddingVertical: t.spacing.lg,
    alignItems: 'center' as const,
  },
});