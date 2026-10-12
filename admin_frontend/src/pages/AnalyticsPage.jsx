import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3, ShieldCheck, ShieldAlert, AlertTriangle,
  RefreshCw, Activity, Cpu, Layers, PieChart
} from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi.js';
import { MetricCard, AreaChartCard, DonutChartCard, BarChartCard } from '../components/charts/Charts.jsx';
import { CardSkeleton, ErrorState } from '../components/ui/States.jsx';
import { formatNumber, pct } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const toast = useToast();

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsRes, logsRes] = await Promise.allSettled([
        analyticsApi.getDashboardStats(),
        analyticsApi.getLogs(1000),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value?.logs || []);
      }

      if (statsRes.status === 'rejected' && logsRes.status === 'rejected') {
        const msg = statsRes.reason?.response?.data?.detail || statsRes.reason?.message || 'Failed to fetch analytics.';
        setError(msg);
      } else if (isRefresh) {
        toast.success('Analytics Refreshed', 'Calculated latest metrics from backend logs.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Derived metrics from stats & logs
  const total = stats?.total ?? logs.length ?? 0;
  const safe = stats?.safe ?? logs.filter((l) => l.status === 'Safe').length;
  const blocked = stats?.blocked ?? logs.filter((l) => ['Prompt Injection', 'Harmful', 'Jailbreak'].includes(l.status)).length;
  const pii = stats?.pii_detected ?? logs.filter((l) => l.status === 'PII Detected').length;
  const jailbreak = stats?.jailbreak ?? logs.filter((l) => l.status === 'Jailbreak').length;

  const safePct = pct(safe, total);
  const blockedPct = pct(blocked, total);
  const piiPct = pct(pii, total);

  // Status breakdown donut
  const statusChartData = useMemo(() => {
    if (stats?.threats_by_type) {
      return Object.entries(stats.threats_by_type).map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }));
    }
    // Fallback computed from logs
    const counts = {};
    for (const l of logs) {
      const s = l.status || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [stats, logs]);

  // Hourly timeline
  const hourlyChartData = useMemo(() => {
    return (stats?.threats_by_hour || []).map((h) => ({
      hour: h.hour ? h.hour.slice(11, 16) : '00:00',
      threats: h.count,
    }));
  }, [stats]);

  // Threat Tier Breakdown (Tier 1 to 5) computed from logs
  const tierChartData = useMemo(() => {
    const tierLabels = {
      1: 'Tier 1 (Low)',
      2: 'Tier 2 (Low-Med)',
      3: 'Tier 3 (Medium)',
      4: 'Tier 4 (High)',
      5: 'Tier 5 (Critical)',
    };
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const l of logs) {
      const t = l.threat_tier;
      if (t && counts[t] !== undefined) {
        counts[t] += 1;
      }
    }
    return Object.entries(counts).map(([tier, count]) => ({
      name: tierLabels[tier],
      count,
    }));
  }, [logs]);

  // Provider breakdown
  const providerChartData = useMemo(() => {
    const usage = stats?.api_usage_breakdown || {};
    return Object.entries(usage).map(([name, data]) => ({
      name: name.toUpperCase(),
      requests: data.requests || 0,
    }));
  }, [stats]);

  // Model usage breakdown from logs
  const modelChartData = useMemo(() => {
    const counts = {};
    for (const l of logs) {
      const m = l.model_used || 'Unspecified';
      counts[m] = (counts[m] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, requests]) => ({ name, requests }));
  }, [logs]);

  if (loading && !stats) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Guardrail Analytics</h1>
            <p className="page-subtitle">Security telemetry, threat distributions, and model performance</p>
          </div>
        </div>
        <CardSkeleton count={5} />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Guardrail Analytics</h1>
            <p className="page-subtitle">Security telemetry, threat distributions, and model performance</p>
          </div>
        </div>
        <ErrorState message={error} onRetry={() => loadAnalytics(false)} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Guardrail Analytics</h1>
          <p className="page-subtitle">
            Telemetry, threat vectors, policy interception rates, and provider utilization
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => loadAnalytics(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="metric-grid section-gap">
        <MetricCard
          label="Total Inspected Prompts"
          value={formatNumber(total)}
          icon={Activity}
          iconColor="var(--accent-primary)"
          iconBg="var(--accent-primary-bg)"
          sub="Analyzed across all sessions"
        />
        <MetricCard
          label="Safe Pass Rate"
          value={`${safePct}%`}
          icon={ShieldCheck}
          iconColor="var(--accent-success)"
          iconBg="var(--accent-success-bg)"
          sub={`${formatNumber(safe)} prompts approved`}
        />
        <MetricCard
          label="Interception Rate"
          value={`${blockedPct}%`}
          icon={ShieldAlert}
          iconColor="var(--accent-danger)"
          iconBg="var(--accent-danger-bg)"
          sub={`${formatNumber(blocked)} harmful prompts blocked`}
        />
        <MetricCard
          label="PII Sanitizations"
          value={formatNumber(pii)}
          icon={Layers}
          iconColor="var(--accent-warning)"
          iconBg="var(--accent-warning-bg)"
          sub={`${piiPct}% of inputs masked`}
        />
        <MetricCard
          label="Jailbreak Attempts"
          value={formatNumber(jailbreak)}
          icon={AlertTriangle}
          iconColor="var(--accent-danger)"
          iconBg="var(--accent-danger-bg)"
          sub="Zero-tolerance blocks"
        />
      </div>

      {/* Hourly Timeline & Threat Type Donut */}
      <div className="row section-gap">
        <div className="col-two-thirds">
          <AreaChartCard
            title="Hourly Threat Activity (24 Hours)"
            subtitle="Real-time volume of security events captured by the guardrail"
            data={hourlyChartData}
            xKey="hour"
            series={[{ key: 'threats', label: 'Threats Intercepted' }]}
            height={260}
          />
        </div>

        <div className="col-third">
          <DonutChartCard
            title="Classification Distribution"
            subtitle="Breakdown by guardrail verdict"
            data={statusChartData.length > 0 ? statusChartData : [{ name: 'Safe', value: 0 }]}
            height={260}
          />
        </div>
      </div>

      {/* Threat Tiers & Provider Activity */}
      <div className="row section-gap">
        <div className="col-half">
          <BarChartCard
            title="Threat Severity Tiers"
            subtitle="Distribution across severity levels (Tier 1: Low to Tier 5: Critical)"
            data={tierChartData}
            xKey="name"
            series={[{ key: 'count', label: 'Events' }]}
            height={240}
          />
        </div>

        <div className="col-half">
          <BarChartCard
            title="LLM Provider Throughput"
            subtitle="Requests distributed across active model backends"
            data={providerChartData.length > 0 ? providerChartData : [{ name: 'None', requests: 0 }]}
            xKey="name"
            series={[{ key: 'requests', label: 'Requests Processed' }]}
            height={240}
          />
        </div>
      </div>

      {/* Top Models Utilized */}
      {modelChartData.length > 0 && (
        <div className="card section-gap">
          <div className="card-header">
            <div>
              <div className="card-title">Top Models Deployed in Prompts</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Target models queried across user sessions
              </div>
            </div>
          </div>
          <div className="card-body">
            <BarChartCard
              title=""
              data={modelChartData}
              xKey="name"
              series={[{ key: 'requests', label: 'Prompts Routed' }]}
              height={200}
            />
          </div>
        </div>
      )}
    </div>
  );
}
