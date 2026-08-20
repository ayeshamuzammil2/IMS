import React from 'react';
import { View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { RoleAvatar } from '../../components/media/RoleAvatar';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

/** __DEV__-only screen verifying the theme toggles instantly with no remount and no unstyled flash. */
export function ThemeGalleryScreen() {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);

  return (
    <Screen scroll>
      <Text variant="h1">Theme Gallery</Text>
      <Text variant="body" tone="secondary" style={s.gap}>
        Current mode: {theme.mode} (preference: {theme.preference})
      </Text>

      <Button label="Toggle theme" onPress={theme.toggle} style={s.gap} />

      <View style={s.row}>
        <Button label="Primary" variant="primary" />
        <Button label="Secondary" variant="secondary" />
      </View>
      <View style={s.row}>
        <Button label="Outline" variant="outline" />
        <Button label="Ghost" variant="ghost" />
        <Button label="Danger" variant="danger" />
      </View>

      <View style={s.card}>
        {(['h1', 'h2', 'h3', 'body', 'bodyStrong', 'caption', 'overline'] as const).map((v) => (
          <Text key={v} variant={v}>
            {v} - The quick brown fox
          </Text>
        ))}
      </View>

      <View style={s.card}>
        {(['success', 'warning', 'error', 'brand', 'muted'] as const).map((tone) => (
          <Text key={tone} tone={tone}>
            {tone} tone text
          </Text>
        ))}
      </View>

      <Input label="Sample input" placeholder="Type here" />
      <Input label="Sample password" placeholder="••••••••" secureToggle secureTextEntry />

      <View style={s.row}>
        <RoleAvatar name="Ayesha Khan" size={48} />
        <RoleAvatar name="M" size={48} />
      </View>

      <View style={s.swatchGrid}>
        {Object.entries(theme.colors).map(([key, value]) => (
          <View key={key} style={s.swatchItem}>
            <View style={[s.swatch, { backgroundColor: value as string }]} />
            <Text variant="caption" tone="muted">
              {key}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  gap: { marginBottom: t.spacing.lg },
  row: { flexDirection: 'row' as const, gap: t.spacing.sm, marginBottom: t.spacing.lg, flexWrap: 'wrap' as const },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.xs,
    marginBottom: t.spacing.lg,
  },
  swatchGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: t.spacing.md },
  swatchItem: { width: 72, alignItems: 'center' as const },
  swatch: { width: 48, height: 48, borderRadius: t.radii.md, marginBottom: t.spacing.xs, borderWidth: 1, borderColor: t.colors.border },
});
