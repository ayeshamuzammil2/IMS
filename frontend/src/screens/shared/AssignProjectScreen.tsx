import React, { useMemo, useState, useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Paperclip, Search, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { DateField } from '../../components/forms/DateField';
import { internsApi } from '../../api/resources/interns.api';
import { projectsApi } from '../../api/resources/projects.api';
import { departmentsApi } from '../../api/resources/departments.api';
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

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);

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

  // 1. Filter interns based on department and search term
  const filteredInterns = useMemo(() => {
    const term = search.trim().toLowerCase();
    return interns.filter((i) => {
      if (isAdmin && departmentFilter && i.departmentId !== departmentFilter) return false;
      if (!term) return true;
      return (
        i.fullName.toLowerCase().includes(term) ||
        i.internCode.toLowerCase().includes(term)
      );
    });
  }, [interns, isAdmin, departmentFilter, search]);

  const internOptions = useMemo(
    () => filteredInterns.map((i) => ({ value: String(i.id), label: `${i.fullName} (${i.internCode})` })),
    [filteredInterns],
  );

  // 2. Auto-select first matching intern if current selection becomes invalid after search
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
      {/* Solid White Card Wrapper for Filters */}
      <View style={s.filterWrapper}>
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

        <SelectField
          label="Intern"
          required
          placeholder="Select an intern"
          value={internProfileId ? String(internProfileId) : ''}
          options={internOptions}
          onChange={(val) => setInternProfileId(val ? Number(val) : null)}
        />

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

      {/* Search Icon OUTSIDE of White Card */}
      <View style={s.searchIconRow}>
        <Pressable onPress={toggleSearch} style={s.iconButton} hitSlop={8}>
          {showSearch ? (
            <X size={20} color={theme.colors.textSecondary} />
          ) : (
            <Search size={20} color={theme.colors.textSecondary} />
          )}
        </Pressable>
      </View>

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
  filterWrapper: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    marginBottom: t.spacing.xs,
    ...t.shadows.sm,
  },
  filterSpacing: {
    marginBottom: t.spacing.sm,
  },
  searchIconRow: {
    alignItems: 'flex-end' as const,
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.sm,
  },
  iconButton: {
    padding: 10,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  searchContainer: {
    marginTop: t.spacing.sm,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    marginBottom: t.spacing.lg,
    ...t.shadows.sm,
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