import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Preferences, ThemePreference } from '../data/database/schema';
import { preferencesRepository } from '../data/repositories/preferencesRepository';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);
  // Cached copy of the persisted preferences row, so setTheme can persist
  // synchronously off the current React event rather than re-fetching first.
  // Fetching-then-saving added a whole extra IndexedDB round trip between the
  // user's action and the write landing, which was long enough that a quick
  // reload right after changing the theme (e.g. a fast reload/navigation)
  // could beat the write and silently lose the change.
  const prefsRef = useRef<Preferences | null>(null);

  useEffect(() => {
    preferencesRepository.get().then((prefs) => {
      prefsRef.current = prefs;
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
    const updated: Preferences = { ...(prefsRef.current ?? { id: 'preferences', theme: next, lastSelectedMonthKey: null }), theme: next };
    prefsRef.current = updated;
    void preferencesRepository.save(updated);
  };

  if (!loaded) return null;

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
