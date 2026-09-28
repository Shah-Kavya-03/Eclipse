import React, { useState, useEffect } from 'react';

export default function AccountModal({ isOpen, onClose, onOpenSignout }) {
    const [activeTab, setActiveTab] = useState('information');

    useEffect(() => {
        if (isOpen) {
            setActiveTab('information');
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

    const handleTabClick = (tab) => {
        if (tab === 'signout') {
            onClose();
            onOpenSignout();
        } else {
            setActiveTab(tab);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'information':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-id-card"></i>
                        <h2>Personal Information</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'password':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-key"></i>
                        <h2>Change Password</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'switch':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-right-left"></i>
                        <h2>Switch Account</h2>
                        <p>This section is under development.</p>
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
            <div className="modal settings-window">
                <div className="modal-header">
                    <h2 style={{ userSelect: 'none' }} draggable="false">
                        Account
                    </h2>
                    <button className="closeModal" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="settings-layout">
                    <div className="settings-sidebar">
                        <button
                            className={`settings-tab ${
                                activeTab === 'information' ? 'active' : ''
                            }`}
                            style={{ userSelect: 'none' }}
                            draggable="false"
                            onClick={() => handleTabClick('information')}
                        >
                            Personal Information
                        </button>

                        <button
                            className={`settings-tab ${
                                activeTab === 'password' ? 'active' : ''
                            }`}
                            style={{ userSelect: 'none' }}
                            draggable="false"
                            onClick={() => handleTabClick('password')}
                        >
                            Change Password
                        </button>

                        <button
                            className={`settings-tab ${
                                activeTab === 'switch' ? 'active' : ''
                            }`}
                            style={{ userSelect: 'none' }}
                            draggable="false"
                            onClick={() => handleTabClick('switch')}
                        >
                            Switch Account
                        </button>

                        <button
                            className="settings-tab"
                            style={{ userSelect: 'none' }}
                            draggable="false"
                            onClick={() => handleTabClick('signout')}
                        >
                            Sign Out
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
