import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiLogin, apiPythonLogin, apiSignup, apiLogout } from '../api/config';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

function getSharedAdminSession() {
    try {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const cookie = document.cookie || '';
            if (params.get('logged_out') === '1' || cookie.includes('eclipse_logged_out=1')) {
                return null;
            }
            const hash = window.location.hash || '';
            const match = hash.match(/(?:#|&)(?:shared_session|session)=([^&]+)/);
            if (match && match[1]) {
                const parsed = JSON.parse(decodeURIComponent(match[1]));
                if (parsed?.user) {
                    const cleanUrl = window.location.pathname + window.location.search;
                    window.history.replaceState(null, '', cleanUrl);
                    return parsed;
                }
            }
        }
        const cookieMatch = document.cookie.match(/(?:^|;\s*)eclipse_admin_shared=([^;]*)/);
        if (cookieMatch && cookieMatch[1]) {
            const parsed = JSON.parse(decodeURIComponent(cookieMatch[1]));
            if (parsed?.user) return parsed;
        }
    } catch {}
    return null;
}

/**
 * Bug 1 / Bug 11 fix:
 * Normalises the user object from whichever response shape the backend returns.
 * Supports: data.name, data.full_name, data.username, data.user.name,
 *           data.user.full_name, data.user.username, data.user_id, data.user.id
 * Falls back to the email prefix so "undefined" is never displayed.
 */
function normalizeUser(data) {
    // Flatten potential nesting
    const src = data?.user || data || {};

    const rawName =
        src.name ||
        src.full_name ||
        src.username ||
        data?.name ||
        data?.full_name ||
        data?.username ||
        '';

    const email =
        src.email ||
        data?.email ||
        '';

    const user_id =
        src.user_id ||
        src.id ||
        data?.user_id ||
        data?.id ||
        '';

    // Safe display name: prefer explicit name, fall back to email prefix, then "User"
    const displayName =
        (rawName && rawName.trim()) ||
        (email ? email.split('@')[0] : '') ||
        'User';

    return {
        user_id,
        name: displayName,
        email,
        is_admin: Boolean(src.is_admin ?? data?.is_admin),
    };
}

export function AuthProvider({ children }) {
    const { showToast } = useToast();

    // Ref to hold a callback that ChatContext registers to clear its state on logout
    const onLogoutRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const cookie = document.cookie || '';
            if (params.get('logged_out') === '1' || cookie.includes('eclipse_logged_out=1')) {
                try {
                    localStorage.removeItem('guardrailUser');
                    localStorage.removeItem('guardrailToken');
                    localStorage.removeItem('guardrailChats');
                    localStorage.removeItem('eclipse_admin_token');
                    localStorage.removeItem('eclipse_admin_user');
                } catch {}
                return null;
            }
        }
        const stored = localStorage.getItem('guardrailUser');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Re-normalize stored user in case of stale data
                if (parsed && typeof parsed === 'object') {
                    return normalizeUser(parsed);
                }
            } catch {
                return null;
            }
        }
        const shared = getSharedAdminSession();
        if (shared?.user) {
            return normalizeUser(shared.user);
        }
        return null;
    });

    const [authToken, setAuthToken] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const cookie = document.cookie || '';
            if (params.get('logged_out') === '1' || cookie.includes('eclipse_logged_out=1')) {
                return null;
            }
        }
        const local = localStorage.getItem('guardrailToken');
        if (local) return local;
        const shared = getSharedAdminSession();
        return shared?.token || null;
    });

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('guardrailUser', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('guardrailUser');
        }
    }, [currentUser]);

    useEffect(() => {
        if (authToken) {
            localStorage.setItem('guardrailToken', authToken);
        } else {
            localStorage.removeItem('guardrailToken');
        }
    }, [authToken]);

    // Keep admin shared cookie continuously in sync with active session
    useEffect(() => {
        if (currentUser?.is_admin) {
            const adminToken = localStorage.getItem('eclipse_admin_token') || authToken;
            if (adminToken) {
                const sessionPayload = JSON.stringify({ token: adminToken, user: currentUser });
                document.cookie = `eclipse_admin_shared=${encodeURIComponent(sessionPayload)}; path=/; max-age=604800; SameSite=Lax`;
            }
        } else if (!currentUser) {
            document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
        }
    }, [currentUser, authToken]);

    const login = async (email, password) => {
        try {
            const res = await apiLogin(email, password);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return {
                    success: false,
                    status: res.status,
                    errorType: res.status === 401 ? 'invalid_credentials' : 'server_error',
                    detail: err.detail || 'Login failed.',
                };
            }
            const data = await res.json();
            const user = normalizeUser(data);
            // Bug 2: clear stale conversation state BEFORE setting new user
            if (onLogoutRef.current) {
                onLogoutRef.current();
            }
            const tok = data.token || data.access_token || data.auth_token || '';
            setCurrentUser(user);
            setAuthToken(tok);

            if (user?.user_id) {
                const userTheme = localStorage.getItem(`eclipseTheme_${user.user_id}`);
                if (userTheme) {
                    localStorage.setItem('eclipseTheme', userTheme);
                    const root = document.documentElement;
                    if (userTheme === 'light') root.setAttribute('data-theme', 'light');
                    else if (userTheme === 'dark') root.removeAttribute('data-theme');
                    window.dispatchEvent(new Event('eclipse-theme-change'));
                }
            }

            let adminTok = null;
            if (user?.is_admin) {
                try {
                    const pyRes = await apiPythonLogin(email, password);
                    if (pyRes.ok) {
                        const pyData = await pyRes.json();
                        adminTok = pyData.access_token || pyData.token;
                        if (adminTok) {
                            localStorage.setItem('eclipse_admin_token', adminTok);
                            localStorage.setItem('eclipse_admin_user', JSON.stringify(user));
                        }
                    }
                } catch (pyErr) {
                    console.warn('Could not reach Python backend for admin token:', pyErr);
                }

                const effectiveAdminToken = adminTok || tok;
                const sessionPayload = JSON.stringify({ token: effectiveAdminToken, user });
                document.cookie = `eclipse_admin_shared=${encodeURIComponent(sessionPayload)}; path=/; max-age=604800; SameSite=Lax`;
            } else {
                document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
            }
            document.cookie = 'eclipse_logged_out=; path=/; max-age=0; SameSite=Lax';

            showToast('Signed in successfully.', 'success');
            return {
                success: true,
                user,
                token: tok,
                adminToken: adminTok || tok,
            };
        } catch (err) {
            console.error('Login request failed:', err);
            return {
                success: false,
                status: 0,
                errorType: 'network_error',
                detail: 'Could not reach the server. Is the backend running?',
            };
        }
    };

    const signup = async (name, email, password) => {
        try {
            const res = await apiSignup(name, email, password);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Signup failed.', 'error');
                return false;
            }
            const data = await res.json();
            const user = normalizeUser({ ...data, name: data.name || name });
            // Bug 2: clear stale conversation state BEFORE setting new user
            if (onLogoutRef.current) {
                onLogoutRef.current();
            }
            const tok = data.token || data.access_token || data.auth_token || '';
            setCurrentUser(user);
            setAuthToken(tok);
            document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
            showToast('Account created.', 'success');
            return user;
        } catch (err) {
            console.error('Signup request failed:', err);
            showToast('Could not reach the server. Is the backend running?', 'error');
            return false;
        }
    };

    const logout = async () => {
        // Priority 1: Clear conversation state immediately on logout before any async calls
        if (onLogoutRef.current) {
            try {
                onLogoutRef.current();
            } catch (err) {
                console.warn('Error clearing conversation state on logout:', err);
            }
        }
        // Immediately reset user session state in memory
        setCurrentUser(null);
        setAuthToken(null);

        // Immediately purge user credentials and chat storage from localStorage
        localStorage.removeItem('guardrailUser');
        localStorage.removeItem('guardrailToken');
        localStorage.removeItem('guardrailChats');
        localStorage.removeItem('eclipse_admin_token');
        localStorage.removeItem('eclipse_admin_user');
        document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'eclipse_logged_out=1; path=/; max-age=60; SameSite=Lax';

        try {
            const channel = new BroadcastChannel('eclipse_auth_channel');
            channel.postMessage({ type: 'ECLIPSE_LOGOUT' });
            channel.close();
        } catch {}

        // Notify server without blocking immediate frontend state clearance
        try {
            await apiLogout();
        } catch (err) {
            console.warn('Logout request failed (clearing local session anyway):', err);
        }

        showToast('Logged out.', 'success');
    };

    // Cross-tab and cross-port logout synchronization
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
            if (cookie.includes('eclipse_logged_out=1') && (authToken || currentUser)) {
                logout();
            }
        };

        window.addEventListener('focus', handleSyncCheck);
        document.addEventListener('visibilitychange', handleSyncCheck);
        window.addEventListener('storage', (e) => {
            if (e.key === 'guardrailToken' && !e.newValue && (authToken || currentUser)) {
                logout();
            }
        });

        return () => {
            if (channel) channel.close();
            window.removeEventListener('focus', handleSyncCheck);
            document.removeEventListener('visibilitychange', handleSyncCheck);
        };
    }, [authToken, currentUser]);

    /**
     * Called by ChatContext to register its clear-state callback.
     * This avoids a circular dependency between Auth and Chat contexts.
     */
    const registerLogoutCallback = (cb) => {
        onLogoutRef.current = cb;
    };

    return (
        <AuthContext.Provider value={{ currentUser, authToken, login, signup, logout, registerLogoutCallback }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
