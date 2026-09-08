import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemePreference } from '../data/database/schema';
import { preferencesRepository } from '../data/repositories/preferencesRepository';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    preferencesRepository.get().then((prefs) => {
      setThemeState(prefs.theme);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    preferencesRepository.get().then((prefs) => {
      preferencesRepository.save({ ...prefs, theme: next });
    });
  };

  if (!loaded) return null;

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
