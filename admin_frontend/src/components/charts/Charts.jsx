import React from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { ChartSkeleton } from '../ui/States.jsx';

/* ---- Shared colours ----------------------------------------- */
const PALETTE = [
  'var(--accent-primary)',
  'var(--accent-secondary)',
  'var(--accent-success)',
  'var(--accent-warning)',
  'var(--accent-danger)',
  'var(--accent-info)',
];

/* ---- Custom Tooltip ----------------------------------------- */
function CustomTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((p, i) => (
        <div key={i} className="custom-tooltip-item">
          <div className="custom-tooltip-dot" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}: </span>
          <span style={{ fontWeight: 600 }}>{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- Shared axis styles ------------------------------------- */
const axisStyle = { fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' };

/* ---- AreaChartCard ------------------------------------------ */
export function AreaChartCard({ title, subtitle, data, series, height = 260, loading, xKey = 'date', labelFormatter }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          {subtitle && <div className="chart-card-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-card-body">
        {loading ? <ChartSkeleton height={height} /> : (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={s.key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE[i]} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={PALETTE[i]} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip labelFormatter={labelFormatter} />} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />}
              {series.map((s, i) => (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key}
                  stroke={PALETTE[i]} fill={`url(#grad-${i})`} strokeWidth={2} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ---- BarChartCard ------------------------------------------- */
export function BarChartCard({ title, subtitle, data, series, height = 260, loading, xKey = 'name', layout = 'horizontal' }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          {subtitle && <div className="chart-card-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-card-body">
        {loading ? <ChartSkeleton height={height} /> : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout={layout} margin={{ top: 4, right: 4, left: layout === 'vertical' ? 80 : -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={layout !== 'vertical'} horizontal={layout !== 'horizontal'} />
              {layout === 'vertical'
                ? <><YAxis type="category" dataKey={xKey} tick={{ ...axisStyle, textAnchor: 'end' }} axisLine={false} tickLine={false} width={80} />
                   <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} /></>
                : <><XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
                   <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} /></>
              }
              <Tooltip content={<CustomTooltip />} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />}
              {series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.label || s.key}
                  fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ---- DonutChartCard ----------------------------------------- */
export function DonutChartCard({ title, subtitle, data, loading, height = 260 }) {
  // data: [{ name, value }]
  const total = data?.reduce((s, d) => s + d.value, 0) || 0;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          {subtitle && <div className="chart-card-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-card-body">
        {loading ? <ChartSkeleton height={height} /> : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <ResponsiveContainer width={200} height={height}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data?.map((entry, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value?.toLocaleString()}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 36 }}>
                    {total ? `${Math.round((d.value / total) * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- MetricCard --------------------------------------------- */
export function MetricCard({ label, value, icon: Icon, iconColor, iconBg, sub, onClick }) {
  return (
    <div className="metric-card" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="metric-card-header">
        <div>
          <div className="metric-card-label">{label}</div>
        </div>
        {Icon && (
          <div className="metric-card-icon" style={{ background: iconBg || 'var(--bg-elevated)', color: iconColor || 'var(--text-secondary)' }}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <div className="metric-card-value">{value ?? '—'}</div>
      {sub && <div className="metric-card-sub">{sub}</div>}
    </div>
  );
}
