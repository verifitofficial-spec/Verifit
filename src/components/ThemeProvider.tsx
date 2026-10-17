'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'verifit-theme';
const CHANGE_EVENT = 'verifit-theme-change';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function getPreferredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Systemeinstellung verwenden, wenn Storage nicht zugänglich ist.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getThemeSnapshot(): Theme {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : getPreferredTheme();
}

function subscribeToTheme(onStoreChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => onStoreChange();
  const handleStorageChange = () => {
    applyTheme(getPreferredTheme());
    onStoreChange();
  };
  const handleSystemChange = () => {
    try {
      if (isTheme(window.localStorage.getItem(STORAGE_KEY))) return;
    } catch {
      // Ohne Storage folgt das Theme weiterhin der Systemeinstellung.
    }
    applyTheme(media.matches ? 'dark' : 'light');
    onStoreChange();
  };

  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener('storage', handleStorageChange);
  media.addEventListener('change', handleSystemChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener('storage', handleStorageChange);
    media.removeEventListener('change', handleSystemChange);
  };
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, getThemeSnapshot, () => 'light');

  useLayoutEffect(() => {
    applyTheme(getPreferredTheme());
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Das Theme bleibt für die aktuelle Sitzung aktiv, auch wenn Storage gesperrt ist.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme muss innerhalb des ThemeProvider verwendet werden.');
  return context;
}
