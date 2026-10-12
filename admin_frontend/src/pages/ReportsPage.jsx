import React, { useState, useEffect } from 'react';
import {
  FileDown, FileText, Shield, CheckCircle, Clock,
  Calendar, Download, AlertCircle, Sparkles
} from 'lucide-react';
import { reportsApi } from '../api/reportsApi.js';
import { logsApi } from '../api/logsApi.js';
import { downloadBlob, formatDateTime } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function ReportsPage() {
  const [downloadingWeekly, setDownloadingWeekly] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [downloadingSession, setDownloadingSession] = useState(false);

  // Recent sessions from logs for quick selection
  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const res = await logsApi.getLogs({ limit: 10 });
        if (!cancelled && res?.logs) {
          // unique sessions
          const seen = new Set();
          const unique = [];
          for (const l of res.logs) {
            if (l.session_id && !seen.has(l.session_id)) {
              seen.add(l.session_id);
              unique.push({ session_id: l.session_id, title: l.title, timestamp: l.timestamp });
            }
          }
          setRecentSessions(unique);
        }
      } catch {
        // silent fail for recent suggestions
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    };
    fetchRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadWeekly = async () => {
    setDownloadingWeekly(true);
    try {
      toast.info('Generating PDF', 'Compiling weekly compliance audit report…');
      const { blob, filename } = await reportsApi.downloadReport('weekly');
      downloadBlob(blob, filename);
      toast.success('Download Complete', `Saved ${filename}`);
    } catch (err) {
      toast.error('Download Error', err?.response?.data?.detail || 'Failed to generate weekly PDF report.');
    } finally {
      setDownloadingWeekly(false);
    }
  };

  const handleDownloadSession = async (targetSessionId) => {
    const idToUse = targetSessionId || sessionId.trim();
    if (!idToUse) {
      toast.warning('Input Required', 'Please enter a session ID.');
      return;
    }

    setDownloadingSession(true);
    try {
      toast.info('Generating PDF', `Compiling session report for ${idToUse}…`);
      const { blob, filename } = await reportsApi.downloadReport('session', idToUse);
      downloadBlob(blob, filename);
      toast.success('Download Complete', `Saved ${filename}`);
    } catch (err) {
      toast.error('Download Error', err?.response?.data?.detail || 'Failed to generate session PDF report.');
    } finally {
      setDownloadingSession(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance Reports</h1>
          <p className="page-subtitle">
            Export legally compliant DPDP Act 2023 audit documentation and security incident reports in PDF format
          </p>
        </div>
      </div>

      {/* Report Generator Cards */}
      <div className="row section-gap">
        {/* Weekly Report Card */}
        <div className="col-half">
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-primary-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="card-title">Weekly Compliance Audit Report</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    System-wide threat analysis & telemetry
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                Synthesizes all incoming requests, prompt injections, PII redactions, and provider status
                over the preceding 7 days into a formal ReportLab PDF document.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={14} color="var(--accent-success)" />
                  <span>Includes hourly threat volume charts & tier breakdowns</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={14} color="var(--accent-success)" />
                  <span>Digital Privacy and Data Protection (DPDP) Act 2023 alignment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={14} color="var(--accent-success)" />
                  <span>Provider rate-limiting and fallback failover logs</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleDownloadWeekly}
                disabled={downloadingWeekly}
                style={{ width: '100%' }}
              >
                <Download size={15} />
                {downloadingWeekly ? 'Compiling PDF…' : 'Download Weekly PDF Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Session Report Card */}
        <div className="col-half">
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-secondary-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-secondary)',
                  }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <div className="card-title">Session Audit Certificate</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Granular single-session inspection
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                Generates an auditable chain of custody PDF for a specific session ID, including every sanitized prompt,
                model response, and LIME threat explanation.
              </p>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="session-id-input">Session ID</label>
                <input
                  id="session-id-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => handleDownloadSession()}
                disabled={downloadingSession || !sessionId.trim()}
                style={{ width: '100%' }}
              >
                <Download size={15} />
                {downloadingSession ? 'Compiling PDF…' : 'Download Session Audit PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Select from Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="card section-gap">
          <div className="card-header">
            <div>
              <div className="card-title">Quick Select from Recent Audit Logs</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Click any session to automatically generate its compliance PDF
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Session Title</th>
                    <th>Recorded At</th>
                    <th style={{ textAlign: 'right' }}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((s) => (
                    <tr key={s.session_id}>
                      <td className="mono" style={{ fontSize: '0.8125rem' }}>
                        {s.session_id}
                      </td>
                      <td style={{ fontWeight: 500 }}>{s.title || 'Untitled Session'}</td>
                      <td>{formatDateTime(s.timestamp)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 10px' }}
                          onClick={() => handleDownloadSession(s.session_id)}
                          disabled={downloadingSession}
                        >
                          <Download size={13} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Regulatory Standards Reference */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Shield size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Compliance Framework & Data Governance</h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Under Section 8(7) of India’s <strong>Digital Personal Data Protection (DPDP) Act 2023</strong>,
          data fiduciaries must maintain accurate, tamper-evident audit trails. The Eclipse Guardrail engine
          ensures that user-initiated chat deletions clear conversational context while irreversibly retaining
          sanitized audit records for security forensics and statutory reporting.
        </p>
      </div>
    </div>
  );
}
