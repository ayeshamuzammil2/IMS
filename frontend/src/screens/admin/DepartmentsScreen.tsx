import React, { useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { Power, PowerOff, Trash2, ChevronRight, Search, X, Building2 } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { FormModal } from '../../components/forms/FormModal';
import { departmentsApi, type DepartmentDto } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

const schema = z.object({
  name: z.string().min(1, 'Name is required.').max(150),
  code: z.string().min(1, 'Code is required.').max(20),
  description: z.string().max(500).nullable(),
  latitude: z.coerce.number({ message: 'Latitude must be a number.' }).min(-90).max(90),
  longitude: z.coerce.number({ message: 'Longitude must be a number.' }).min(-180).max(180),
  geofenceRadiusMeters: z.coerce
    .number({ message: 'Radius must be a number.' })
    .int()
    .min(10, 'Radius must be at least 10 meters.')
    .max(100, 'Radius cannot exceed 100 meters.'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormInput = { name: '', code: '', description: '', latitude: 24.8967, longitude: 67.1608, geofenceRadiusMeters: 100 };

export function DepartmentsScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentDto | null>(null);
  const [locating, setLocating] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Jab bhi user is screen se baahar jayega, search aur modals reset ho jayenge
        setShowSearch(false);
        setSearch('');
        setModalOpen(false);
        setEditing(null);
      };
    }, [])
  );

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
  });

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter(
      (d) => d.name.toLowerCase().includes(term) || d.code.toLowerCase().includes(term)
    );
  }, [departments, search]);

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

  const { control, handleSubmit, formState, reset, setValue } = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['departments'] });

  const createMutation = useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Department created' });
      invalidate();
      closeModal();
    },
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not create department', text2: error?.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: FormOutput }) => departmentsApi.update(id, body),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Department updated' });
      invalidate();
      closeModal();
    },
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not update department', text2: error?.message }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (dept: DepartmentDto) => (dept.isActive ? departmentsApi.deactivate(dept.id) : departmentsApi.reactivate(dept.id)),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Department updated' });
      invalidate();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not update department', text2: error?.response?.data?.message ?? error?.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentsApi.delete(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Department deleted' });
      invalidate();
    },
    onError: (error: any) =>
      Toast.show({ type: 'error', text1: 'Could not delete department', text2: error?.response?.data?.message ?? error?.message }),
  });

  const confirmToggleActive = (dept: DepartmentDto) => {
    if (!dept.isActive) {
      toggleActiveMutation.mutate(dept);
      return;
    }
    Alert.alert('Deactivate department', `Deactivate "${dept.name}"? Mentors and interns already assigned will keep their access until reassigned.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => toggleActiveMutation.mutate(dept) },
    ]);
  };

  const confirmDelete = (dept: DepartmentDto) => {
    Alert.alert('Delete department', `Permanently delete "${dept.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(dept.id) },
    ]);
  };

  const openCreate = () => {
    setEditing(null);
    reset(emptyValues);
    setModalOpen(true);
  };

  const openEdit = (dept: DepartmentDto) => {
    setEditing(dept);
    reset({
      name: dept.name,
      code: dept.code,
      description: dept.description ?? '',
      latitude: dept.latitude,
      longitude: dept.longitude,
      geofenceRadiusMeters: dept.geofenceRadiusMeters,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const onSubmit = (values: FormOutput) => {
    const body = { ...values, description: values.description?.trim() ? values.description : null };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' });
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setValue('latitude', Number(position.coords.latitude.toFixed(6)));
      setValue('longitude', Number(position.coords.longitude.toFixed(6)));
    } catch {
      Toast.show({ type: 'error', text1: 'Could not get current location' });
    } finally {
      setLocating(false);
    }
  };

  const renderCard = ({ item: d }: { item: DepartmentDto }) => {
    const busyToggle = toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === d.id;
    const busyDelete = deleteMutation.isPending && deleteMutation.variables === d.id;

    return (
      <Pressable style={s.card} onPress={() => openEdit(d)}>
        <View style={s.cardHeader}>
          <View style={s.avatarBadge}>
            <Building2 size={20} color={theme.colors.primary} />
          </View>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
              {d.name}
            </Text>
            <Text variant="caption" tone="muted" style={s.subText} numberOfLines={1}>
              {d.code} · Geofence: {d.geofenceRadiusMeters}m
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </View>

        <View style={s.statusRow}>
          <View style={s.metaLeftGroup}>
            <Text variant="caption" tone="muted" style={s.countText} numberOfLines={1}>
              {d.mentorCount} Mentors · {d.internCount} Interns
            </Text>
          </View>

          <View style={[s.badge, { backgroundColor: d.isActive ? (theme.colors.successBg || '#F0FDF4') : (theme.colors.errorBg || '#FEF2F2') }]}>
            <Text variant="caption" tone={d.isActive ? 'success' : 'error'} style={s.badgeText}>
              {d.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.actionsRow}>
          <Pressable
            hitSlop={8}
            style={s.actionIconBtn}
            onPress={(e) => {
              e.stopPropagation();
              confirmToggleActive(d);
            }}
          >
            {busyToggle ? (
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : d.isActive ? (
              <PowerOff size={18} color={theme.colors.error} />
            ) : (
              <Power size={18} color={theme.colors.success} />
            )}
          </Pressable>
          <Pressable
            hitSlop={8}
            style={s.actionIconBtn}
            onPress={(e) => {
              e.stopPropagation();
              confirmDelete(d);
            }}
          >
            {busyDelete ? <ActivityIndicator size="small" color={theme.colors.error} /> : <Trash2 size={18} color={theme.colors.error} />}
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen scroll={false}>
      {/* Top Header Row */}
      <View style={s.headerRow}>
        <View style={s.headerTitleContainer}>
          <View style={s.titleIndicator} />
          <Text variant="overline" tone="muted" style={s.headerLabel}>
            {filteredDepartments.length} {filteredDepartments.length === 1 ? 'DEPARTMENT' : 'DEPARTMENTS'} FOUND
          </Text>
        </View>
        <Button label="Add Department" size="sm" onPress={openCreate} />
      </View>

      {/* Search Icon Trigger & Expandable Input under Add Department */}
      <View style={s.searchBarSection}>
        <View style={s.searchIconRow}>
          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? (
              <X size={18} color={theme.colors.primary} />
            ) : (
              <Search size={18} color={theme.colors.textMuted} />
            )}
          </Pressable>
        </View>

        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by department name or code..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading departments...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDepartments}
          keyExtractor={(d) => String(d.id)}
          renderItem={renderCard}
          style={s.list}
          contentContainerStyle={filteredDepartments.length === 0 ? s.emptyListContent : s.listContent}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text variant="body" tone="muted">
                {departments.length === 0 ? 'No departments yet. Add one to get started.' : 'No departments match your search.'}
              </Text>
            </View>
          }
        />
      )}

      <FormModal
        visible={modalOpen}
        title={editing ? 'Edit Department' : 'Add Department'}
        onClose={closeModal}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={closeModal} />
            <Button
              label={editing ? 'Save' : 'Create'}
              onPress={handleSubmit(onSubmit)}
              loading={createMutation.isPending || updateMutation.isPending}
            />
          </>
        }
      >
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label="Name" required value={field.value} onChangeText={field.onChange} error={formState.errors.name?.message} />
          )}
        />
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <Input
              label="Code"
              required
              autoCapitalize="characters"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.code?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => <Input label="Description" value={field.value ?? ''} onChangeText={field.onChange} multiline />}
        />

        <View style={s.locationRow}>
          <View style={s.locationFields}>
            <Controller
              control={control}
              name="latitude"
              render={({ field }) => (
                <Input
                  label="Latitude"
                  required
                  keyboardType="numbers-and-punctuation"
                  value={String(field.value)}
                  onChangeText={field.onChange}
                  error={formState.errors.latitude?.message}
                />
              )}
            />
          </View>
          <View style={s.locationFields}>
            <Controller
              control={control}
              name="longitude"
              render={({ field }) => (
                <Input
                  label="Longitude"
                  required
                  keyboardType="numbers-and-punctuation"
                  value={String(field.value)}
                  onChangeText={field.onChange}
                  error={formState.errors.longitude?.message}
                />
              )}
            />
          </View>
        </View>
        <Button
          label={locating ? 'Getting location...' : 'Use my current location'}
          variant="outline"
          size="sm"
          onPress={useMyLocation}
          loading={locating}
          style={s.locationButton}
        />

        <Controller
          control={control}
          name="geofenceRadiusMeters"
          render={({ field }) => (
            <Input
              label="Geofence Radius (meters)"
              required
              keyboardType="number-pad"
              value={String(field.value)}
              onChangeText={field.onChange}
              error={formState.errors.geofenceRadiusMeters?.message}
            />
          )}
        />
      </FormModal>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.xs,
    marginTop: 0,
    paddingTop: 0,
  },
  headerTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  titleIndicator: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: t.colors.primary,
  },
  headerLabel: {
    letterSpacing: 0.8,
  },
  searchBarSection: {
    marginBottom: t.spacing.sm,
  },
  searchIconRow: {
    alignItems: 'flex-end' as const,
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
    backgroundColor: t.colors.surfaceSunken,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
  },
  list: { flex: 1 },
  listContent: {
    gap: t.spacing.sm,
    paddingBottom: t.spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    flexShrink: 1,
  },
  subText: {
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 10,
  },
  metaLeftGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
  },
  countText: {
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
    justifyContent: 'flex-end' as const,
  },
  actionIconBtn: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
  },
  locationFields: {
    flex: 1,
  },
  locationButton: {
    marginBottom: t.spacing.md,
    marginTop: -t.spacing.sm,
  },
  emptyBox: {
    paddingVertical: t.spacing.xl,
    alignItems: 'center' as const,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});