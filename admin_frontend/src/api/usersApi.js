/**
 * Users API — Python backend, admin JWT required.
 *
 * GET  /admin/users
 *   Response: { users: [ { user_id, name, email, created_at,
 *                          is_flagged, is_admin, request_count } ],
 *               count }
 *
 * PUT  /admin/user/{user_id}/flag
 *   Response: { user_id, is_flagged }   (toggles the flag)
 */

import { pyClient } from './client.js';

export const usersApi = {
  async listUsers() {
    const res = await pyClient.get('/admin/users');
    return res.data; // { users, count }
  },

  async flagUser(userId) {
    const res = await pyClient.put(`/admin/user/${userId}/flag`);
    return res.data; // { user_id, is_flagged }
  },
};
