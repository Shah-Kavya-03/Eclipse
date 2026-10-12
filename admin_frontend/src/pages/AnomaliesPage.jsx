import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ShieldAlert, Cpu, RefreshCw, Play,
  MessageSquare, FileDown, Search, CheckCircle, Info
} from 'lucide-react';
import { anomaliesApi } from '../api/anomaliesApi.js';
import { reportsApi } from '../api/reportsApi.js';
import { DataTable } from '../components/tables/DataTable.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { MetricCard } from '../components/charts/Charts.jsx';
import { formatDateTime, timeAgo, downloadBlob, formatNumber } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningDetection, setRunningDetection] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await anomaliesApi.listAdminAnomalies();
      setAnomalies(res?.anomalies || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch persisted anomalies.';
      setError(msg);
      toast.error('Anomalies Load Error', msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // Trigger Isolation Forest detection on backend
  const handleRunDetection = async () => {
    setRunningDetection(true);
    try {
      const res = await anomaliesApi.runDetection();
      if (res.message) {
        toast.info('Detection Status', res.message);
      } else {
        const found = res?.count ?? res?.anomalies?.length ?? 0;
        toast.success(
          'Detection Completed',
          `Analyzed ${res.sessions_analyzed || 0} sessions, identified ${found} anomalous patterns.`
        );
      }
      // Reload persisted anomalies list
      await fetchAnomalies();
    } catch (err) {
      toast.error('Detection Failed', err?.response?.data?.detail || 'Could not run Isolation Forest detection.');
    } finally {
      setRunningDetection(false);
    }
  };

  // Download PDF Report for session
  const handleDownloadReport = async (sessionId) => {
    setDownloadingReport(true);
    try {
      const { blob, filename } = await reportsApi.downloadReport('session', sessionId);
      downloadBlob(blob, filename);
      toast.success('Report Downloaded', `Saved ${filename}`);
    } catch (err) {
      toast.error('Download Failed', err?.response?.data?.detail || 'Could not generate report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const filtered = anomalies.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.session_id || '').toLowerCase().includes(q) ||
      (a.user_id || '').toLowerCase().includes(q) ||
      (a.reason || '').toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      key: 'session_id',
      label: 'Session ID',
      sortable: true,
      render: (sid) => (
        <span className="mono" style={{ fontWeight: 600 }}>
          {sid || '—'}
        </span>
      ),
    },
    {
      key: 'user_id',
      label: 'User ID',
      sortable: true,
      render: (uid) => (
        <span className="mono" style={{ color: 'var(--text-secondary)' }}>
          {uid || '—'}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Detection Reason (Isolation Forest)',
      sortable: true,
      render: (reason) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} color="var(--accent-warning)" style={{ flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)' }}>{reason || 'Unusual behavioral pattern'}</span>
        </div>
      ),
    },
    {
      key: 'flagged_at',
      label: 'Detected',
      sortable: true,
      render: (iso) => (
        <div>
          <div>{formatDateTime(iso)}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{timeAgo(iso)}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Download PDF session report"
            onClick={() => handleDownloadReport(row.session_id)}
            disabled={downloadingReport}
          >
            <FileDown size={13} /> PDF
          </button>
          {row.user_id && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              title="Inspect user conversations"
              onClick={() => navigate(`/admin/conversations?userId=${row.user_id}`)}
            >
              <MessageSquare size={13} /> Chat
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Anomaly Detection</h1>
          <p className="page-subtitle">
            Machine-learning behavioral outlier detection powered by scikit-learn Isolation Forest
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchAnomalies}
            disabled={loading || runningDetection}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunDetection}
            disabled={runningDetection}
          >
            <Play size={14} className={runningDetection ? 'spin' : ''} />
            {runningDetection ? 'Running Detector…' : 'Run ML Detection'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metric-grid section-gap">
        <MetricCard
          label="Flagged Anomalies"
          value={formatNumber(anomalies.length)}
          icon={AlertTriangle}
          iconColor="var(--accent-warning)"
          iconBg="var(--accent-warning-bg)"
          sub="Persisted in database"
        />
        <MetricCard
          label="Detection Algorithm"
          value="Isolation Forest"
          icon={Cpu}
          iconColor="var(--accent-primary)"
          iconBg="var(--accent-primary-bg)"
          sub="Contamination rate: 10%"
        />
        <MetricCard
          label="Monitored Features"
          value="4 Vectors"
          icon={ShieldAlert}
          iconColor="var(--accent-info)"
          iconBg="rgba(91,228,240,.10)"
          sub="Volume, block ratio, threat, pace"
        />
      </div>

      {/* Information Banner */}
      <div
        className="section-gap"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Info size={20} color="var(--accent-info)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          The Anomaly Detector evaluates sessions across multidimensional behavioral vectors: request count,
          ratio of blocked prompts, average threat severity, and request velocity (requests per minute).
          Sessions deviating statistically beyond the baseline are flagged with explainable Z-scores.
        </div>
      </div>

      {/* Filter and Search */}
      <div className="filters-row section-gap">
        <div className="search-bar" style={{ minWidth: 280, flex: 1 }}>
          <Search className="search-bar-icon" size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by session ID, user ID, or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            error={error}
            onRetry={fetchAnomalies}
            onRowClick={(row) => setSelectedAnomaly(row)}
            emptyTitle="No anomalies detected"
            emptyDesc="Either all sessions exhibit normal behavioral patterns, or fewer than 5 sessions have been recorded."
            initialPageSize={25}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        open={Boolean(selectedAnomaly)}
        onClose={() => setSelectedAnomaly(null)}
        title="Anomaly Record Details"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleDownloadReport(selectedAnomaly.session_id)}
              disabled={downloadingReport}
            >
              <FileDown size={14} /> Download PDF Audit Report
            </button>
            <button className="btn btn-primary" onClick={() => setSelectedAnomaly(null)}>
              Done
            </button>
          </div>
        }
      >
        {selectedAnomaly && (
          <div className="detail-panel">
            <div className="detail-field">
              <span className="detail-field-label">Anomaly ID</span>
              <span className="detail-field-value mono">{selectedAnomaly.id}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Session ID</span>
              <span className="detail-field-value mono">{selectedAnomaly.session_id}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">User ID</span>
              <span className="detail-field-value mono">{selectedAnomaly.user_id || 'Anonymous'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Trigger Reason</span>
              <span className="detail-field-value" style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>
                {selectedAnomaly.reason}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Detection Time</span>
              <span className="detail-field-value">{formatDateTime(selectedAnomaly.flagged_at)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
