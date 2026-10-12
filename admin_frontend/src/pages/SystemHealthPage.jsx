import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Server, Database, Cpu, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, Clock, ShieldCheck, Zap
} from 'lucide-react';
import { healthApi } from '../api/healthApi.js';
import { dashboardApi } from '../api/dashboardApi.js';
import { formatDateTime, formatNumber } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function SystemHealthPage() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  // Health states
  const [pyHealth, setPyHealth] = useState({ status: 'unknown', latency: 0, data: null, error: null });
  const [nodeHealth, setNodeHealth] = useState({ status: 'unknown', latency: 0, data: null, error: null });
  const [providers, setProviders] = useState([]);

  const toast = useToast();

  const runDiagnostics = useCallback(async (isManual = false) => {
    if (isManual) setChecking(true);
    else setLoading(true);

    const now = new Date();

    // 1. Python check
    const pyStart = performance.now();
    let pyState = { status: 'down', latency: 0, data: null, error: null };
    try {
      const data = await healthApi.checkPythonBackend();
      const pyLatency = Math.round(performance.now() - pyStart);
      pyState = { status: data?.status === 'ok' ? 'up' : 'degraded', latency: pyLatency, data, error: null };
    } catch (err) {
      pyState = {
        status: 'down',
        latency: Math.round(performance.now() - pyStart),
        data: null,
        error: err?.message || 'Connection refused',
      };
    }

    // 2. Node check
    const nodeStart = performance.now();
    let nodeState = { status: 'down', latency: 0, data: null, error: null };
    try {
      const data = await healthApi.checkNodeServer();
      const nodeLatency = Math.round(performance.now() - nodeStart);
      nodeState = { status: data?.status === 'healthy' ? 'up' : 'degraded', latency: nodeLatency, data, error: null };
    } catch (err) {
      nodeState = {
        status: 'down',
        latency: Math.round(performance.now() - nodeStart),
        data: null,
        error: err?.message || 'Connection refused',
      };
    }

    // 3. Provider statuses via dashboard stats
    try {
      const stats = await dashboardApi.getDashboardStats();
      const usage = stats?.api_usage_breakdown || {};
      const list = Object.entries(usage).map(([name, val]) => ({
        name: name.toUpperCase(),
        requests: val.requests ?? 0,
        tokens: val.tokens ?? 0,
        isRateLimited: val.is_rate_limited ?? false,
      }));
      setProviders(list);
    } catch {
      // Provider stats could fail if backend is down
    }

    setPyHealth(pyState);
    setNodeHealth(nodeState);
    setLastCheck(now);
    setLoading(false);
    setChecking(false);

    if (isManual) {
      toast.success('Diagnostics Complete', 'Refreshed system connectivity and health status.');
    }
  }, [toast]);

  useEffect(() => {
    runDiagnostics();
    const interval = setInterval(() => runDiagnostics(), 30000);
    return () => clearInterval(interval);
  }, [runDiagnostics]);

  const mongoConnected = pyHealth.data?.database === 'connected';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Health & Diagnostics</h1>
          <p className="page-subtitle">
            Infrastructure availability, microservice heartbeats, database status, and LLM provider latency
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastCheck && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Last checked: {lastCheck.toLocaleTimeString()}
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => runDiagnostics(true)}
            disabled={checking}
          >
            <RefreshCw size={14} className={checking ? 'spin' : ''} />
            {checking ? 'Pinging…' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* Primary Infrastructure Services */}
      <div className="row section-gap">
        {/* Python Backend Service Card */}
        <div className="col-third">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Server size={18} color="var(--accent-primary)" />
                <div className="card-title">Python FastAPI Core</div>
              </div>
              <span className={`badge ${pyHealth.status === 'up' ? 'badge-success' : 'badge-danger'}`}>
                {pyHealth.status === 'up' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="card-body">
              <div className="detail-panel">
                <div className="detail-field">
                  <span className="detail-field-label">Port / Target</span>
                  <span className="detail-field-value mono">8001 (/health)</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Round-Trip Latency</span>
                  <span className="detail-field-value">
                    {pyHealth.status === 'up' ? `${pyHealth.latency} ms` : '—'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Service Role</span>
                  <span className="detail-field-value">Guardrail Rules, ML, Auth</span>
                </div>
                {pyHealth.error && (
                  <div className="detail-field">
                    <span className="detail-field-label">Error</span>
                    <span className="detail-field-value" style={{ color: 'var(--accent-danger)' }}>
                      {pyHealth.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Node.js Gateway Card */}
        <div className="col-third">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={18} color="var(--accent-secondary)" />
                <div className="card-title">Node.js Express Gateway</div>
              </div>
              <span className={`badge ${nodeHealth.status === 'up' ? 'badge-success' : 'badge-danger'}`}>
                {nodeHealth.status === 'up' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="card-body">
              <div className="detail-panel">
                <div className="detail-field">
                  <span className="detail-field-label">Port / Target</span>
                  <span className="detail-field-value mono">5000 (/health)</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Round-Trip Latency</span>
                  <span className="detail-field-value">
                    {nodeHealth.status === 'up' ? `${nodeHealth.latency} ms` : '—'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Version</span>
                  <span className="detail-field-value">{nodeHealth.data?.version || '2.0.0'}</span>
                </div>
                {nodeHealth.error && (
                  <div className="detail-field">
                    <span className="detail-field-label">Error</span>
                    <span className="detail-field-value" style={{ color: 'var(--accent-danger)' }}>
                      {nodeHealth.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MongoDB Connection Card */}
        <div className="col-third">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={18} color="var(--accent-success)" />
                <div className="card-title">MongoDB Database</div>
              </div>
              <span className={`badge ${mongoConnected ? 'badge-success' : 'badge-danger'}`}>
                {mongoConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="card-body">
              <div className="detail-panel">
                <div className="detail-field">
                  <span className="detail-field-label">Database Name</span>
                  <span className="detail-field-value mono">llm_guardrail</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Collections</span>
                  <span className="detail-field-value">users, audit_logs, conversations, anomalies, settings</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Health Ping</span>
                  <span className="detail-field-value">
                    {mongoConnected ? 'Verified via backend ping' : 'No connection reported'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LLM Provider Status Grid */}
      <div className="card section-gap">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} color="var(--accent-info)" />
            <div>
              <div className="card-title">LLM Provider Status & Rate Limits</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Real-time rate-limit indicators and processed request volume per provider
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {providers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              No provider telemetry available yet. Prompts must be routed through the guardrail to initialize provider usage.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {providers.map((p) => (
                <div
                  key={p.name}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{p.name}</span>
                    <span className={`badge ${p.isRateLimited ? 'badge-danger' : 'badge-success'}`}>
                      {p.isRateLimited ? 'Rate Limited' : 'Operational'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Requests:</span>
                      <span style={{ fontWeight: 600 }}>{formatNumber(p.requests)}</span>
                    </div>
                    {p.tokens > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tokens:</span>
                        <span style={{ fontWeight: 600 }}>{formatNumber(p.tokens)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Network Configuration Summary */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Zap size={18} color="var(--accent-warning)" />
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Active Base URLs & Endpoints</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Python Backend URL: </span>
            <code className="mono">{import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8001'}</code>
          </div>
          <div style={{ fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Node.js Gateway URL: </span>
            <code className="mono">{import.meta.env.VITE_NODE_API_URL || 'http://localhost:5000'}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
