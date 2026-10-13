import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/config';
import { useToast } from '../../context/ToastContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import EclipseLogo from '../EclipseLogo';

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
// Theme Tab
// -------------------------------------------------------
function ThemeTab() {
    const [theme, setTheme] = useState(() => localStorage.getItem('eclipseTheme') || 'dark');

    const handleChange = (val) => {
        setTheme(val);
        localStorage.setItem('eclipseTheme', val);
        applyTheme(val);
        window.dispatchEvent(new Event('eclipse-theme-change'));
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
// AI Provider Tab — Dropdown with supported providers
// -------------------------------------------------------
const SUPPORTED_PROVIDERS = [
    { value: 'gemini',   label: 'Gemini (Default)' },
    { value: 'groq',     label: 'Groq' },
    { value: 'cerebras', label: 'Cerebras' },
    { value: 'nvidia',   label: 'NVIDIA' },
    { value: 'mistral',  label: 'Mistral' },
];

function AIModelTab() {
    const { showToast } = useToast();
    const [settings, setSettings] = useState({ model: '', provider: 'gemini' });
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
                        provider: (data.provider || 'gemini').toLowerCase()
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
            <h2>AI Provider</h2>
            <p className="settings-desc">Choose the AI provider used by the guardrail. The model is managed automatically.</p>

            <div className="settings-form">
                <label className="settings-label">Provider</label>
                <select
                    className="settings-input settings-select"
                    value={settings.provider || 'gemini'}
                    onChange={(e) => setSettings((s) => ({ ...s, provider: e.target.value }))}
                >
                    {SUPPORTED_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                            {p.label}
                        </option>
                    ))}
                </select>

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
// Clear History Tab — Sends user_id to backend
// -------------------------------------------------------
function ClearHistoryTab() {
    const { showToast } = useToast();
    const { clearAllHistory } = useChat();
    const { currentUser, token } = useAuth();
    const [confirming, setConfirming] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleClear = async () => {
        setClearing(true);
        try {
            const success = await clearAllHistory(async () => {
                if (currentUser?.user_id) {
                    const res = await fetch(`${API_BASE}/settings/clear-history`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ user_id: currentUser.user_id })
                    });
                    if (res.ok) {
                        showToast('Chat history cleared.', 'success');
                        return true;
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        showToast(errData.detail || 'Failed to clear history.', 'error');
                        return false;
                    }
                } else {
                    // Guest user: clear local state
                    showToast('Chat history cleared.', 'success');
                    return true;
                }
            });
            if (!success) {
                // handled inside
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
// Guardrail Version Tab — Official Version Info
// -------------------------------------------------------
function GuardrailVersionTab() {
    return (
        <div className="settings-section">
            <div className="version-header-box">
                <EclipseLogo className="version-brand-logo" alt="Eclipse" />
                <div>
                    <h2>Eclipse 1.0</h2>
                    <span className="version-tag">Release v1.0.0 (Production)</span>
                </div>
            </div>

            <p className="settings-desc">
                Eclipse LLM Guardrail provides real-time security shielding for language model interactions.
            </p>

            <div className="version-details-grid">
                <div className="version-item">
                    <span className="version-item-label">Application Version</span>
                    <span className="version-item-val">Eclipse 1.0</span>
                </div>
                <div className="version-item">
                    <span className="version-item-label">Guardrail Engine</span>
                    <span className="version-item-val status-active">
                        <i className="fa-solid fa-circle-check"></i> Multi-layer Protection Active
                    </span>
                </div>
                <div className="version-item">
                    <span className="version-item-label">Prompt Injection Guard</span>
                    <span className="version-item-val status-active">
                        <i className="fa-solid fa-circle-check"></i> Enabled
                    </span>
                </div>
                <div className="version-item">
                    <span className="version-item-label">PII Anonymization Filter</span>
                    <span className="version-item-val status-active">
                        <i className="fa-solid fa-circle-check"></i> Enabled
                    </span>
                </div>
                <div className="version-item">
                    <span className="version-item-label">Harmful Content & Jailbreak Shield</span>
                    <span className="version-item-val status-active">
                        <i className="fa-solid fa-circle-check"></i> Enabled
                    </span>
                </div>
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
                return <GuardrailVersionTab />;
            case 'history':
                return <ClearHistoryTab />;
            case 'theme':
                return <ThemeTab />;
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

                        <div className="settings-heading">Personalization</div>

                        <button
                            className={`settings-tab ${activeTab === 'theme' ? 'active' : ''}`}
                            onClick={() => setActiveTab('theme')}
                        >
                            Theme
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
