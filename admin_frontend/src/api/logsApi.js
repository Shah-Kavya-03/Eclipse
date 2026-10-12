/**
 * Logs API
 *
 * GET /logs?limit={n}&user_id={uid}  (Python, public)
 *   Returns audit log entries, most recent first.
 *   Response: { logs: [ { id, session_id, title, prompt_masked,
 *                          response, model_used, api_used, status,
 *                          threat_tier, lime_explanation, timestamp,
 *                          user_id } ], count }
 *
 * Server-side filtering: only limit and user_id are supported.
 * All other filtering (by status, threat_tier, date) is done client-side.
 */

import { pyClient } from './client.js';

export const logsApi = {
  async getLogs({ limit = 200, userId } = {}) {
    const params = { limit };
    if (userId) params.user_id = userId;
    const res = await pyClient.get('/logs', { params });
    return res.data; // { logs, count }
  },
};
