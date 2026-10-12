/**
 * Settings API — Python backend (public routes, user_id required in body/query).
 *
 * GET  /settings?user_id={uid}
 *   Response: { user_id, theme, preferred_provider_order,
 *               stream_response, save_history }
 *
 * PUT  /settings
 *   Body: { user_id, theme?, preferred_provider_order?,
 *            stream_response?, save_history? }
 *   Response: { message, settings }
 *
 * POST /settings/clear-history
 *   Body: { user_id }
 *   Response: { message, deleted_count, user_id }
 *   NOTE: Deletes only conversation documents for that user.
 *         audit_logs are NOT deleted (DPDP Act 2023 compliance).
 */

import { pyClient } from './client.js';

export const settingsApi = {
  async getSettings(userId) {
    const res = await pyClient.get('/settings', { params: { user_id: userId } });
    return res.data;
  },

  async updateSettings(data) {
    // data must contain user_id
    const res = await pyClient.put('/settings', data);
    return res.data;
  },

  async clearHistory(userId) {
    const res = await pyClient.post('/settings/clear-history', { user_id: userId });
    return res.data;
  },
};
