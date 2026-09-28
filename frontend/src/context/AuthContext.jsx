import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiSignup, apiLogout } from '../api/config';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const { showToast } = useToast();
    const [currentUser, setCurrentUser] = useState(() => {
        const stored = localStorage.getItem('guardrailUser');
        if (stored) {
            try {
                return JSON.parse(stored);
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
            const user = {
                user_id: data.user_id,
                name: data.name,
                email: data.email
            };
            setCurrentUser(user);
            setAuthToken(data.token);
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
            const user = {
                user_id: data.user_id,
                name: data.name,
                email: data.email
            };
            setCurrentUser(user);
            setAuthToken(data.token);
            showToast('Account created.', 'success');
            return user;
        } catch (err) {
            console.error('Signup request failed:', err);
            showToast('Could not reach the server. Is the backend running?', 'error');
            return false;
        }
    };

    const logout = async () => {
        try {
            await apiLogout();
        } catch (err) {
            console.warn('Logout request failed (clearing local session anyway):', err);
        }
        setCurrentUser(null);
        setAuthToken(null);
        showToast('Logged out.', 'success');
    };

    return (
        <AuthContext.Provider value={{ currentUser, authToken, login, signup, logout }}>
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
