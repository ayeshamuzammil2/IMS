import React from 'react';
import { Pressable, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, KeyRound, ScanFace, Sun, Moon, Smartphone } from 'lucide-react-native';
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

  const modes: { key: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Smartphone },
  ];

  return (
    <Screen scroll style={s.container}>
      {/* User Header Section */}
      <View style={s.header}>
        <RoleAvatar name={user?.fullName ?? '?'} imageUrl={user?.profileImageUrl} size={76} />
        <Text variant="h2" style={s.name}>
          {user?.fullName ?? 'User'}
        </Text>
        {user?.role ? (
          <View style={s.roleChip}>
            <Text variant="caption" tone="brand" style={s.roleText}>
              {user.role}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Account Info Section */}
      <View style={s.card}>
        <Row label="EMAIL ADDRESS" value={user?.email} />
      </View>

      {/* Preferences Section */}
      <Text variant="overline" tone="muted" style={s.sectionLabel}>
        PREFERENCES
      </Text>
      <View style={s.card}>
        <Text variant="bodyStrong" style={s.rowLabel}>
          Theme
        </Text>
        <View style={s.segmentRow}>
          {modes.map((m) => {
            const Icon = m.icon;
            const isActive = theme.preference === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => theme.setPreference(m.key)}
                style={[s.segment, isActive && s.segmentActive]}
              >
                <Icon size={15} color={isActive ? theme.colors.primary : theme.colors.textMuted} />
                <Text
                  variant="caption"
                  tone={isActive ? 'brand' : 'secondary'}
                  style={[s.segmentText, isActive && s.segmentTextActive]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Security Section */}
      <Text variant="overline" tone="muted" style={s.sectionLabel}>
        SECURITY
      </Text>
      <View style={[s.card, { paddingVertical: 6 }]}>
        <Pressable
          style={s.actionRow}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <View style={s.actionLeft}>
            <View style={s.actionIconBox}>
              <KeyRound size={17} color={theme.colors.primary} />
            </View>
            <Text variant="bodyStrong" style={s.actionText}>
              Change Password
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </Pressable>

        {user?.role === 'Intern' ? (
          <Pressable
            style={[s.actionRow, s.actionRowBorder]}
            onPress={() => navigation.navigate('FaceEnrollment')}
          >
            <View style={s.actionLeft}>
              <View style={s.actionIconBox}>
                <ScanFace size={17} color={theme.colors.primary} />
              </View>
              <Text variant="bodyStrong" style={s.actionText}>
                Face Enrollment
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
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
      <Text variant="overline" tone="muted" style={s.infoLabel}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={s.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 16, // Perfect balance side spacing
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 20,
    gap: 6,
  },
  name: {
    fontSize: 21,
    fontWeight: '700' as const,
    color: t.colors.textPrimary,
    textAlign: 'center' as const,
  },
  roleChip: {
    backgroundColor: t.colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  // Info Row
  infoRow: {
    gap: 3,
  },
  infoLabel: {
    fontSize: 10,
  },
  infoValue: {
    fontSize: 15,
    color: t.colors.textPrimary,
  },

  // Preference Theme Control
  rowLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  segmentRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  segment: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceSunken,
  },
  segmentActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primaryContainer,
  },
  segmentText: {
    fontSize: 13,
  },
  segmentTextActive: {
    fontWeight: '700' as const,
  },

  // Action Items
  actionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 8,
  },
  actionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    marginTop: 4,
    paddingTop: 12,
  },
  actionLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionText: {
    fontSize: 15,
    color: t.colors.textPrimary,
  },
});

export default ProfileScreen;