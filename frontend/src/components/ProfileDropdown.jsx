import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileDropdown({
    isOpen,
    onClose,
    onOpenAccount,
    onOpenSettings,
    onOpenLogout,
    anchorRef
}) {
    const { currentUser } = useAuth();
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
                <div>
                    <h4 id="profileName">{currentUser ? currentUser.name : 'Guest User'}</h4>
                    <small id="profileEmail">
                        {currentUser ? currentUser.email : 'Not Signed In'}
                    </small>
                </div>
            </div>

            <div className="dropdown-divider"></div>

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
