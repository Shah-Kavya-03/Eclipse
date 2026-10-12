import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare, User, Search, RefreshCw, Trash2, Edit3,
  FileDown, Clock, Bot, AlertCircle, Check
} from 'lucide-react';
import { conversationsApi } from '../api/conversationsApi.js';
import { usersApi } from '../api/usersApi.js';
import { reportsApi } from '../api/reportsApi.js';
import { DataTable } from '../components/tables/DataTable.jsx';
import { StatusBadge } from '../components/ui/Badges.jsx';
import { Modal, ConfirmModal } from '../components/ui/Modal.jsx';
import { formatDateTime, downloadBlob } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUserId = searchParams.get('userId') || '';

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState(null);

  // Conversation Detail Modal
  const [activeSession, setActiveSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Rename Modal
  const [renameTarget, setRenameTarget] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Report Download State
  const [downloadingReport, setDownloadingReport] = useState(false);

  const toast = useToast();

  // Load registered users to populate the user selector
  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await usersApi.listUsers();
        if (!cancelled) {
          const list = res?.users || [];
          setUsers(list);
          if (!selectedUserId && list.length > 0) {
            setSelectedUserId(list[0].user_id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          toast.error('Users Load Error', 'Could not load users list for conversation inspector.');
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch conversations when selectedUserId changes
  const fetchConversations = useCallback(async () => {
    if (!selectedUserId) {
      setConversations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await conversationsApi.listByUser(selectedUserId);
      setConversations(res?.conversations || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch conversations.';
      setError(msg);
      toast.error('Conversations Error', msg);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, toast]);

  useEffect(() => {
    fetchConversations();
    if (selectedUserId) {
      setSearchParams({ userId: selectedUserId }, { replace: true });
    }
  }, [selectedUserId, fetchConversations, setSearchParams]);

  // Open conversation details
  const handleOpenConversation = async (session) => {
    setActiveSession(session);
    setLoadingDetail(true);
    setSessionDetail(null);
    try {
      const res = await conversationsApi.getConversation(session.session_id);
      setSessionDetail(res);
    } catch (err) {
      toast.error('Load Error', 'Failed to retrieve full conversation messages.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Rename conversation
  const handleRename = async () => {
    if (!renameTarget || !newTitle.trim()) return;
    setRenaming(true);
    try {
      const res = await conversationsApi.rename(renameTarget.session_id, newTitle.trim());
      setConversations((prev) =>
        prev.map((c) => (c.session_id === renameTarget.session_id ? { ...c, title: res.title } : c))
      );
      toast.success('Conversation Renamed', `New title: "${res.title}"`);
      setRenameTarget(null);
    } catch (err) {
      toast.error('Rename Failed', err?.response?.data?.detail || 'Could not update conversation title.');
    } finally {
      setRenaming(false);
    }
  };

  // Delete conversation
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await conversationsApi.deleteConversation(deleteTarget.session_id);
      setConversations((prev) => prev.filter((c) => c.session_id !== deleteTarget.session_id));
      if (activeSession?.session_id === deleteTarget.session_id) {
        setActiveSession(null);
      }
      toast.success('Conversation Deleted', 'Session removed from database.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Delete Failed', err?.response?.data?.detail || 'Could not delete conversation.');
    } finally {
      setDeleting(false);
    }
  };

  // Download PDF Report
  const handleDownloadSessionReport = async (sessionId) => {
    setDownloadingReport(true);
    try {
      const { blob, filename } = await reportsApi.downloadReport('session', sessionId);
      downloadBlob(blob, filename);
      toast.success('Report Downloaded', `Saved ${filename}`);
    } catch (err) {
      toast.error('Download Failed', err?.response?.data?.detail || 'Could not generate session PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const selectedUserObj = users.find((u) => u.user_id === selectedUserId);

  const columns = [
    {
      key: 'title',
      label: 'Conversation Title',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.title || 'Untitled Chat'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {row.session_id}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Security Status',
      sortable: true,
      render: (status) => <StatusBadge status={status || 'Safe'} />,
    },
    {
      key: 'model_used',
      label: 'LLM Model',
      sortable: true,
      render: (model, row) => (
        <div>
          <span style={{ fontSize: '0.8125rem' }}>{model || '—'}</span>
          {row.api_used && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              via {row.api_used.toUpperCase()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'message_count',
      label: 'Messages',
      sortable: true,
      render: (count) => (
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{count ?? 0}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (val) => formatDateTime(val),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Download PDF report"
            onClick={() => handleDownloadSessionReport(row.session_id)}
            disabled={downloadingReport}
          >
            <FileDown size={13} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Rename session"
            onClick={() => {
              setRenameTarget(row);
              setNewTitle(row.title || '');
            }}
          >
            <Edit3 size={13} />
          </button>
          <button
            className="btn btn-danger btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Delete session"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Conversations</h1>
          <p className="page-subtitle">
            Inspect conversation transcripts, guardrail events, and session history per user
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchConversations}
          disabled={loading || !selectedUserId}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* User Selector Dropdown & Info Banner */}
      <div className="card section-gap" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label className="form-label" htmlFor="user-select" style={{ marginBottom: 6 }}>
              Select Registered User to View History
            </label>
            <select
              id="user-select"
              className="form-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={usersLoading}
            >
              {users.length === 0 ? (
                <option value="">No users found</option>
              ) : (
                users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name || 'Unnamed'} ({u.email}) — ID: {u.user_id.slice(-6)}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedUserObj && (
            <div
              style={{
                display: 'flex',
                gap: 16,
                padding: '10px 16px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selected User</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedUserObj.name || selectedUserObj.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User ID</div>
                <div className="mono" style={{ fontSize: '0.75rem' }}>{selectedUserObj.user_id}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sessions Stored</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{conversations.length}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversations Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={conversations}
            loading={loading}
            error={error}
            onRetry={fetchConversations}
            onRowClick={(row) => handleOpenConversation(row)}
            emptyTitle={selectedUserId ? 'No conversations found for this user' : 'Please select a user'}
            emptyDesc={
              selectedUserId
                ? 'This user has not initiated any chat sessions yet or their history was cleared.'
                : 'Choose a user from the selector above to view their recorded conversation sessions.'
            }
            initialPageSize={25}
          />
        </div>
      </div>

      {/* Conversation Messages Drawer / Modal */}
      <Modal
        open={Boolean(activeSession)}
        onClose={() => setActiveSession(null)}
        title={activeSession?.title || 'Conversation Transcript'}
        maxWidth={720}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleDownloadSessionReport(activeSession.session_id)}
              disabled={downloadingReport}
            >
              <FileDown size={14} /> Download PDF Audit Report
            </button>
            <button className="btn btn-primary" onClick={() => setActiveSession(null)}>
              Close
            </button>
          </div>
        }
      >
        {activeSession && (
          <div>
            {/* Session metadata summary */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                padding: 12,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 16,
                fontSize: '0.8125rem',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Session ID: </span>
                <span className="mono">{activeSession.session_id}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Model: </span>
                <span>{activeSession.model_used || 'Default'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                <StatusBadge status={activeSession.status || 'Safe'} />
              </div>
            </div>

            {/* Messages Feed */}
            {loadingDetail ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading conversation message history…
              </div>
            ) : !sessionDetail?.messages?.length ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No message exchanges recorded for this session.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '55vh', overflowY: 'auto', paddingRight: 6 }}>
                {sessionDetail.messages.map((m, idx) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {isUser ? <User size={12} /> : <Bot size={12} />}
                        <span>{isUser ? 'User' : 'Assistant'}</span>
                        {m.timestamp && <span>• {formatDateTime(m.timestamp)}</span>}
                      </div>

                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: isUser ? 'var(--accent-primary-bg)' : 'var(--bg-elevated)',
                          border: `1px solid ${isUser ? 'rgba(139,124,255,.3)' : 'var(--border)'}`,
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Rename Modal */}
      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename Conversation"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setRenameTarget(null)} disabled={renaming}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleRename} disabled={renaming || !newTitle.trim()}>
              {renaming ? 'Saving…' : 'Save Title'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label" htmlFor="rename-input">Conversation Title</label>
          <input
            id="rename-input"
            type="text"
            className="form-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter title…"
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Conversation Session?"
        message={`Are you sure you want to delete session "${deleteTarget?.title || deleteTarget?.session_id}"? Note: In accordance with DPDP Act 2023 compliance, audit log entries will remain preserved.`}
        confirmLabel="Delete Conversation"
        danger={true}
        loading={deleting}
      />
    </div>
  );
}
