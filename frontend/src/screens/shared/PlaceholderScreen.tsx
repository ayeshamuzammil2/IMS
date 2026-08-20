import React from 'react';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

/** Reused across every drawer destination not yet built - each is replaced screen-by-screen in later phases. */
export function PlaceholderScreen({ label }: { label: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <Screen>
      <Text variant="h2" style={s.title}>
        {label}
      </Text>
      <Text variant="body" tone="secondary">
        This screen is built in a later phase of the implementation plan.
      </Text>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  title: { marginBottom: t.spacing.sm },
});
