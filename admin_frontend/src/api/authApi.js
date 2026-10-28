/**
 * Auth API — wraps the authentication endpoints.
 *
 * POST /auth/login  → { access_token, token, user_id, name, email, is_admin }
 * POST /auth/logout → { message }
 * GET  /auth/me     → Node.js server only (bearer JWT with "user_id" claim)
 */

import { pyClient, nodeClient, getErrorMessage } from './client.js';

export const authApi = {
  /**
   * Login using the Python backend.
   * Returns the raw response data on success.
   */
  async login(email, password) {
    const res = await pyClient.post('/auth/login', { email, password });
    return res.data;
  },

  /**
   * Logout — notify both Node Express Gateway and Python microservice.
   */
  async logout() {
    try {
      await nodeClient.post('/auth/logout');
    } catch {}
    try {
      await pyClient.post('/auth/logout');
    } catch {}
  },

  /**
   * Fetch current authenticated user info.
   * Uses the Node.js server's /auth/me (which uses "user_id" JWT claim).
   * Falls back gracefully if the endpoint is unreachable.
   */
  async getMe() {
    const res = await nodeClient.get('/auth/me');
    return res.data;
  },
};
