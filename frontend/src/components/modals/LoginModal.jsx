import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginModal({ isOpen, onClose, onOpenSignup }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setPassword('');
            setShowPassword(false);
            setAuthError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setAuthError(null);
        setLoading(true);
        const res = await login(email, password);
        setLoading(false);
        if (res && res.success) {
            if (res.user?.is_admin) {
                const hostname = window.location.hostname || 'localhost';
                const baseUrl = `http://${hostname}:5174/admin`;
                const token = res.adminToken || localStorage.getItem('eclipse_admin_token') || res.token || localStorage.getItem('guardrailToken');
                const user = res.user;
                const currentTheme = localStorage.getItem(`eclipseTheme_${user.user_id}`) || localStorage.getItem('eclipseTheme') || 'dark';
                try {
                    document.cookie = 'eclipse_logged_out=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                    document.cookie = 'eclipse_logged_out=; path=/admin; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                    const sessionPayload = JSON.stringify({ token, user, theme: currentTheme });
                    document.cookie = `eclipse_admin_shared=${encodeURIComponent(sessionPayload)}; path=/; max-age=604800; SameSite=Lax`;
                } catch {}
                const payload = encodeURIComponent(JSON.stringify({ token, user, theme: currentTheme }));
                window.location.href = `${baseUrl}#session=${payload}`;
                return;
            }
            onClose();
        } else {
            if (res?.errorType === 'invalid_credentials' || res?.status === 401) {
                setAuthError('Invalid email or password. Please try again.');
            } else if (res?.errorType === 'network_error') {
                setAuthError('Could not reach the server. Please check your connection or backend server.');
            } else {
                setAuthError(res?.detail || 'Login failed. Please try again later.');
            }
        }
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (authError) setAuthError(null);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (authError) setAuthError(null);
    };

    return (
        <div
            className="modal-overlay active"
            id="loginOverlay"
            onClick={(e) => {
                if (e.target.id === 'loginOverlay') onClose();
            }}
        >
            <div className="modal login-modal">
                <div className="modal-header">
                    <h2>Sign In</h2>
                    <button className="closeModal" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <form id="loginForm" onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={email}
                        onChange={handleEmailChange}
                    />

                    <div className="password-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="loginPassword"
                            placeholder="Password"
                            required
                            value={password}
                            onChange={handlePasswordChange}
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            <i
                                className={`fa-solid ${
                                    showPassword ? 'fa-eye-slash' : 'fa-eye'
                                }`}
                            ></i>
                        </button>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    {authError && (
                        <div className="auth-error-message" role="alert">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <span>{authError}</span>
                        </div>
                    )}

                    <p className="signup-text">
                        Don't have an account?{' '}
                        <a
                            href="#"
                            id="openSignup"
                            onClick={(e) => {
                                e.preventDefault();
                                onOpenSignup();
                            }}
                        >
                            Sign Up
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
