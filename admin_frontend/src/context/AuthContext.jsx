import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/authApi.js';
import { dashboardApi } from '../api/dashboardApi.js';
import { getErrorMessage } from '../api/client.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'eclipse_admin_token';
const USER_KEY  = 'eclipse_admin_user';

function getSharedCookieSession() {
  try {
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const local = JSON.parse(localStorage.getItem(USER_KEY));
      if (local && local.is_admin) return local;
    } catch {}
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
    const local = localStorage.getItem(TOKEN_KEY);
    if (local) return local;
    const shared = getSharedCookieSession();
    return shared?.token || null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.is_admin === true;

  // Listen for secure postMessage session response from user frontend (port 5173)
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.origin !== 'http://localhost:5173' && e.origin !== 'http://127.0.0.1:5173') return;
      if (e.data?.type === 'ECLIPSE_SESSION_RESPONSE') {
        const { token: sharedToken, user: sharedUser } = e.data;
        if (sharedToken && sharedUser?.is_admin) {
          localStorage.setItem(TOKEN_KEY, sharedToken);
          localStorage.setItem(USER_KEY, JSON.stringify(sharedUser));
          setToken(sharedToken);
          setUser(sharedUser);
          setError(null);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // If not authenticated and opener exists, ask user frontend for active session
    if (!token && window.opener) {
      try {
        window.opener.postMessage({ type: 'ECLIPSE_REQUEST_SESSION' }, 'http://localhost:5173');
      } catch {}
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [token]);

  // Verify stored token on initial load against backend
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const verifySession = async () => {
      try {
        // Calling an admin endpoint authoritatively verifies the token and admin role
        await dashboardApi.getAdminStats();
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // Token is expired, invalid, or belongs to a non-admin
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
    setLoading(true);
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
        setLoading(false);
        return false;
      }

      localStorage.setItem(TOKEN_KEY, tok);
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      document.cookie = `eclipse_admin_shared=${encodeURIComponent(JSON.stringify({ token: tok, user: userObj }))}; path=/; max-age=604800; SameSite=Lax`;

      setToken(tok);
      setUser(userObj);
      setLoading(false);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
    setToken(null);
    setUser(null);
  }, []);

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
