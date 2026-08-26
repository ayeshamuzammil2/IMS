import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { Power, PowerOff, Trash2, ChevronRight } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { FormModal } from '../../components/forms/FormModal';
import { departmentsApi, type DepartmentDto } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

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

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
  });

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
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {d.name}
            </Text>
            <Text variant="caption" tone="muted">
              {d.code}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </View>

        <Text variant="caption" tone="secondary" numberOfLines={1} style={s.cardSubline}>
          Geofence: {d.geofenceRadiusMeters}m · {d.mentorCount} Mentors · {d.internCount} Interns
        </Text>

        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: d.isActive ? theme.colors.successBg : theme.colors.errorBg }]}>
            <Text variant="caption" tone={d.isActive ? 'success' : 'error'}>
              {d.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.actionsRow}>
          <Pressable
            hitSlop={8}
            style={s.actionIcon}
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
            style={s.actionIcon}
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
      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {departments.length} department{departments.length === 1 ? '' : 's'}
        </Text>
        <Button label="Add Department" size="sm" onPress={openCreate} />
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <FlatList
          data={departments}
          keyExtractor={(d) => String(d.id)}
          renderItem={renderCard}
          style={s.list}
          contentContainerStyle={departments.length === 0 ? s.emptyListContent : s.listContent}
          ListEmptyComponent={
            <Text variant="body" tone="muted">
              No departments yet. Add one to get started.
            </Text>
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
    marginBottom: t.spacing.md,
  },
  list: { flex: 1 },
  listContent: { gap: t.spacing.sm, paddingBottom: t.spacing.lg },
  emptyListContent: { flexGrow: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    ...t.shadows.sm,
  },
  cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: t.spacing.sm },
  cardHeaderText: { flex: 1 },
  cardSubline: { marginTop: 2 },
  badgeRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: t.spacing.xs, marginTop: t.spacing.sm },
  badge: { paddingHorizontal: t.spacing.sm, paddingVertical: 3, borderRadius: t.radii.full },
  divider: { height: 1, backgroundColor: t.colors.border, marginTop: t.spacing.md, marginBottom: t.spacing.sm },
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.lg, justifyContent: 'flex-end' as const },
  actionIcon: { padding: t.spacing.xs },
  locationRow: { flexDirection: 'row' as const, gap: t.spacing.md },
  locationFields: { flex: 1 },
  locationButton: { marginBottom: t.spacing.md, marginTop: -t.spacing.sm },
});