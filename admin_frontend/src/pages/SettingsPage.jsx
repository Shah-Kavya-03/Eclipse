import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, Save, Trash2, ShieldAlert,
  Moon, Sun, Laptop, ArrowUp, ArrowDown, RefreshCw, Check
} from 'lucide-react';
import { settingsApi } from '../api/settingsApi.js';
import { usersApi } from '../api/usersApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ConfirmModal } from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';

const DEFAULT_PROVIDERS = ['gemini', 'groq', 'cerebras', 'nvidia', 'mistral'];

export function SettingsPage() {
  const { user } = useAuth();
  const currentUserId = user?.user_id || '';

  const [users, setUsers] = useState([]);
  const [targetUserId, setTargetUserId] = useState(currentUserId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings values
  const [theme, setTheme] = useState('dark');
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [streamResponse, setStreamResponse] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);

  // Clear history state
  const [clearHistoryModal, setClearHistoryModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const toast = useToast();

  // Load registered users so admin can configure for any user or themselves
  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      try {
        const res = await usersApi.listUsers();
        if (!cancelled && res?.users) {
          setUsers(res.users);
          if (!targetUserId && res.users.length > 0) {
            setTargetUserId(res.users[0].user_id);
          }
        }
      } catch {
        // user list failure is non-critical
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSettings = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const data = await settingsApi.getSettings(targetUserId);
      if (data) {
        setTheme(data.theme || 'dark');
        setStreamResponse(data.stream_response ?? true);
        setSaveHistory(data.save_history ?? true);

        const orderStr = data.preferred_provider_order || '';
        const orderArr = orderStr
          .split(',')
          .map((p) => p.trim().toLowerCase())
          .filter(Boolean);

        // merge missing default providers
        const finalArr = [...orderArr];
        for (const dp of DEFAULT_PROVIDERS) {
          if (!finalArr.includes(dp)) finalArr.push(dp);
        }
        setProviders(finalArr);
      }
    } catch (err) {
      toast.error('Settings Load Error', err?.response?.data?.detail || 'Could not fetch preferences.');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, toast]);

  useEffect(() => {
    if (targetUserId) {
      loadSettings();
    }
  }, [targetUserId, loadSettings]);

  // Provider order reordering
  const moveProvider = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= providers.length) return;
    const updated = [...providers];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setProviders(updated);
  };

  // Save updated settings
  const handleSave = async (e) => {
    e.preventDefault();
    if (!targetUserId) {
      toast.warning('User Required', 'Please select a user to update settings.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: targetUserId,
        theme,
        preferred_provider_order: providers.join(','),
        stream_response: streamResponse,
        save_history: saveHistory,
      };
      await settingsApi.updateSettings(payload);
      toast.success('Settings Saved', 'Guardrail operational configuration updated successfully.');
    } catch (err) {
      toast.error('Save Failed', err?.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Clear conversation history
  const handleClearHistory = async () => {
    if (!targetUserId) return;
    setClearing(true);
    try {
      const res = await settingsApi.clearHistory(targetUserId);
      toast.success(
        'History Cleared',
        `Deleted ${res.deleted_count ?? 0} conversation sessions. Audit logs remain preserved per DPDP Act.`
      );
      setClearHistoryModal(false);
    } catch (err) {
      toast.error('Clear Failed', err?.response?.data?.detail || 'Could not clear history.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Guardrail Settings</h1>
          <p className="page-subtitle">
            Configure LLM failover priorities, streaming policies, themes, and storage compliance
          </p>
        </div>
      </div>

      {/* Target User Switcher */}
      <div className="card section-gap" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label className="form-label" htmlFor="settings-user-select" style={{ marginBottom: 6 }}>
              Configuring Preferences For User
            </label>
            <select
              id="settings-user-select"
              className="form-select"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              {targetUserId && !users.find((u) => u.user_id === targetUserId) && (
                <option value={targetUserId}>Current Admin ({targetUserId})</option>
              )}
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name || 'User'} ({u.email}) {u.user_id === currentUserId ? '— [Your Account]' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadSettings}
            disabled={loading}
            style={{ alignSelf: 'flex-end', height: 38 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Reload
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Provider Priority Failover Order */}
        <div className="card section-gap">
          <div className="card-header">
            <div>
              <div className="card-title">LLM Provider Rotation & Fallback Order</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                When a provider hits rate limits or latency thresholds, requests failover sequentially
              </div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {providers.map((p, idx) => (
                <div
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--border-strong)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {p}
                    </span>
                    {idx === 0 && <span className="badge badge-primary">Primary</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 5 }}
                      onClick={() => moveProvider(idx, -1)}
                      disabled={idx === 0}
                      title="Move up priority"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 5 }}
                      onClick={() => moveProvider(idx, 1)}
                      disabled={idx === providers.length - 1}
                      title="Move down priority"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Runtime & Privacy Options */}
        <div className="row section-gap">
          <div className="col-half">
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <div className="card-title">Runtime & Response Policies</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Stream Response Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Stream Responses</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Stream LLM tokens via Server-Sent Events after input guardrail approval
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={streamResponse}
                      onChange={(e) => setStreamResponse(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {/* Save History Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Save Conversation History</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Persist conversational message context into MongoDB
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={saveHistory}
                      onChange={(e) => setSaveHistory(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="col-half">
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <div className="card-title">UI Theme Preference</div>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Theme Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { id: 'dark', label: 'Dark Mode', icon: Moon },
                      { id: 'light', label: 'Light Mode', icon: Sun },
                      { id: 'system', label: 'System Default', icon: Laptop },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = theme === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '14px 10px', flexDirection: 'column', gap: 6 }}
                          onClick={() => setTheme(item.id)}
                        >
                          <Icon size={18} />
                          <span style={{ fontSize: '0.75rem' }}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving Changes…' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="card" style={{ border: '1px solid var(--accent-danger)' }}>
        <div className="card-header" style={{ borderBottomColor: 'rgba(255,100,124,.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={18} color="var(--accent-danger)" />
            <div className="card-title" style={{ color: 'var(--accent-danger)' }}>
              Compliance Danger Zone
            </div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Clear Conversation Records</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 540 }}>
                Deletes all chat message histories for this user.
                Per DPDP Act 2023 regulations, security audit records in the <code>audit_logs</code> collection
                remain preserved for compliance auditing.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setClearHistoryModal(true)}
            >
              <Trash2 size={14} /> Clear User History
            </button>
          </div>
        </div>
      </div>

      {/* Clear History Confirmation Modal */}
      <ConfirmModal
        open={clearHistoryModal}
        onClose={() => setClearHistoryModal(false)}
        onConfirm={handleClearHistory}
        title="Clear All User Conversations?"
        message={`This action will permanently delete all conversation documents for user ID "${targetUserId}". Audit logs will remain retained for compliance.`}
        confirmLabel="Confirm Deletion"
        danger={true}
        loading={clearing}
      />
    </div>
  );
}
