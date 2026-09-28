export const API_BASE = "http://localhost:8000";

/**
 * Maps a backend threat_tier status to the frontend's existing
 * three-state display model: "Protected" (safe), "Blocked"
 * (injection/harmful/jailbreak), "Modified" (PII was masked).
 */
export function mapBackendStatus(status) {
    if (status === "PII Detected") return "Modified";
    if (status === "Safe") return "Protected";
    return "Blocked";
}

export async function apiLogin(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    return res;
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
