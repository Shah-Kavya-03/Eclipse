/**
 * Analytics API — reuses dashboard-stats and logs for analytics page.
 *
 * GET /dashboard-stats  (Python, public)
 *   Returns aggregate counts, threats_by_hour (last 24h), threats_by_type,
 *   api_usage_breakdown.
 *
 * GET /logs?limit=1000  (Python, public)
 *   Returns up to 1000 audit log entries for client-side aggregation.
 *   Fields: id, session_id, title, prompt_masked, model_used, api_used,
 *           status, threat_tier, timestamp, user_id.
 */

import { pyClient } from './client.js';

export const analyticsApi = {
  async getDashboardStats() {
    const res = await pyClient.get('/dashboard-stats');
    return res.data;
  },

  /** Fetch logs for client-side analytics aggregation */
  async getLogs(limit = 1000) {
    const res = await pyClient.get('/logs', { params: { limit } });
    return res.data; // { logs, count }
  },
};
