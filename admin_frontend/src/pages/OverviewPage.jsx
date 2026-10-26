import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, AlertTriangle, Users, MessageSquare,
  Activity, RefreshCw, Cpu, ShieldAlert, CheckCircle2,
  AlertOctagon, FileText, ArrowUpRight
} from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi.js';
import { MetricCard, AreaChartCard, DonutChartCard, BarChartCard } from '../components/charts/Charts.jsx';
import { CardSkeleton, ErrorState } from '../components/ui/States.jsx';
import { formatNumber, pct } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [publicStats, setPublicStats] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Parallel fetch from both endpoints
      const [adminRes, publicRes] = await Promise.allSettled([
        dashboardApi.getAdminStats(),
        dashboardApi.getDashboardStats(),
      ]);

      if (adminRes.status === 'fulfilled') {
        setAdminStats(adminRes.value);
      }
      if (publicRes.status === 'fulfilled') {
        setPublicStats(publicRes.value);
      }

      if (adminRes.status === 'rejected' && publicRes.status === 'rejected') {
        const errMsg = adminRes.reason?.response?.data?.detail || adminRes.reason?.message || 'Failed to fetch dashboard metrics.';
        setError(errMsg);
      } else if (isRefresh) {
        toast.success('Updated', 'Overview metrics refreshed successfully.');
      }
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !adminStats && !publicStats) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Overview</h1>
            <p className="page-subtitle">Real-time LLM Guardrail status and activity</p>
          </div>
        </div>
        <CardSkeleton count={6} />
      </div>
    );
  }

  if (error && !adminStats && !publicStats) {
    return (
      <div className="section-gap">
        <div className="page-header">
          <div>
            <h1 className="page-title">Overview</h1>
            <p className="page-subtitle">Real-time LLM Guardrail status and activity</p>
          </div>
        </div>
        <ErrorState message={error} onRetry={() => loadData(false)} />
      </div>
    );
  }

  // Derive consolidated metrics
  const totalRequests = adminStats?.total_requests ?? publicStats?.total ?? 0;
  const totalUsers = adminStats?.total_users ?? 0;
  const flaggedUsers = adminStats?.flagged_users ?? 0;
  const totalConversations = adminStats?.total_conversations ?? 0;
  const totalAnomalies = adminStats?.total_anomalies ?? 0;

  const safeCount = publicStats?.safe ?? adminStats?.status_breakdown?.['Safe'] ?? 0;
  const blockedCount = publicStats?.blocked ?? 0;
  const piiCount = publicStats?.pii_detected ?? adminStats?.status_breakdown?.['PII Detected'] ?? 0;
  const jailbreakCount = publicStats?.jailbreak ?? adminStats?.status_breakdown?.['Jailbreak'] ?? 0;

  const safePercentage = pct(safeCount, totalRequests);
  const blockedPercentage = pct(blockedCount, totalRequests);

  // Status breakdown for donut chart
  const statusSource = adminStats?.status_breakdown || publicStats?.threats_by_type || {};
  const statusChartData = Object.entries(statusSource).map(([name, value]) => ({
    name,
    value: Number(value) || 0,
  }));

  // Hourly time series data
  const hourlyData = (publicStats?.threats_by_hour || []).map((item) => ({
    time: item.hour ? item.hour.slice(11, 16) : '00:00',
    count: item.count,
  }));

  // Provider API usage data
  const apiUsageSource = adminStats?.api_usage || publicStats?.api_usage_breakdown || {};
  const providerData = Object.entries(apiUsageSource).map(([key, val]) => ({
    name: key.toUpperCase(),
    requests: val.requests ?? 0,
    rateLimited: val.is_rate_limited ? 'Yes' : 'No',
  }));

  return (
    <div>
      {/* Header with Title and Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">
            System activity, guardrail throughput, and threat statistics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="metric-grid section-gap">
        <MetricCard
          label="Total Guardrail Requests"
          value={formatNumber(totalRequests)}
          icon={Activity}
          iconColor="var(--accent-primary)"
          iconBg="var(--accent-primary-bg)"
          sub={`${safePercentage}% safe transactions`}
        />

        <MetricCard
          label="Active Users"
          value={formatNumber(totalUsers)}
          icon={Users}
          iconColor="var(--accent-secondary)"
          iconBg="var(--accent-secondary-bg)"
          sub={flaggedUsers > 0 ? `${flaggedUsers} flagged for review` : 'All users clean'}
          onClick={() => navigate('/admin/users')}
        />

        <MetricCard
          label="Flagged Users"
          value={formatNumber(flaggedUsers)}
          icon={AlertTriangle}
          iconColor="var(--accent-danger)"
          iconBg="var(--accent-danger-bg)"
          sub="Requires administrator review"
          onClick={() => navigate('/admin/users')}
        />

        <MetricCard
          label="Total Conversations"
          value={formatNumber(totalConversations)}
          icon={MessageSquare}
          iconColor="var(--accent-info)"
          iconBg="rgba(91,228,240,.10)"
          sub="Stored in database"
          onClick={() => navigate('/admin/conversations')}
        />

        <MetricCard
          label="Detected Anomalies"
          value={formatNumber(totalAnomalies)}
          icon={ShieldAlert}
          iconColor="var(--accent-warning)"
          iconBg="var(--accent-warning-bg)"
          sub="Isolation Forest detections"
          onClick={() => navigate('/admin/anomalies')}
        />

        <MetricCard
          label="Threat Interceptions"
          value={formatNumber(blockedCount)}
          icon={AlertOctagon}
          iconColor="var(--accent-danger)"
          iconBg="var(--accent-danger-bg)"
          sub={`${blockedPercentage}% of all traffic`}
          onClick={() => navigate('/admin/logs')}
        />
      </div>

      {/* Primary Analytics Charts */}
      <div className="row section-gap">
        <div className="col-two-thirds">
          <AreaChartCard
            title="Request Throughput (Last 24 Hours)"
            subtitle="Hourly traffic volume inspected by guardrails"
            data={hourlyData}
            xKey="time"
            series={[{ key: 'count', label: 'Requests' }]}
            height={260}
          />
        </div>

        <div className="col-third">
          <DonutChartCard
            title="Traffic Classification"
            subtitle="Categorization breakdown of inspected prompts"
            data={statusChartData.length > 0 ? statusChartData : [{ name: 'Safe', value: 0 }]}
            height={260}
          />
        </div>
      </div>

      {/* Provider Activity & Quick Navigation */}
      <div className="row section-gap">
        <div className="col-half">
          <BarChartCard
            title="LLM Provider Request Volume"
            subtitle="Requests distributed across active LLM backends"
            data={providerData}
            xKey="name"
            series={[{ key: 'requests', label: 'Requests Processed' }]}
            height={240}
          />
        </div>

        <div className="col-half">
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Quick Actions & Workflows</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Common administrator management operations
                </div>
              </div>
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                }}
                onClick={() => navigate('/admin/users')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Users size={18} color="var(--accent-secondary)" />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Manage Users</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Inspect user directories, account roles, and security records
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} color="var(--text-muted)" />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                }}
                onClick={() => navigate('/admin/anomalies')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ShieldAlert size={18} color="var(--accent-warning)" />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Review Behavioral Anomalies</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Inspect Isolation Forest outlier sessions and triggers
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} color="var(--text-muted)" />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                }}
                onClick={() => navigate('/admin/reports')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={18} color="var(--accent-primary)" />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Compliance & Audit Reports</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Download DPDP Act 2023 compliant PDF documentation
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} color="var(--text-muted)" />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                }}
                onClick={() => navigate('/admin/system-health')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Cpu size={18} color="var(--accent-success)" />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>System Health & Diagnostics</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Verify Python, Node gateway, and MongoDB connections
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} color="var(--text-muted)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
