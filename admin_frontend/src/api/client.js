/**
 * API Client — Centralized Axios instances for both services.
 *
 * Python FastAPI backend (port 8001): owns all /admin/*, auth JWT
 *   with "sub" claim, /health, /dashboard-stats, /logs, /anomalies,
 *   /report/download, /settings/*
 *
 * Node.js Express server (port 5000): mirrors most routes, adds
 *   /auth/me (GET with Bearer JWT "user_id" claim).
 *   We use Node for /auth/me since only Node has that endpoint.
 *   We use Python for /admin/* since that's where admin guard lives.
 */

import axios from 'axios';

const PYTHON_BASE = import.meta.env.VITE_PYTHON_API_URL || '/py-api';
const NODE_BASE   = import.meta.env.VITE_NODE_API_URL   || '/node-api';

/* ---------- Python Backend Client --------- */
export const pyClient = axios.create({
  baseURL: PYTHON_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ---------- Node.js Server Client --------- */
export const nodeClient = axios.create({
  baseURL: NODE_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ---------- Token injection --------- */
const attachToken = (config) => {
  const token = localStorage.getItem('eclipse_admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

pyClient.interceptors.request.use(attachToken);
nodeClient.interceptors.request.use(attachToken);

/* ---------- 401 / 403 redirect --------- */
const handleAuthError = (error) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    // Only clear session and redirect if this is an admin-protected endpoint
    const url = error.config?.url || '';
    if (url.includes('/admin') && typeof window !== 'undefined') {
      localStorage.removeItem('eclipse_admin_token');
      localStorage.removeItem('eclipse_admin_user');
      document.cookie = 'eclipse_admin_shared=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'eclipse_logged_out=1; path=/; max-age=60; SameSite=Lax';
      try {
        const channel = new BroadcastChannel('eclipse_auth_channel');
        channel.postMessage({ type: 'ECLIPSE_LOGOUT' });
        channel.close();
      } catch {}
      const hostname = window.location.hostname || 'localhost';
      window.location.replace(`http://${hostname}:5173/?logged_out=1`);
    }
  }
  return Promise.reject(error);
};

pyClient.interceptors.response.use((r) => r, handleAuthError);
nodeClient.interceptors.response.use((r) => r, handleAuthError);

/* ---------- Helper: extract error message --------- */
export const getErrorMessage = (err) => {
  if (!err) return 'An unknown error occurred.';
  const data = err.response?.data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (err.message === 'Network Error') return 'Cannot reach the server. Is it running?';
  if (err.code === 'ECONNABORTED') return 'Request timed out.';
  return err.message || 'An unexpected error occurred.';
};
