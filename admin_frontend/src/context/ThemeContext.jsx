import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'eclipse_admin_theme';

const ThemeContext = createContext({
  themePreference: 'dark',
  resolvedTheme: 'dark',
  setThemePreference: () => {},
});

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem('eclipse_admin_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u?.user_id || u?.id || null;
    }
  } catch {}
  return null;
}

function getUserStorageKey(userId) {
  const uid = userId || getCurrentUserId();
  return uid ? `eclipse_admin_theme_${uid}` : STORAGE_KEY;
}

function getInitialPreference() {
  try {
    const uid = getCurrentUserId();
    const userKey = getUserStorageKey(uid);
    const storedUser = localStorage.getItem(userKey);
    if (storedUser === 'light' || storedUser === 'dark' || storedUser === 'system') {
      return storedUser;
    }
    // Check if session passed in URL hash contains theme
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/(?:#|&|%22)theme(?:%22%3A%22|%3D|=)(light|dark|system)/i);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    // Check user frontend scoped theme or global user frontend theme
    if (uid) {
      const userFrontendTheme = localStorage.getItem(`eclipseTheme_${uid}`);
      if (userFrontendTheme === 'light' || userFrontendTheme === 'dark' || userFrontendTheme === 'system') {
        return userFrontendTheme;
      }
    }
    const generalFrontendTheme = localStorage.getItem('eclipseTheme');
    if (generalFrontendTheme === 'light' || generalFrontendTheme === 'dark' || generalFrontendTheme === 'system') {
      return generalFrontendTheme;
    }
    const storedGlobal = localStorage.getItem(STORAGE_KEY);
    if (storedGlobal === 'light' || storedGlobal === 'dark' || storedGlobal === 'system') {
      return storedGlobal;
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
      const userKey = getUserStorageKey();
      localStorage.setItem(userKey, pref);
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
