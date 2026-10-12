import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { healthApi } from '../../api/healthApi.js';

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

  const [apiStatus, setApiStatus] = useState('loading'); // 'loading' | 'ok' | 'error'

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
        <div className={`api-status ${apiStatus}`} title="Python backend health check">
          <div className="api-status-dot" />
          {statusLabel}
        </div>
        {children}
      </div>
    </header>
  );
}
