/**
 * Anomalies API
 *
 * GET /admin/anomalies  (Express Gateway, admin JWT required)
 *   Returns stored anomalies from DB, most recent first.
 *   Response: { anomalies: [ { id, session_id, user_id, reason,
 *                              flagged_at } ], count }
 *
 * GET /anomalies  (Express Gateway / Python ML, public)
 *   Runs Isolation Forest over audit_logs, persists new anomalies,
 *   returns detected anomalies.
 */

import { nodeClient } from './client.js';

export const anomaliesApi = {
  /** List persisted anomalies (admin only) */
  async listAdminAnomalies() {
    const res = await nodeClient.get('/admin/anomalies');
    return res.data; // { anomalies, count }
  },

  /** Run or refresh anomaly detection (public endpoint, no auth) */
  async runDetection() {
    const res = await nodeClient.get('/anomalies');
    return res.data;
  },
};
