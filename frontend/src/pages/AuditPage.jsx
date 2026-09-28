import React, { useState, useEffect, useCallback } from 'react';
import { apiGetLogs, apiGetDashboardStats, mapBackendStatus } from '../api/config';

export default function AuditPage() {
    const [auditLogs, setAuditLogs] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        safe: 0,
        blocked: 0,
        modified: 0
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [logsRes, statsRes] = await Promise.allSettled([
                apiGetLogs(),
                apiGetDashboardStats()
            ]);

            if (logsRes.status === 'fulfilled' && logsRes.value) {
                const logs = (logsRes.value.logs || []).map((log) => ({
                    id: log.session_id,
                    title: log.title || '(untitled)',
                    model: log.model_used || '—',
                    status: mapBackendStatus(log.status)
                }));
                setAuditLogs(logs);
            }

            if (statsRes.status === 'fulfilled' && statsRes.value) {
                const s = statsRes.value;
                setStats({
                    total: s.total ?? 0,
                    safe: s.safe ?? 0,
                    blocked: s.blocked ?? 0,
                    modified: s.pii_detected ?? 0
                });
            }
        } catch (err) {
            console.error('Failed to load audit page data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();

        const handleFocus = () => loadData();
        const handleVisibilityChange = () => {
            if (!document.hidden) loadData();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadData]);

    const filteredLogs = auditLogs.filter((chat) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
            String(chat.id).toLowerCase().includes(q) ||
            chat.title.toLowerCase().includes(q) ||
            (chat.model || '').toLowerCase().includes(q) ||
            (chat.status || '').toLowerCase().includes(q)
        );
    });

    return (
        <main className="main audit-main">
            <div className="audit-container">
                {/* Header */}
                <div className="audit-header">
                    <h1>Audit Logs</h1>
                    <p>Monitor every request processed by the AI Guardrail in real time.</p>
                </div>

                {/* SUMMARY CARDS */}
                <div className="audit-cards">
                    <div className="audit-card">
                        <div className="card-icon">
                            <i className="fa-solid fa-database"></i>
                        </div>
                        <div>
                            <h3>Total Requests</h3>
                            <span id="totalRequests">{stats.total}</span>
                        </div>
                    </div>

                    <div className="audit-card safe">
                        <div className="card-icon">
                            <i className="fa-solid fa-circle-check"></i>
                        </div>
                        <div>
                            <h3>Safe Requests</h3>
                            <span id="safeRequests">{stats.safe}</span>
                        </div>
                    </div>

                    <div className="audit-card blocked">
                        <div className="card-icon">
                            <i className="fa-solid fa-ban"></i>
                        </div>
                        <div>
                            <h3>Blocked Requests</h3>
                            <span id="blockedRequests">{stats.blocked}</span>
                        </div>
                    </div>

                    <div className="audit-card protected">
                        <div className="card-icon">
                            <i className="fa-solid fa-shield"></i>
                        </div>
                        <div>
                            <h3>Modified Responses</h3>
                            <span id="modifiedResponses">{stats.modified}</span>
                        </div>
                    </div>
                </div>

                {/* SEARCH BAR */}
                <div className="audit-search">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="text"
                        id="searchLogs"
                        placeholder="Search by Chat ID, Chat Name or AI Model..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* TABLE */}
                <div className="audit-table-container">
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Chat ID</th>
                                <th>Chat Name</th>
                                <th>AI Model</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="auditTableBody">
                            {filteredLogs.map((chat) => (
                                <tr key={chat.id}>
                                    <td>{chat.id}</td>
                                    <td>{chat.title}</td>
                                    <td>{chat.model || 'Gemini 2.5 Flash'}</td>
                                    <td>
                                        <span
                                            className={`status ${(
                                                chat.status || 'Protected'
                                            ).toLowerCase()}`}
                                        >
                                            {chat.status || 'Protected'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* EMPTY STATE */}
                    {filteredLogs.length === 0 && !loading && (
                        <div id="emptyAudit" className="empty-audit">
                            <i className="fa-solid fa-file-shield"></i>
                            <h3>No Audit Logs Yet</h3>
                            <p>
                                Chats will automatically appear here as users create
                                conversations.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
