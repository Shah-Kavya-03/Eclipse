import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'eclipse_admin_theme';

const ThemeContext = createContext({
  themePreference: 'dark',
  resolvedTheme: 'dark',
  setThemePreference: () => {},
});

function getInitialPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage might be unavailable
  }
  return 'dark';
}

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreferenceState] = useState(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Compute resolved theme: if 'system', use detected OS theme; else explicit preference
  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;

  // Listen to OS system color scheme changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'light' : 'dark');
    };

    // Set initial
    setSystemTheme(mediaQuery.matches ? 'light' : 'dark');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update HTML data-theme attribute whenever resolvedTheme or themePreference changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-theme-preference', themePreference);
  }, [resolvedTheme, themePreference]);

  const setThemePreference = useCallback((pref) => {
    if (pref !== 'light' && pref !== 'dark' && pref !== 'system') return;
    setThemePreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // ignore storage failure
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        resolvedTheme,
        setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
