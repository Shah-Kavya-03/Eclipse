/**
 * Conversations API — Python backend (no admin guard, user_id required).
 *
 * GET    /conversations?user_id={uid}
 *   Response: { conversations: [ { session_id, user_id, status,
 *                model_used, api_used, created_at,
 *                message_count, title } ], count }
 *
 * GET    /conversations/{session_id}
 *   Response: same fields + messages: [ { sender, text, timestamp } ]
 *
 * PATCH  /conversations/{session_id}/title
 *   Body: { title }
 *   Response: { session_id, title }
 *
 * DELETE /conversations/{session_id}
 *   Response: { message, session_id }
 *
 * NOTE: The /conversations endpoint requires user_id query param.
 * Admin browsing all conversations is NOT supported by the existing backend.
 * We therefore only fetch conversations for a specific user_id.
 * The admin cannot browse all users' conversations without a user_id.
 */

import { pyClient } from './client.js';

export const conversationsApi = {
  /** List conversations for a specific user */
  async listByUser(userId) {
    const res = await pyClient.get('/conversations', { params: { user_id: userId } });
    return res.data; // { conversations, count }
  },

  /** Get full message history for a session */
  async getConversation(sessionId) {
    const res = await pyClient.get(`/conversations/${sessionId}`);
    return res.data;
  },

  /** Rename a conversation */
  async rename(sessionId, title) {
    const res = await pyClient.patch(`/conversations/${sessionId}/title`, { title });
    return res.data;
  },

  /** Delete a conversation */
  async deleteConversation(sessionId) {
    const res = await pyClient.delete(`/conversations/${sessionId}`);
    return res.data;
  },
};
