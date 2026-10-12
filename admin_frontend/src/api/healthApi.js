/**
 * Health API
 *
 * GET /health  (Python backend, public)
 *   Response: { status: "ok", database: "connected" }
 *   — Pings MongoDB and returns connected or raises an exception.
 *
 * GET /health  (Node.js server, public)  [different port]
 *   Response: { status: "healthy", service, version, timestamp }
 */

import { pyClient, nodeClient } from './client.js';

export const healthApi = {
  async checkPythonBackend() {
    const res = await pyClient.get('/health', { timeout: 5000 });
    return res.data; // { status, database }
  },

  async checkNodeServer() {
    const res = await nodeClient.get('/health', { timeout: 5000 });
    return res.data; // { status, service, version, timestamp }
  },
};
