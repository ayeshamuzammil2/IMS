import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import type { AppTheme, ThemeMode } from '../theme/types';

type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue extends AppTheme {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  toggle: () => void;
}

const STORAGE_KEY = '@pia/themeMode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
      setHydrated(true);
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const resolvedMode: ThemeMode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const toggle = useCallback(() => {
    setPreference(resolvedMode === 'dark' ? 'light' : 'dark');
  }, [resolvedMode, setPreference]);

  const value = useMemo<ThemeContextValue>(() => {
    const base = resolvedMode === 'dark' ? darkTheme : lightTheme;
    return { ...base, preference, setPreference, toggle };
  }, [resolvedMode, preference, setPreference, toggle]);

  // Avoid a light->dark flash: don't render children until the persisted preference loads.
  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
