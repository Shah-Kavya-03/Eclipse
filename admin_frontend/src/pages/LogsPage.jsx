import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ScrollText, Search, RefreshCw, Filter, FileDown,
  AlertTriangle, Shield, CheckCircle, Info, Eye
} from 'lucide-react';
import { logsApi } from '../api/logsApi.js';
import { reportsApi } from '../api/reportsApi.js';
import { DataTable } from '../components/tables/DataTable.jsx';
import { StatusBadge, TierBadge } from '../components/ui/Badges.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { formatDateTime, truncate, downloadBlob } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [limit, setLimit] = useState(200);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await logsApi.getLogs({ limit });
      setLogs(res?.logs || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch audit logs.';
      setError(msg);
      toast.error('Audit Logs Error', msg);
    } finally {
      setLoading(false);
    }
  }, [limit, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDownloadSessionReport = async (sessionId) => {
    if (!sessionId) return;
    setDownloadingReport(true);
    try {
      const { blob, filename } = await reportsApi.downloadReport('session', sessionId);
      downloadBlob(blob, filename);
      toast.success('Report Downloaded', `Saved ${filename}`);
    } catch (err) {
      toast.error('Download Failed', err?.response?.data?.detail || 'Could not generate session PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (log.prompt_masked || '').toLowerCase().includes(q) ||
        (log.response || '').toLowerCase().includes(q) ||
        (log.session_id || '').toLowerCase().includes(q) ||
        (log.title || '').toLowerCase().includes(q) ||
        (log.user_id || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (tierFilter !== 'all' && String(log.threat_tier) !== tierFilter) return false;
      if (providerFilter !== 'all' && (log.api_used || '').toLowerCase() !== providerFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [logs, search, statusFilter, tierFilter, providerFilter]);

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (ts) => formatDateTime(ts),
    },
    {
      key: 'status',
      label: 'Guardrail Verdict',
      sortable: true,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      key: 'threat_tier',
      label: 'Severity',
      sortable: true,
      render: (tier) => <TierBadge tier={tier} />,
    },
    {
      key: 'prompt_masked',
      label: 'Sanitized Prompt Preview',
      render: (txt, row) => (
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
            {truncate(txt, 70)}
          </div>
          {row.title && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Session: {row.title}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'model_used',
      label: 'Model / API',
      sortable: true,
      render: (model, row) => (
        <div>
          <div style={{ fontSize: '0.8125rem' }}>{model || '—'}</div>
          {row.api_used && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              via {row.api_used.toUpperCase()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'session_id',
      label: 'Session ID',
      render: (sid) => (
        <span className="mono" style={{ fontSize: '0.75rem' }}>
          {sid ? sid.slice(0, 10) + '…' : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Details',
      render: (_, row) => (
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px 8px' }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
        >
          <Eye size={13} /> View
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Logs & Compliance Audit</h1>
          <p className="page-subtitle">
            Immutable DPDP Act 2023 compliant audit logs, threat inspection records, and prompt telemetry
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-row section-gap">
        <div className="search-bar" style={{ minWidth: 260, flex: 1 }}>
          <Search className="search-bar-icon" size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search prompt, response, session, or user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Verdicts</option>
          <option value="Safe">Safe</option>
          <option value="PII Detected">PII Detected</option>
          <option value="Prompt Injection">Prompt Injection</option>
          <option value="Harmful">Harmful</option>
          <option value="Jailbreak">Jailbreak</option>
          <option value="Modified">Modified</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 120 }}
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="all">All Tiers</option>
          <option value="1">Tier 1 (Low)</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3 (Med)</option>
          <option value="4">Tier 4 (High)</option>
          <option value="5">Tier 5 (Crit)</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 130 }}
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <option value="all">All Providers</option>
          <option value="gemini">Gemini</option>
          <option value="groq">Groq</option>
          <option value="cerebras">Cerebras</option>
          <option value="nvidia">Nvidia</option>
          <option value="mistral">Mistral</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 110 }}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          <option value={50}>50 logs</option>
          <option value={100}>100 logs</option>
          <option value={200}>200 logs</option>
          <option value={500}>500 logs</option>
          <option value={1000}>1000 logs</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={filteredLogs}
            loading={loading}
            error={error}
            onRetry={fetchLogs}
            onRowClick={(row) => setSelectedLog(row)}
            emptyTitle="No audit records match your filters"
            emptyDesc="Try clearing your search terms or broadening the status/tier filters."
            initialPageSize={25}
          />
        </div>
      </div>

      {/* Audit Log Detail Modal */}
      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Inspection Record"
        maxWidth={700}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {selectedLog?.session_id && (
              <button
                className="btn btn-secondary"
                onClick={() => handleDownloadSessionReport(selectedLog.session_id)}
                disabled={downloadingReport}
              >
                <FileDown size={14} /> Download PDF Session Report
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setSelectedLog(null)}>
              Close
            </button>
          </div>
        }
      >
        {selectedLog && (
          <div>
            {/* Top metadata grid */}
            <div className="detail-panel" style={{ marginBottom: 16 }}>
              <div className="detail-field">
                <span className="detail-field-label">Log ID</span>
                <span className="detail-field-value mono">{selectedLog.id}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Timestamp</span>
                <span className="detail-field-value">{formatDateTime(selectedLog.timestamp)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Guardrail Verdict</span>
                <span className="detail-field-value">
                  <StatusBadge status={selectedLog.status} />
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Threat Severity</span>
                <span className="detail-field-value">
                  <TierBadge tier={selectedLog.threat_tier} />
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Session ID</span>
                <span className="detail-field-value mono">{selectedLog.session_id || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">User ID</span>
                <span className="detail-field-value mono">{selectedLog.user_id || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Model & API</span>
                <span className="detail-field-value">
                  {selectedLog.model_used || '—'} {selectedLog.api_used && `(${selectedLog.api_used.toUpperCase()})`}
                </span>
              </div>
            </div>

            {/* Sanitized Prompt */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Sanitized / Masked Prompt
              </div>
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  maxHeight: 180,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedLog.prompt_masked || '(Empty prompt)'}
              </div>
            </div>

            {/* LLM Response */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                LLM Response
              </div>
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  maxHeight: 180,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedLog.response || '(No response recorded)'}
              </div>
            </div>

            {/* LIME Explanation if available */}
            {selectedLog.lime_explanation && (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  LIME Security Explanation
                </div>
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    fontSize: '0.8125rem',
                    color: 'var(--accent-info)',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: 140,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {typeof selectedLog.lime_explanation === 'object'
                    ? JSON.stringify(selectedLog.lime_explanation, null, 2)
                    : selectedLog.lime_explanation}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
