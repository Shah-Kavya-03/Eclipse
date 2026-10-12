import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingSkeleton({ rows = 5, showHeader = true }) {
  return (
    <div>
      {showHeader && <div className="skeleton skeleton-title" style={{ width: '30%', marginBottom: 16 }} />}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 4 }} />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="metric-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <div className="skeleton" style={{ height: 40, width: 40, borderRadius: 10, marginBottom: 12 }} />
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton" style={{ height: 32, width: '40%', marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }) {
  return <div className="skeleton" style={{ height, borderRadius: 10 }} />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={28} />
        </div>
      )}
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-state-icon">
        <AlertCircle size={28} />
      </div>
      <div className="error-state-title">Failed to load data</div>
      <div className="error-state-desc">{message}</div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry} style={{ marginTop: 8 }}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
