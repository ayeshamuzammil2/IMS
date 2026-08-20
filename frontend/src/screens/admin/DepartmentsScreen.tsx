import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { Power, PowerOff } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { FormModal } from '../../components/forms/FormModal';
import { DataTable, type DataTableColumn } from '../../components/data/DataTable';
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
  geofenceRadiusMeters: z.coerce.number({ message: 'Radius must be a number.' }).int().min(10).max(5000),
});

// z.coerce.number() accepts unknown as input and outputs number - useForm needs both shapes since
// the on-screen fields hold raw text while the submitted values are the coerced numbers.
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormInput = { name: '', code: '', description: '', latitude: 24.8967, longitude: 67.1608, geofenceRadiusMeters: 150 };

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
    onError: (error: any) => Toast.show({ type: 'error', text1: 'Could not update department', text2: error?.message }),
  });

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

  const columns: DataTableColumn<DepartmentDto>[] = [
    { key: 'name', label: 'Name', width: 170, render: (d) => <Text variant="bodyStrong">{d.name}</Text> },
    { key: 'code', label: 'Code', width: 80, render: (d) => <Text variant="body">{d.code}</Text> },
    { key: 'radius', label: 'Geofence', width: 90, render: (d) => <Text variant="body">{d.geofenceRadiusMeters} m</Text> },
    { key: 'mentors', label: 'Mentors', width: 80, render: (d) => <Text variant="body">{d.mentorCount}</Text> },
    { key: 'interns', label: 'Interns', width: 80, render: (d) => <Text variant="body">{d.internCount}</Text> },
    {
      key: 'status',
      label: 'Status',
      width: 90,
      render: (d) => (
        <Text variant="caption" tone={d.isActive ? 'success' : 'error'}>
          {d.isActive ? 'Active' : 'Inactive'}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 60,
      render: (d) => {
        const busy = toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === d.id;
        return (
          <Pressable
            hitSlop={8}
            style={s.iconOnlyButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleActiveMutation.mutate(d);
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : d.isActive ? (
              <PowerOff size={18} color={theme.colors.error} />
            ) : (
              <Power size={18} color={theme.colors.success} />
            )}
          </Pressable>
        );
      },
    },
  ];

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
        <DataTable
          columns={columns}
          rows={departments}
          keyExtractor={(d) => String(d.id)}
          onRowPress={openEdit}
          emptyLabel="No departments yet. Add one to get started."
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
  locationRow: { flexDirection: 'row' as const, gap: t.spacing.md },
  locationFields: { flex: 1 },
  locationButton: { marginBottom: t.spacing.md, marginTop: -t.spacing.sm },
  iconOnlyButton: { paddingHorizontal: t.spacing.sm },
});
