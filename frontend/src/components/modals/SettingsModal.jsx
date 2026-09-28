import React, { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('model');

    useEffect(() => {
        if (isOpen) {
            setActiveTab('model');
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

    const renderContent = () => {
        switch (activeTab) {
            case 'model':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-robot"></i>
                        <h2>AI Model</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'version':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-shield-halved"></i>
                        <h2>Guardrail Version</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'history':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-trash"></i>
                        <h2>Clear Chat History</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'highlight':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <h2>Highlight Suspicious Content</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'theme':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-moon"></i>
                        <h2>Theme</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'accent':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-palette"></i>
                        <h2>Accent Colour</h2>
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
            id="settingsOverlay"
            onClick={(e) => {
                if (e.target.id === 'settingsOverlay') onClose();
            }}
        >
            <div className="modal settings-window">
                <div className="modal-header">
                    <h2 style={{ userSelect: 'none' }} draggable="false">
                        Settings
                    </h2>
                    <button className="closeModal" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="settings-layout">
                    <div className="settings-sidebar">
                        <div className="settings-heading">General</div>

                        <button
                            className={`settings-tab ${activeTab === 'model' ? 'active' : ''}`}
                            onClick={() => setActiveTab('model')}
                        >
                            AI Model
                        </button>

                        <button
                            className={`settings-tab ${activeTab === 'version' ? 'active' : ''}`}
                            onClick={() => setActiveTab('version')}
                        >
                            Guardrail Version
                        </button>

                        <button
                            className={`settings-tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            Clear Chat History
                        </button>

                        <div className="settings-heading">Security</div>

                        <button
                            className={`settings-tab ${activeTab === 'highlight' ? 'active' : ''}`}
                            onClick={() => setActiveTab('highlight')}
                        >
                            Highlight Suspicious Content
                        </button>

                        <div className="settings-heading">Personalization</div>

                        <button
                            className={`settings-tab ${activeTab === 'theme' ? 'active' : ''}`}
                            onClick={() => setActiveTab('theme')}
                        >
                            Theme
                        </button>

                        <button
                            className={`settings-tab ${activeTab === 'accent' ? 'active' : ''}`}
                            onClick={() => setActiveTab('accent')}
                        >
                            Accent Colour
                        </button>
                    </div>

                    <div className="settings-content" id="settingsContent">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
