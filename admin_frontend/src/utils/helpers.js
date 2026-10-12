/**
 * Shared utility functions used across the admin dashboard.
 */

/** Format an ISO timestamp to a readable local date-time string */
export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Format an ISO timestamp to just the date */
export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Format a number with thousands separators */
export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}

/** Relative time — e.g. "3 hours ago" */
export function timeAgo(iso) {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const sec  = Math.floor(diff / 1000);
    if (sec < 60)  return `${sec}s ago`;
    const min  = Math.floor(sec / 60);
    if (min < 60)  return `${min}m ago`;
    const hr   = Math.floor(min / 60);
    if (hr  < 24)  return `${hr}h ago`;
    const day  = Math.floor(hr / 24);
    return `${day}d ago`;
  } catch {
    return iso;
  }
}

/** Truncate a string to maxLen characters */
export function truncate(str, maxLen = 60) {
  if (!str) return '—';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/**
 * Map audit-log status to a badge variant.
 * Uses only the actual status values from the backend:
 * Safe | PII Detected | Prompt Injection | Harmful | Jailbreak | Rate Limited | Modified
 */
export function statusVariant(status) {
  if (!status) return 'secondary';
  switch (status) {
    case 'Safe':             return 'success';
    case 'PII Detected':
    case 'Modified':         return 'warning';
    case 'Prompt Injection':
    case 'Harmful':
    case 'Jailbreak':        return 'danger';
    case 'Rate Limited':     return 'secondary';
    default:                 return 'secondary';
  }
}

/** Map threat_tier (1–5) to a label */
export function threatTierLabel(tier) {
  const map = { 1: 'Low', 2: 'Low-Med', 3: 'Medium', 4: 'High', 5: 'Critical' };
  return map[tier] || `Tier ${tier}`;
}

/** Map threat_tier to badge variant */
export function tierVariant(tier) {
  if (!tier) return 'secondary';
  if (tier <= 1) return 'success';
  if (tier <= 2) return 'info';
  if (tier <= 3) return 'warning';
  return 'danger';
}

/** Download a Blob as a file */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/** Safe percentage — avoids division by zero */
export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/** Group an array of objects by a key */
export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? 'Unknown';
    acc[k]  = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

/** Aggregate log entries by date (YYYY-MM-DD) */
export function aggregateByDate(logs, dateField = 'timestamp') {
  const counts = {};
  for (const log of logs) {
    const iso = log[dateField];
    if (!iso) continue;
    const day = iso.slice(0, 10); // "YYYY-MM-DD"
    counts[day] = (counts[day] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

/** Simple debounce */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
