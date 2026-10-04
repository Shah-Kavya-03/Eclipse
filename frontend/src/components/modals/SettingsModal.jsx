import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/config';
import { useToast } from '../../context/ToastContext';
import { useChat } from '../../context/ChatContext';

// -------------------------------------------------------
// Theme helpers
// -------------------------------------------------------
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
        root.removeAttribute('data-theme');
    } else {
        // system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', 'light');
        }
    }
}

// -------------------------------------------------------
// Theme Tab — Bug 6
// -------------------------------------------------------
function ThemeTab() {
    const [theme, setTheme] = useState(() => localStorage.getItem('eclipseTheme') || 'dark');

    const handleChange = (val) => {
        setTheme(val);
        localStorage.setItem('eclipseTheme', val);
        applyTheme(val);
    };

    return (
        <div className="settings-section">
            <i className="fa-solid fa-moon settings-section-icon"></i>
            <h2>Theme</h2>
            <p className="settings-desc">Choose your preferred colour scheme.</p>

            <div className="theme-options">
                {[
                    { value: 'dark',   label: 'Dark',   icon: 'fa-moon'   },
                    { value: 'light',  label: 'Light',  icon: 'fa-sun'    },
                    { value: 'system', label: 'System', icon: 'fa-desktop' },
                ].map(({ value, label, icon }) => (
                    <button
                        key={value}
                        className={`theme-option ${theme === value ? 'active' : ''}`}
                        onClick={() => handleChange(value)}
                    >
                        <i className={`fa-solid ${icon}`}></i>
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// -------------------------------------------------------
// AI Provider Tab — Bug 5: Provider only, model hidden
// -------------------------------------------------------
function AIModelTab() {
    const { showToast } = useToast();
    const [settings, setSettings] = useState({ model: '', provider: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/settings`);
                if (res.ok) {
                    const data = await res.json();
                    setSettings({
                        model: data.model || '',
                        provider: data.provider || ''
                    });
                }
            } catch (err) {
                console.warn('Could not load settings:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Bug 5: send both provider + existing model value (unchanged model)
            const res = await fetch(`${API_BASE}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                showToast('Settings saved.', 'success');
            } else {
                showToast('Failed to save settings.', 'error');
            }
        } catch (err) {
            showToast('Could not reach the server.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-placeholder">
                <i className="fa-solid fa-robot"></i>
                <h2>AI Provider</h2>
                <p>Loading…</p>
            </div>
        );
    }

    return (
        <div className="settings-section">
            <i className="fa-solid fa-robot settings-section-icon"></i>
            {/* Bug 5: renamed from "AI Model" to "AI Provider" */}
            <h2>AI Provider</h2>
            <p className="settings-desc">Choose the AI provider used by the guardrail. The model is managed automatically.</p>

            <div className="settings-form">
                <label className="settings-label">Provider</label>
                <input
                    className="settings-input"
                    type="text"
                    placeholder="e.g. google, openai"
                    value={settings.provider}
                    onChange={(e) => setSettings((s) => ({ ...s, provider: e.target.value }))}
                />
                {/* Bug 5: Model input removed — model is decided by backend, not user.
                    The model value is preserved internally and sent back unchanged on save. */}

                <button
                    className="settings-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

// -------------------------------------------------------
// Clear History Tab — Bug 4: wired to ChatContext.clearAllHistory
// -------------------------------------------------------
function ClearHistoryTab() {
    const { showToast } = useToast();
    const { clearAllHistory } = useChat();
    const [confirming, setConfirming] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleClear = async () => {
        setClearing(true);
        try {
            // Bug 4: pass the API call as callback so ChatContext can clear state on success
            const success = await clearAllHistory(async () => {
                const res = await fetch(`${API_BASE}/settings/clear-history`, { method: 'POST' });
                if (res.ok) {
                    showToast('Chat history cleared.', 'success');
                    return true;
                } else {
                    showToast('Failed to clear history.', 'error');
                    return false;
                }
            });
            if (!success) {
                // showToast already called inside; no extra action needed
            }
        } catch (err) {
            showToast('Could not reach the server.', 'error');
        } finally {
            setClearing(false);
            setConfirming(false);
        }
    };

    return (
        <div className="settings-section">
            <i className="fa-solid fa-trash settings-section-icon"></i>
            <h2>Clear Chat History</h2>
            <p className="settings-desc">
                Permanently delete all your chat history from the server. This action cannot be undone.
            </p>

            {!confirming ? (
                <button
                    className="settings-danger-btn"
                    onClick={() => setConfirming(true)}
                >
                    <i className="fa-solid fa-trash"></i>
                    Clear All History
                </button>
            ) : (
                <div className="confirm-panel">
                    <p className="confirm-text">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        Are you sure? This will permanently delete all saved conversations.
                    </p>
                    <div className="confirm-actions">
                        <button
                            className="rename-cancel"
                            onClick={() => setConfirming(false)}
                            disabled={clearing}
                        >
                            Cancel
                        </button>
                        <button
                            className="settings-danger-btn"
                            onClick={handleClear}
                            disabled={clearing}
                        >
                            {clearing ? 'Clearing…' : 'Yes, Clear Everything'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// -------------------------------------------------------
// Highlight Suspicious Content Tab — Bug 7
// -------------------------------------------------------
function HighlightSuspiciousTab() {
    return (
        <div className="settings-section">
            <i className="fa-solid fa-triangle-exclamation settings-section-icon"></i>
            <h2>Highlight Suspicious Content</h2>
            <p className="settings-desc">
                When the guardrail detects suspicious or flagged content in an AI response, it will be
                highlighted directly in the chat. This uses data already provided by the backend — no
                additional configuration needed.
            </p>
            <div className="settings-info-box">
                <i className="fa-solid fa-circle-info"></i>
                <span>
                    Suspicious content highlighting is <strong>automatically active</strong>. When the backend
                    flags content (threat category, suspicious spans, etc.), those messages will display a
                    visual indicator in the chat area.
                </span>
            </div>
        </div>
    );
}

// -------------------------------------------------------
// Main SettingsModal
// -------------------------------------------------------
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
                return <AIModelTab />;
            case 'version':
                return (
                    <div className="settings-placeholder">
                        <i className="fa-solid fa-shield-halved"></i>
                        <h2>Guardrail Version</h2>
                        <p>This section is under development.</p>
                    </div>
                );
            case 'history':
                return <ClearHistoryTab />;
            case 'highlight':
                return <HighlightSuspiciousTab />;
            case 'theme':
                return <ThemeTab />;
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

                        {/* Bug 5: tab label changed to "AI Provider" */}
                        <button
                            className={`settings-tab ${activeTab === 'model' ? 'active' : ''}`}
                            onClick={() => setActiveTab('model')}
                        >
                            AI Provider
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
