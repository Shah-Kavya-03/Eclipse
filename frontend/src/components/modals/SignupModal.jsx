import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function SignupModal({ isOpen, onClose, onBackToLogin }) {
    const { signup } = useAuth();
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setShowConfirmPassword(false);
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
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        setLoading(true);
        const success = await signup(name, email, password);
        setLoading(false);
        if (success) {
            onClose();
        }
    };

    return (
        <div
            className="modal-overlay active"
            id="signupOverlay"
            onClick={(e) => {
                if (e.target.id === 'signupOverlay') onClose();
            }}
        >
            <div className="modal signup-modal">
                <div className="modal-header">
                    <h2>Create Account</h2>
                    <button className="closeModal" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <form id="signupForm" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Full Name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

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
                            id="signupPassword"
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            <i
                                className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="password-wrapper">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="signupConfirmPassword"
                            placeholder="Confirm Password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            aria-label={
                                showConfirmPassword
                                    ? 'Hide password'
                                    : 'Show password'
                            }
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                        >
                            <i
                                className={`fa-solid ${showConfirmPassword
                                        ? 'fa-eye-slash'
                                        : 'fa-eye'
                                    }`}
                            />
                        </button>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <p className="signup-text">
                        Already have an account?{' '}
                        <a
                            href="#"
                            id="backToLogin"
                            onClick={(e) => {
                                e.preventDefault();
                                onBackToLogin();
                            }}
                        >
                            Sign In
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
