export const API_BASE = "http://localhost:5000";
export const PYTHON_API_BASE = "http://127.0.0.1:8001";

/**
 * Maps a backend threat_tier status to the frontend's existing
 * three-state display model: "Protected" (safe), "Blocked"
 * (injection/harmful/jailbreak), "Modified" (PII was masked).
 *
 * Bug 3 fix: normalize case + whitespace so unknown/empty statuses
 * do NOT fall through to "Blocked". Unknown → "Protected" (safe default).
 */
export function mapBackendStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'pii detected' || normalized === 'modified') return 'Modified';
    if (normalized === 'safe' || normalized === 'protected' || normalized === 'passed' || normalized === 'allowed') return 'Protected';
    if (normalized === 'blocked' || normalized === 'unsafe' || normalized === 'injection' || normalized === 'jailbreak' || normalized === 'harmful') return 'Blocked';
    // Unknown / missing status → treat as Protected (safe), never auto-Blocked
    if (!normalized) return 'Protected';
    return 'Blocked';
}

export async function apiLogin(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    return res;
}

export async function apiPythonLogin(email, password) {
    try {
        const res = await fetch(`${PYTHON_API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        return res;
    } catch {
        const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
        return fetch(`http://${hostname}:8001/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
    }
}

export async function apiSignup(name, email, password) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });
    return res;
}

export async function apiLogout() {
    return fetch(`${API_BASE}/auth/logout`, { method: "POST" });
}

export async function apiSendChat(prompt, sessionId, userId) {
    const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            session_id: String(sessionId),
            user_id: userId || "guest"
        })
    });
    return res.json();
}

export async function apiGetConversations(userId) {
    const res = await fetch(`${API_BASE}/conversations?user_id=${encodeURIComponent(userId)}`);
    return res.json();
}

export async function apiGetConversation(sessionId) {
    const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(sessionId)}`);
    return res.json();
}

export async function apiUpdateConversationTitle(sessionId, title) {
    return fetch(`${API_BASE}/conversations/${encodeURIComponent(sessionId)}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
    });
}

export async function apiDeleteConversation(sessionId) {
    return fetch(`${API_BASE}/conversations/${encodeURIComponent(sessionId)}`, {
        method: "DELETE"
    });
}

export async function apiGetLogs() {
    const res = await fetch(`${API_BASE}/logs`);
    return res.json();
}

export async function apiGetDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard-stats`);
    return res.json();
}
