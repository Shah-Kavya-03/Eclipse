import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/authApi.js';
import { dashboardApi } from '../api/dashboardApi.js';
import { getErrorMessage } from '../api/client.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'eclipse_admin_token';
const USER_KEY  = 'eclipse_admin_user';

function clearLoggedOutCookie() {
  try {
    document.cookie = 'eclipse_logged_out=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = 'eclipse_logged_out=; path=/admin; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  } catch {}
}

function getSharedCookieSession() {
  try {
    if (typeof document === 'undefined') return null;
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
    const hash = window.location.hash || '';
    const match = hash.match(/(?:#|&)(?:shared_session|session)=([^&]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      if (parsed?.token && parsed?.user?.is_admin) {
        return parsed;
      }
    }
  } catch (e) {
    // Non-fatal if parsing URL session fails
  }
  return null;
}

function resolveInitialAdminSession() {
  // 1. Explicit incoming URL hash session (highest priority)
  const urlSession = getSessionFromUrl();
  if (urlSession?.token && urlSession?.user?.is_admin) {
    clearLoggedOutCookie();
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(urlSession.user));
      localStorage.setItem(TOKEN_KEY, urlSession.token);
      document.cookie = `eclipse_admin_shared=${encodeURIComponent(JSON.stringify(urlSession))}; path=/; max-age=604800; SameSite=Lax`;
    } catch {}
    return urlSession;
  }

  // 2. If explicitly logged out and no fresh URL session arrived, respect logout
  if (typeof document !== 'undefined' && document.cookie.includes('eclipse_logged_out=1')) {
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return null;
  }

  // 3. Stored localStorage session
  try {
    const localUser = JSON.parse(localStorage.getItem(USER_KEY));
    const localTok = localStorage.getItem(TOKEN_KEY);
    if (localUser?.is_admin && localTok) {
      return { user: localUser, token: localTok };
    }
  } catch {}

  // 4. Shared cookie session
  const shared = getSharedCookieSession();
  if (shared?.token && shared?.user?.is_admin) {
    clearLoggedOutCookie();
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(shared.user));
      localStorage.setItem(TOKEN_KEY, shared.token);
    } catch {}
    return shared;
  }

  return null;
}

export function AuthProvider({ children }) {
  const initialSessionRef = React.useRef(null);
  if (!initialSessionRef.current) {
    initialSessionRef.current = resolveInitialAdminSession();
  }
  const initialSession = initialSessionRef.current;

  const [user, setUser] = useState(() => initialSession?.user || null);
  const [token, setToken] = useState(() => initialSession?.token || null);

  const isLoggedOutRef = React.useRef(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(() => {
    const hasSyncSession = Boolean(initialSession?.token && initialSession?.user);
    return !hasSyncSession && typeof window !== 'undefined' && Boolean(window.opener);
  });
  const [error, setError] = useState(null);

  const loading = actionLoading || initialChecking;
  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.is_admin === true;

  // Clean URL session hash after initial mount to keep address bar clean
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/(?:#|&)(?:shared_session|session)=([^&]+)/);
      if (match) {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, []);

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

  const logout = useCallback(async (isRemoteBroadcast = false) => {
    // 1. Guard against duplicate/redundant logouts
    if (!token && !user && !localStorage.getItem(TOKEN_KEY)) {
      clearLoggedOutCookie();
      return;
    }

    isLoggedOutRef.current = true;

    // 2. Immediately clear memory and storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
    clearLoggedOutCookie();

    setToken(null);
    setUser(null);
    setError(null);

    // 3. Only broadcast to OTHER tabs if this wasn't triggered by an incoming broadcast
    if (!isRemoteBroadcast) {
      try {
        const channel = new BroadcastChannel('eclipse_auth_channel');
        channel.postMessage({ type: 'ECLIPSE_LOGOUT' });
        channel.close();
      } catch {}
    }

    // 4. Notify backend without blocking immediate redirection
    try {
      await authApi.logout();
    } catch {}

    const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
    window.location.replace(`http://${hostname}:5173/?logged_out=1`);
  }, [token, user]);

  // Synchronize cross-tab and cross-port logout safely
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('eclipse_auth_channel');
      channel.onmessage = (e) => {
        if (e.data?.type === 'ECLIPSE_LOGOUT') {
          logout(true); // isRemoteBroadcast = true prevents re-broadcasting
        }
      };
    } catch {}

    const handleSyncCheck = () => {
      if (token && user?.is_admin) {
        clearLoggedOutCookie();
        return;
      }
      const cookie = document.cookie || '';
      if (cookie.includes('eclipse_logged_out=1') && (token || user)) {
        logout(true);
      }
    };

    window.addEventListener('focus', handleSyncCheck);
    document.addEventListener('visibilitychange', handleSyncCheck);
    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY && !e.newValue && (token || user)) {
        logout(true);
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
