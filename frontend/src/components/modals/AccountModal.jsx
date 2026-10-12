import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../../api/config';

export default function AccountModal({
    isOpen,
    onClose,
    initialTab = 'information',
    onOpenSignout,
    onSwitchAccount
}) {
    const { currentUser, authToken } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState(initialTab || 'information');

    // Change Password Form State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submittingPassword, setSubmittingPassword] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab || 'information');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordFeedback(null);
        }
    }, [isOpen, initialTab]);

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

    const handleTabClick = (tab) => {
        if (tab === 'signout') {
            onClose();
            if (onOpenSignout) onOpenSignout();
        } else {
            setActiveTab(tab);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordFeedback(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordFeedback({
                type: 'error',
                message: 'All password fields are required.'
            });
            return;
        }

        if (newPassword.length < 8) {
            setPasswordFeedback({
                type: 'error',
                message: 'New password must be at least 8 characters long.'
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordFeedback({
                type: 'error',
                message: 'New password and confirmation do not match.'
            });
            return;
        }

        setSubmittingPassword(true);

        try {
            // Attempt request against existing backend endpoints
            const res = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (res.ok) {
                setPasswordFeedback({
                    type: 'success',
                    message: 'Password successfully updated.'
                });
                showToast('Password updated successfully.', 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else if (res.status === 404 || res.status === 405) {
                // Honest report when backend does not have change-password route
                setPasswordFeedback({
                    type: 'error',
                    message: 'Password change is not currently supported by the backend API. Please contact the administrator.'
                });
            } else {
                const err = await res.json().catch(() => ({}));
                setPasswordFeedback({
                    type: 'error',
                    message: err.detail || 'Failed to change password. Please check your current password.'
                });
            }
        } catch (error) {
            // Network failure or unsupported endpoint
            setPasswordFeedback({
                type: 'error',
                message: 'Password change is not currently supported by the backend server. Please contact your system administrator.'
            });
        } finally {
            setSubmittingPassword(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'information':
                return (
                    <div className="account-info-section">
                        <div className="account-avatar-banner">
                            <div className="account-modal-avatar">
                                <i className="fa-solid fa-user"></i>
                            </div>
                            <div className="account-banner-details">
                                <h3>{currentUser ? currentUser.name : 'Guest User'}</h3>
                                <span className="account-role-badge">
                                    <i className="fa-solid fa-shield-halved"></i>
                                    {currentUser?.is_admin ? 'Security Administrator' : 'Standard User'}
                                </span>
                            </div>
                        </div>

                        <div className="account-details-grid">
                            <div className="account-detail-card">
                                <label>Full Name / Username</label>
                                <div className="detail-value">{currentUser ? currentUser.name : 'Guest'}</div>
                            </div>

                            <div className="account-detail-card">
                                <label>Email Address</label>
                                <div className="detail-value">{currentUser?.email || 'Not Signed In'}</div>
                            </div>

                            <div className="account-detail-card">
                                <label>User Identifier</label>
                                <div className="detail-value code-value">{currentUser?.user_id || 'guest_session'}</div>
                            </div>

                            <div className="account-detail-card">
                                <label>Security Status</label>
                                <div className="detail-value status-active">
                                    <i className="fa-solid fa-circle-check"></i> Active & Protected by Eclipse Guardrail
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'password':
                return (
                    <div className="account-password-section">
                        <div className="section-header-box">
                            <i className="fa-solid fa-key header-icon"></i>
                            <div>
                                <h3>Change Password</h3>
                                <p className="section-subtitle">
                                    Update your account password to ensure continuous security.
                                </p>
                            </div>
                        </div>

                        {passwordFeedback && (
                            <div className={`password-feedback ${passwordFeedback.type}`}>
                                <i className={`fa-solid ${passwordFeedback.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                                <span>{passwordFeedback.message}</span>
                            </div>
                        )}

                        <form className="password-form" onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        id="currentPassword"
                                        className="settings-input"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password-btn"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        aria-label="Toggle password visibility"
                                    >
                                        <i className={`fa-solid ${showCurrent ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">New Password (Min. 8 characters)</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        id="newPassword"
                                        className="settings-input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password-btn"
                                        onClick={() => setShowNew(!showNew)}
                                        aria-label="Toggle password visibility"
                                    >
                                        <i className={`fa-solid ${showNew ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        id="confirmPassword"
                                        className="settings-input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password-btn"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        aria-label="Toggle password visibility"
                                    >
                                        <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="settings-save-btn"
                                disabled={submittingPassword}
                            >
                                {submittingPassword ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin"></i> Updating Password…
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </form>
                    </div>
                );

            case 'switch':
                return (
                    <div className="account-switch-section">
                        <div className="switch-card">
                            <div className="switch-icon-wrapper">
                                <i className="fa-solid fa-right-left"></i>
                            </div>
                            <h3>Switch Account</h3>
                            <p>
                                Switching accounts will securely end your current active session for{' '}
                                <strong>{currentUser ? currentUser.name : 'your profile'}</strong> and open the sign-in modal so you can log into another account.
                            </p>
                            <p className="switch-note">
                                <i className="fa-solid fa-circle-info"></i> Your saved conversation history and settings remain safe and linked to this account in the database.
                            </p>

                            <button
                                type="button"
                                className="settings-save-btn switch-btn"
                                onClick={() => {
                                    onClose();
                                    if (onSwitchAccount) onSwitchAccount();
                                }}
                            >
                                <i className="fa-solid fa-right-to-bracket"></i> Switch to Another Account
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className="modal-overlay active"
            id="accountOverlay"
            onClick={(e) => {
                if (e.target.id === 'accountOverlay') onClose();
            }}
        >
            <div className="modal settings-window account-modal-window">
                <div className="modal-header">
                    <h2 style={{ userSelect: 'none' }} draggable="false">
                        Account Settings
                    </h2>
                    <button className="closeModal" onClick={onClose} aria-label="Close modal">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="settings-layout">
                    <div className="settings-sidebar">
                        <button
                            type="button"
                            className={`settings-tab ${activeTab === 'information' ? 'active' : ''}`}
                            onClick={() => handleTabClick('information')}
                        >
                            <i className="fa-solid fa-user"></i> Personal Information
                        </button>

                        <button
                            type="button"
                            className={`settings-tab ${activeTab === 'password' ? 'active' : ''}`}
                            onClick={() => handleTabClick('password')}
                        >
                            <i className="fa-solid fa-key"></i> Change Password
                        </button>

                        <button
                            type="button"
                            className={`settings-tab ${activeTab === 'switch' ? 'active' : ''}`}
                            onClick={() => handleTabClick('switch')}
                        >
                            <i className="fa-solid fa-right-left"></i> Switch Account
                        </button>

                        <button
                            type="button"
                            className="settings-tab danger-tab"
                            onClick={() => handleTabClick('signout')}
                        >
                            <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                        </button>
                    </div>

                    <div className="settings-content" id="accountContent">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
