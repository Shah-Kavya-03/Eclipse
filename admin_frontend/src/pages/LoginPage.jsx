import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function LoginPage() {
  const { login, isAuthenticated, isAdmin, loading, error } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAdminHint, setShowAdminHint] = useState(false);

  // If already logged in as admin, redirect to /admin
  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.warning('Input Required', 'Please enter both email and password.');
      return;
    }

    const success = await login(email.trim(), password);
    if (success) {
      toast.success('Welcome Back', 'Successfully authenticated as administrator.');
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: 16,
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Shield size={26} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Eclipse Admin
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            LLM Guardrail & Security Operations Center
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: 'var(--accent-danger-bg)',
              border: '1px solid var(--accent-danger)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 20,
              fontSize: '0.8125rem',
              color: 'var(--accent-danger)',
            }}
            role="alert"
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Authentication Error</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">Admin Email</label>
            <div className="search-bar">
              <Mail className="search-bar-icon" size={16} />
              <input
                id="admin-email"
                type="email"
                className="form-input"
                placeholder="admin@eclipse.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Password</label>
            <div className="search-bar">
              <Lock className="search-bar-icon" size={16} />
              <input
                id="admin-password"
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ marginTop: 8, width: '100%' }}
            disabled={loading}
          >
            {loading ? (
              'Authenticating…'
            ) : (
              <>
                Sign In to Security Console <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* First-time Admin Helper */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAdminHint((h) => !h)}
            style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
          >
            <Info size={13} /> {showAdminHint ? 'Hide Setup Note' : 'First-time setup info'}
          </button>

          {showAdminHint && (
            <div
              style={{
                marginTop: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'left',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Enabling Administrator Privileges
              </div>
              <p style={{ marginBottom: 6 }}>
                By design, user signups do not grant admin rights. To promote an existing account, execute this command in MongoDB:
              </p>
              <code className="mono" style={{ display: 'block', padding: 8, fontSize: '0.7rem' }}>
                db.users.updateOne(&#123; email: "your@email.com" &#125;, &#123; $set: &#123; is_admin: true &#125; &#125;)
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
