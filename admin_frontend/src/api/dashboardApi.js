/**
 * Dashboard / Stats API
 *
 * GET /admin/stats  (Python backend, admin JWT required)
 *   Response: { total_users, flagged_users, total_requests,
 *               total_conversations, total_anomalies,
 *               status_breakdown: { Safe, "PII Detected", … },
 *               api_usage: { gemini: { requests, is_rate_limited }, … } }
 *
 * GET /dashboard-stats  (Python or Node backend, public)
 *   Response: { total, safe, blocked, modified, pii_detected, jailbreak,
 *               threats_by_type: { Safe: N, … },
 *               threats_by_hour: [ { hour, count }, … ],
 *               api_usage_breakdown / api_usage: { gemini: { requests, … }, … } }
 */

import { pyClient } from './client.js';

export const dashboardApi = {
  /** Admin-only stats (requires admin JWT) */
  async getAdminStats() {
    const res = await pyClient.get('/admin/stats');
    return res.data;
  },

  /** Public dashboard stats (hourly counts, status breakdown, provider usage) */
  async getDashboardStats() {
    const res = await pyClient.get('/dashboard-stats');
    return res.data;
  },
};
