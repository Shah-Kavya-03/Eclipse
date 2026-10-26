import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/authApi.js';
import { dashboardApi } from '../api/dashboardApi.js';
import { getErrorMessage } from '../api/client.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'eclipse_admin_token';
const USER_KEY  = 'eclipse_admin_user';

function getSharedCookieSession() {
  try {
    if (typeof document !== 'undefined' && document.cookie.includes('eclipse_logged_out=1')) {
      return null;
    }
    const match = document.cookie.match(/(?:^|;\s*)eclipse_admin_shared=([^;]*)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      if (parsed?.token && parsed?.user?.is_admin) {
        return parsed;
      }
    }
  } catch (e) {
    // Non-fatal if parsing cookie fails
  }
  return null;
}

function getSessionFromUrl() {
  try {
    if (typeof window === 'undefined') return null;
    if (typeof document !== 'undefined' && document.cookie.includes('eclipse_logged_out=1')) {
      return null;
    }
    const hash = window.location.hash || '';
    const match = hash.match(/(?:#|&)(?:shared_session|session)=([^&]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      if (parsed?.token && parsed?.user?.is_admin) {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
        return parsed;
      }
    }
  } catch (e) {
    // Non-fatal if parsing URL session fails
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof document !== 'undefined' && document.cookie.includes('eclipse_logged_out=1')) {
      try {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      } catch {}
      return null;
    }
    try {
      const local = JSON.parse(localStorage.getItem(USER_KEY));
      if (local && local.is_admin) return local;
    } catch {}
    const urlSession = getSessionFromUrl();
    if (urlSession?.user) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(urlSession.user));
        localStorage.setItem(TOKEN_KEY, urlSession.token);
        document.cookie = `eclipse_admin_shared=${encodeURIComponent(JSON.stringify(urlSession))}; path=/; max-age=604800; SameSite=Lax`;
      } catch {}
      return urlSession.user;
    }
    const shared = getSharedCookieSession();
    if (shared?.user) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(shared.user));
        localStorage.setItem(TOKEN_KEY, shared.token);
      } catch {}
      return shared.user;
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    if (typeof document !== 'undefined' && document.cookie.includes('eclipse_logged_out=1')) {
      return null;
    }
    const local = localStorage.getItem(TOKEN_KEY);
    if (local) return local;
    const urlSession = getSessionFromUrl();
    if (urlSession?.token) return urlSession.token;
    const shared = getSharedCookieSession();
    return shared?.token || null;
  });

  const isLoggedOutRef = React.useRef(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(() => {
    const hasSyncSession = Boolean(
      (localStorage.getItem(TOKEN_KEY) && localStorage.getItem(USER_KEY)) ||
      getSessionFromUrl() ||
      getSharedCookieSession()
    );
    return !hasSyncSession && typeof window !== 'undefined' && Boolean(window.opener);
  });
  const [error, setError] = useState(null);

  const loading = actionLoading || initialChecking;
  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    if (!initialChecking) return;
    const timer = setTimeout(() => {
      setInitialChecking(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [initialChecking]);

  // Listen for secure postMessage session response from user frontend (port 5173) ONCE on mount
  useEffect(() => {
    const handleMessage = (e) => {
      if (isLoggedOutRef.current) return;
      if (e.origin !== 'http://localhost:5173' && e.origin !== 'http://127.0.0.1:5173') return;
      if (e.data?.type === 'ECLIPSE_SESSION_RESPONSE') {
        const { token: sharedToken, user: sharedUser } = e.data;
        if (sharedToken && sharedUser?.is_admin) {
          localStorage.setItem(TOKEN_KEY, sharedToken);
          localStorage.setItem(USER_KEY, JSON.stringify(sharedUser));
          setToken(sharedToken);
          setUser(sharedUser);
          setError(null);
          setInitialChecking(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // If not authenticated and opener exists, ask user frontend for active session
    if (!token && window.opener && !isLoggedOutRef.current) {
      try {
        window.opener.postMessage({ type: 'ECLIPSE_REQUEST_SESSION' }, 'http://localhost:5173');
      } catch {}
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Verify stored token on initial load against backend
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const verifySession = async () => {
      try {
        await dashboardApi.getAdminStats();
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
          setToken(null);
          setUser(null);
          setError(status === 403 ? 'Access denied. Account lacks admin privileges.' : 'Session expired. Please sign in again.');
        }
      }
    };

    verifySession();
    return () => { cancelled = true; };
  }, [token]);

  const login = useCallback(async (email, password) => {
    isLoggedOutRef.current = false;
    setActionLoading(true);
    setError(null);
    try {
      const data = await authApi.login(email, password);

      const tok = data.access_token || data.token;
      const userObj = {
        user_id: data.user_id || data.id,
        name: data.name || data.username,
        email: data.email,
        is_admin: data.is_admin,
      };

      if (!userObj.is_admin) {
        setError('This account does not have administrator privileges.');
        setActionLoading(false);
        return false;
      }

      localStorage.setItem(TOKEN_KEY, tok);
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      document.cookie = `eclipse_admin_shared=${encodeURIComponent(JSON.stringify({ token: tok, user: userObj }))}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = 'eclipse_logged_out=; path=/; max-age=0; SameSite=Lax';

      setToken(tok);
      setUser(userObj);
      setActionLoading(false);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      setActionLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    isLoggedOutRef.current = true;
    try {
      await authApi.logout();
    } catch {
      // non-fatal
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'eclipse_logged_out=1; path=/; max-age=60; SameSite=Lax';

    try {
      const channel = new BroadcastChannel('eclipse_auth_channel');
      channel.postMessage({ type: 'ECLIPSE_LOGOUT' });
      channel.close();
    } catch {}

    setToken(null);
    setUser(null);
    setError(null);

    const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
    window.location.replace(`http://${hostname}:5173/?logged_out=1`);
  }, []);

  // Synchronize cross-tab and cross-port logout
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('eclipse_auth_channel');
      channel.onmessage = (e) => {
        if (e.data?.type === 'ECLIPSE_LOGOUT') {
          logout();
        }
      };
    } catch {}

    const handleSyncCheck = () => {
      const cookie = document.cookie || '';
      if (cookie.includes('eclipse_logged_out=1') && (token || user)) {
        logout();
      }
    };

    window.addEventListener('focus', handleSyncCheck);
    document.addEventListener('visibilitychange', handleSyncCheck);
    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY && !e.newValue && (token || user)) {
        logout();
      }
    });

    return () => {
      if (channel) channel.close();
      window.removeEventListener('focus', handleSyncCheck);
      document.removeEventListener('visibilitychange', handleSyncCheck);
    };
  }, [logout, token, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        loading,
        error,
        setError,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
