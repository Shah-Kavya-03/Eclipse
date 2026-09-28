import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginModal({ isOpen, onClose, onOpenSignup }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setPassword('');
            setShowPassword(false);
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
        setLoading(true);
        const success = await login(email, password);
        setLoading(false);
        if (success) {
            onClose();
        }
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
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <div className="password-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="loginPassword"
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
