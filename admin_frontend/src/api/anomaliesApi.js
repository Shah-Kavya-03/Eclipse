/**
 * Anomalies API
 *
 * GET /admin/anomalies  (Python, admin JWT required)
 *   Returns stored anomalies from DB, most recent first.
 *   Response: { anomalies: [ { id, session_id, user_id, reason,
 *                              flagged_at } ], count }
 *
 * GET /anomalies  (Python, public)
 *   Runs Isolation Forest over audit_logs, persists new anomalies,
 *   returns detected anomalies.
 *   Response: { sessions_analyzed, anomalies, count }
 *   Each anomaly from /anomalies (public): schema depends on ml/anomaly_detector.py
 *
 * We use /admin/anomalies (admin-only) for the admin panel since it
 * returns persisted records and requires auth. We also offer the
 * public /anomalies endpoint to refresh/trigger detection.
 */

import { pyClient } from './client.js';

export const anomaliesApi = {
  /** List persisted anomalies (admin only) */
  async listAdminAnomalies() {
    const res = await pyClient.get('/admin/anomalies');
    return res.data; // { anomalies, count }
  },

  /** Run or refresh anomaly detection (public endpoint, no auth) */
  async runDetection() {
    const res = await pyClient.get('/anomalies');
    return res.data;
  },
};
