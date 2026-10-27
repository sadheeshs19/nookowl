import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type ThemeColors } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const STORAGE_KEY = 'nookowl.theme';

const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  isDark: false,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
    return {
      colors: isDark ? dark : light,
      isDark,
      preference,
      setPreference: (p) => {
        setPref(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
