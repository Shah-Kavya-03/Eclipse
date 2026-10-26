import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCog, Shield, Mail, Key, LogOut, CheckCircle2,
  AlertTriangle, Copy, Terminal, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ConfirmModal } from '../components/ui/Modal.jsx';
import { RoleBadge } from '../components/ui/Badges.jsx';

export function AccountPage() {
  const { user, token, logout, isAdmin } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success('Token Copied', 'JWT copied to clipboard.');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Account & Credentials</h1>
          <p className="page-subtitle">
            Authenticated administrator session, security clearance, and access tokens
          </p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setShowLogoutConfirm(true)}>
          <LogOut size={14} /> Log Out
        </button>
      </div>

      {/* Account Info Cards */}
      <div className="row section-gap">
        <div className="col-half">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserCog size={18} color="var(--accent-primary)" />
                <div className="card-title">Administrator Profile</div>
              </div>
              <RoleBadge isAdmin={isAdmin} isFlagged={false} />
            </div>
            <div className="card-body">
              <div className="detail-panel">
                <div className="detail-field">
                  <span className="detail-field-label">Full Name</span>
                  <span className="detail-field-value" style={{ fontWeight: 600 }}>
                    {user?.name || 'Administrator'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Email Address</span>
                  <span className="detail-field-value">{user?.email || '—'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">User ID</span>
                  <span className="detail-field-value mono">{user?.user_id || '—'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Clearance Tier</span>
                  <span className="detail-field-value">
                    <span className="badge badge-primary">Full Administrator</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-half">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Key size={18} color="var(--accent-secondary)" />
                <div className="card-title">Session Authentication</div>
              </div>
              <span className="badge badge-success">Active Session</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                Your session is secured using a HS256-signed JSON Web Token with claims verified by the FastAPI backend.
              </p>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bearer Token</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    onClick={handleCopyToken}
                  >
                    <Copy size={12} /> {copiedToken ? 'Copied!' : 'Copy Token'}
                  </button>
                </div>
                <div
                  className="mono"
                  style={{
                    background: 'var(--bg-input)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-muted)',
                  }}
                >
                  {token ? `${token.slice(0, 36)}…${token.slice(-16)}` : 'No token stored'}
                </div>
              </div>

              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Tokens expire automatically based on the backend's <code>ACCESS_TOKEN_EXPIRE_MINUTES</code> policy.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Role Management Documentation */}
      <div className="card section-gap">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Terminal size={18} color="var(--accent-info)" />
            <div>
              <div className="card-title">Managing Admin Privileges</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Database-level administrator role escalation instructions
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
            To ensure bulletproof access control, the Eclipse platform does not provide public endpoints for granting administrator privileges.
            New accounts created via user signup default to <code>is_admin: false</code>.
          </p>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
            To promote an account or grant administrative access to a team member, run this query in <strong>mongosh</strong>:
          </p>

          <div
            className="mono"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '0.8125rem',
              color: 'var(--accent-info)',
              marginBottom: 16,
              overflowX: 'auto',
            }}
          >
            use llm_guardrail;{'\n'}
            db.users.updateOne({'{ email: "target.user@domain.com" }'}, {'{ $set: { is_admin: true } }'});
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={14} color="var(--accent-success)" />
            <span>Changes take effect immediately upon their subsequent sign-in.</span>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out of Security Console?"
        message="Are you sure you want to end your administrator session? You will need to re-authenticate to access the admin portal."
        confirmLabel="Sign Out"
        danger={true}
      />
    </div>
  );
}
