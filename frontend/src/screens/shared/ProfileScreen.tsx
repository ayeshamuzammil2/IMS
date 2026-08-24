import React from 'react';
import { Pressable, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { RoleAvatar } from '../../components/media/RoleAvatar';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';
import type { SharedStackParamList } from '../../navigation/types';

export function ProfileScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<SharedStackParamList>>();

  const modes: { key: 'light' | 'dark' | 'system'; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ];

  return (
    <Screen scroll>
      <View style={s.header}>
        <RoleAvatar name={user?.fullName ?? '?'} imageUrl={user?.profileImageUrl} size={72} />
        <Text variant="h2" style={s.name}>
          {user?.fullName}
        </Text>
        <View style={s.roleChip}>
          <Text variant="overline" tone="brand">
            {user?.role}
          </Text>
        </View>
      </View>

      <View style={s.card}>
        <Row label="Email" value={user?.email} />
        {user?.role === 'Intern' ? null : null}
      </View>

      <Text variant="overline" tone="muted" style={s.sectionLabel}>
        PREFERENCES
      </Text>
      <View style={s.card}>
        <Text variant="bodyStrong" style={s.rowLabel}>
          Theme
        </Text>
        <View style={s.segmentRow}>
          {modes.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => theme.setPreference(m.key)}
              style={[s.segment, theme.preference === m.key && s.segmentActive]}
            >
              <Text variant="caption" tone={theme.preference === m.key ? 'brand' : 'secondary'}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text variant="overline" tone="muted" style={s.sectionLabel}>
        SECURITY
      </Text>
      <View style={s.card}>
        <Pressable onPress={() => navigation.navigate('ChangePassword')}>
          <Text variant="bodyStrong" tone="brand">
            Change Password
          </Text>
        </Pressable>
        {user?.role === 'Intern' ? (
          <Pressable onPress={() => navigation.navigate('FaceEnrollment')}>
            <Text variant="bodyStrong" tone="brand">
              Face Enrollment
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  const s = useThemedStyles(makeStyles);
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  header: { alignItems: 'center' as const, marginBottom: t.spacing.lg, gap: t.spacing.xs },
  name: { marginTop: t.spacing.sm },
  roleChip: {
    backgroundColor: t.colors.primaryContainer,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 4,
    borderRadius: t.radii.full,
  },
  sectionLabel: { marginTop: t.spacing.lg, marginBottom: t.spacing.xs, marginLeft: t.spacing.xs },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
  },
  infoRow: { gap: 2 },
  rowLabel: { marginBottom: t.spacing.xs },
  segmentRow: { flexDirection: 'row' as const, gap: t.spacing.sm },
  segment: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  segmentActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryContainer },
});
