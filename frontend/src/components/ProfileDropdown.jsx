import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileDropdown({
    isOpen,
    onClose,
    onOpenAccount,
    onOpenChangePassword,
    onOpenSwitchAccount,
    onOpenSettings,
    onOpenLogout,
    anchorRef
}) {
    const { currentUser, authToken } = useAuth();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                anchorRef?.current &&
                !anchorRef.current.contains(e.target)
            ) {
                onClose();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    return (
        <div
            className="profile-dropdown active"
            id="profileDropdown"
            ref={dropdownRef}
        >
            <div className="profile-header">
                <div className="profile-avatar">
                    <i className="fa-solid fa-user"></i>
                </div>
                <div className="profile-user-info">
                    <h4 id="profileName">{currentUser ? currentUser.name : 'Guest User'}</h4>
                    <small id="profileEmail">
                        {currentUser ? currentUser.email : 'Not Signed In'}
                    </small>
                </div>
            </div>

            <div className="dropdown-divider"></div>

            {currentUser?.is_admin && (
                <button
                    className="dropdown-item"
                    id="adminDashboardBtn"
                    style={{ color: '#8B7CFF', fontWeight: 600 }}
                    onClick={() => {
                        onClose();
                        const hostname = window.location.hostname || 'localhost';
                        const baseUrl = `http://${hostname}:5174/admin`;
                        let url = baseUrl;
                        if (currentUser?.is_admin) {
                            try {
                                document.cookie = 'eclipse_logged_out=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                                document.cookie = 'eclipse_logged_out=; path=/admin; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                            } catch {}
                            const token = localStorage.getItem('eclipse_admin_token') || authToken;
                            const currentTheme = localStorage.getItem(`eclipseTheme_${currentUser.user_id}`) || localStorage.getItem('eclipseTheme') || 'dark';
                            const payload = encodeURIComponent(JSON.stringify({ token, user: currentUser, theme: currentTheme }));
                            url = `${baseUrl}#session=${payload}`;
                            try {
                                document.cookie = `eclipse_admin_shared=${payload}; path=/; max-age=604800; SameSite=Lax`;
                            } catch {}
                        }
                        window.location.href = url;
                    }}
                >
                    <i className="fa-solid fa-shield-halved" style={{ color: '#8B7CFF' }}></i>
                    Admin Dashboard
                </button>
            )}

            <button
                className="dropdown-item"
                id="accountBtn"
                onClick={() => {
                    onClose();
                    onOpenAccount();
                }}
            >
                <i className="fa-solid fa-user"></i>
                Account
            </button>

            <button
                className="dropdown-item"
                id="settingsBtn"
                onClick={() => {
                    onClose();
                    onOpenSettings();
                }}
            >
                <i className="fa-solid fa-gear"></i>
                Settings
            </button>

            <div className="dropdown-divider"></div>

            <button
                className="dropdown-item logout"
                id="logoutButton"
                onClick={() => {
                    onClose();
                    onOpenLogout();
                }}
            >
                <i className="fa-solid fa-right-from-bracket"></i>
                Log Out
            </button>
        </div>
    );
}
