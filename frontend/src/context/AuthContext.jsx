import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiLogin, apiSignup, apiLogout } from '../api/config';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

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
    };
}

export function AuthProvider({ children }) {
    const { showToast } = useToast();

    // Ref to hold a callback that ChatContext registers to clear its state on logout
    const onLogoutRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(() => {
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
        return null;
    });

    const [authToken, setAuthToken] = useState(() => {
        return localStorage.getItem('guardrailToken') || null;
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

    const login = async (email, password) => {
        try {
            const res = await apiLogin(email, password);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Login failed.', 'error');
                return false;
            }
            const data = await res.json();
            const user = normalizeUser(data);
            // Bug 2: clear stale conversation state BEFORE setting new user
            if (onLogoutRef.current) {
                onLogoutRef.current();
            }
            setCurrentUser(user);
            setAuthToken(data.token || data.access_token || data.auth_token || '');
            showToast('Signed in successfully.', 'success');
            return user;
        } catch (err) {
            console.error('Login request failed:', err);
            showToast('Could not reach the server. Is the backend running?', 'error');
            return false;
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
            setCurrentUser(user);
            setAuthToken(data.token || data.access_token || data.auth_token || '');
            showToast('Account created.', 'success');
            return user;
        } catch (err) {
            console.error('Signup request failed:', err);
            showToast('Could not reach the server. Is the backend running?', 'error');
            return false;
        }
    };

    const logout = async () => {
        // Bug 2: clear conversation state immediately on logout
        if (onLogoutRef.current) {
            onLogoutRef.current();
        }
        try {
            await apiLogout();
        } catch (err) {
            console.warn('Logout request failed (clearing local session anyway):', err);
        }
        setCurrentUser(null);
        setAuthToken(null);
        // Also clear user-specific localStorage entries
        localStorage.removeItem('guardrailChats');
        showToast('Logged out.', 'success');
    };

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
