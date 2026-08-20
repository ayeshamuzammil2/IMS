import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import type { AppTheme } from './types';

type StyleFactory<T> = (theme: AppTheme) => T;

// One StyleSheet per (factory, mode). Bounded by (#factories x 2 modes) - factories are
// module-level constants, so this cache never grows unbounded.
const cache = new WeakMap<StyleFactory<any>, Map<string, any>>();

/**
 * Reproduces StyleSheet.create's dedup/identity-stability per theme mode, while still allowing
 * the whole app to re-theme at runtime - the exact thing v1's frozen-at-module-load
 * StyleSheet.create objects could never do.
 *
 * Usage: `const makeStyles = (t: AppTheme) => ({...})` as a MODULE-LEVEL const (never inline in
 * a component - inline breaks the WeakMap cache), then `const s = useThemedStyles(makeStyles)`.
 */
export function useThemedStyles<T extends Record<string, unknown>>(factory: StyleFactory<T>): T {
  const theme = useTheme();
  return useMemo(() => {
    let byMode = cache.get(factory);
    if (!byMode) {
      byMode = new Map();
      cache.set(factory, byMode);
    }
    let sheet = byMode.get(theme.mode);
    if (!sheet) {
      sheet = StyleSheet.create(factory(theme) as any);
      byMode.set(theme.mode, sheet);
    }
    return sheet as T;
    // theme.mode is the only thing that should invalidate the cache - the WeakMap already keys
    // on it, so depending on the whole `theme` object would just recompute this callback (not
    // rebuild the StyleSheet) on every render for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, theme.mode]);
}
