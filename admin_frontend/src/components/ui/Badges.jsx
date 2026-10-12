import React from 'react';

/** Reusable status badge using actual backend status values */
export function StatusBadge({ status }) {
  const map = {
    'Safe':             'success',
    'PII Detected':     'warning',
    'Modified':         'warning',
    'Prompt Injection': 'danger',
    'Harmful':          'danger',
    'Jailbreak':        'danger',
    'Rate Limited':     'secondary',
    'Protected':        'success',
    'active':           'success',
    'inactive':         'secondary',
    'flagged':          'danger',
    'ok':               'success',
    'healthy':          'success',
    'error':            'danger',
    'degraded':         'warning',
  };
  const variant = map[status] || 'secondary';
  return <span className={`badge badge-${variant}`}>{status || '—'}</span>;
}

/** Admin / flag badge */
export function RoleBadge({ isAdmin, isFlagged }) {
  if (isFlagged) return <span className="badge badge-danger">Flagged</span>;
  if (isAdmin)   return <span className="badge badge-primary">Admin</span>;
  return <span className="badge badge-secondary">User</span>;
}

/** Threat tier badge (1–5) */
export function TierBadge({ tier }) {
  const labels  = { 1: 'Low', 2: 'Low-Med', 3: 'Medium', 4: 'High', 5: 'Critical' };
  const variants = { 1: 'success', 2: 'info', 3: 'warning', 4: 'danger', 5: 'danger' };
  const label   = labels[tier]   || `T${tier}`;
  const variant = variants[tier] || 'secondary';
  return <span className={`badge badge-${variant}`}>{label}</span>;
}
