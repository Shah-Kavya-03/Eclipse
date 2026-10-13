import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun, Laptop } from 'lucide-react';
import { healthApi } from '../../api/healthApi.js';
import { useTheme } from '../../context/ThemeContext.jsx';

const ROUTE_META = {
  '/admin':              { title: 'Overview',             breadcrumb: ['Dashboard'] },
  '/admin/users':        { title: 'Users',                breadcrumb: ['Dashboard', 'Users'] },
  '/admin/conversations':{ title: 'Conversations',        breadcrumb: ['Dashboard', 'Conversations'] },
  '/admin/analytics':    { title: 'Guardrail Analytics',  breadcrumb: ['Dashboard', 'Analytics'] },
  '/admin/anomalies':    { title: 'Anomalies',            breadcrumb: ['Dashboard', 'Anomalies'] },
  '/admin/logs':         { title: 'Logs & Audit',         breadcrumb: ['Dashboard', 'Logs'] },
  '/admin/reports':      { title: 'Reports',              breadcrumb: ['Dashboard', 'Reports'] },
  '/admin/settings':     { title: 'Settings',             breadcrumb: ['Dashboard', 'Settings'] },
  '/admin/system-health':{ title: 'System Health',        breadcrumb: ['Dashboard', 'System Health'] },
  '/admin/account':      { title: 'Admin Account',        breadcrumb: ['Dashboard', 'Account'] },
};

export function Header({ children }) {
  const location = useLocation();
  const meta     = ROUTE_META[location.pathname] || { title: 'Eclipse Admin', breadcrumb: ['Dashboard'] };
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();

  const [apiStatus, setApiStatus] = useState('loading'); // 'loading' | 'ok' | 'error'

  const toggleTheme = () => {
    if (themePreference === 'dark') setThemePreference('light');
    else if (themePreference === 'light') setThemePreference('system');
    else setThemePreference('dark');
  };

  const themeLabel = themePreference === 'system'
    ? `System (${resolvedTheme})`
    : themePreference.charAt(0).toUpperCase() + themePreference.slice(1);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await healthApi.checkPythonBackend();
        if (!cancelled) setApiStatus('ok');
      } catch {
        if (!cancelled) setApiStatus('error');
      }
    };
    check();
    const interval = setInterval(check, 30000); // re-check every 30s
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const statusLabel = { loading: 'Checking…', ok: 'API Online', error: 'API Offline' }[apiStatus];

  return (
    <header className="header">
      <div className="header-left">
        <div>
          <div className="header-breadcrumb">
            {meta.breadcrumb.map((b, i) => (
              <React.Fragment key={b}>
                {i > 0 && <span className="header-breadcrumb-sep">›</span>}
                <span>{b}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="header-title">{meta.title}</div>
        </div>
      </div>
      <div className="header-right">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={toggleTheme}
          title={`Active Theme: ${themeLabel} — Click to switch`}
          aria-label="Toggle theme"
          style={{
            padding: '5px 10px',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 'var(--radius-full)',
          }}
        >
          {themePreference === 'system' ? <Laptop size={14} /> : resolvedTheme === 'light' ? <Sun size={14} /> : <Moon size={14} />}
          <span style={{ fontWeight: 500 }}>{themeLabel}</span>
        </button>

        <div className={`api-status ${apiStatus}`} title="Python backend health check">
          <div className="api-status-dot" />
          {statusLabel}
        </div>
        {children}
      </div>
    </header>
  );
}
