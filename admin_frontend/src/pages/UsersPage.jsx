import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon, Search, AlertTriangle, Shield,
  RefreshCw, MessageSquare, Flag, FlagOff, UserCheck
} from 'lucide-react';
import { usersApi } from '../api/usersApi.js';
import { DataTable } from '../components/tables/DataTable.jsx';
import { RoleBadge } from '../components/ui/Badges.jsx';
import { Modal, ConfirmModal } from '../components/ui/Modal.jsx';
import { formatDateTime, formatNumber } from '../utils/helpers.js';
import { useToast } from '../context/ToastContext.jsx';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all | flagged | admin | standard

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [flagUserTarget, setFlagUserTarget] = useState(null);
  const [flagging, setFlagging] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.listUsers();
      setUsers(data?.users || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch registered users.';
      setError(msg);
      toast.error('Load Error', msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleFlag = async () => {
    if (!flagUserTarget) return;
    setFlagging(true);
    try {
      const res = await usersApi.flagUser(flagUserTarget.user_id);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === flagUserTarget.user_id ? { ...u, is_flagged: res.is_flagged } : u))
      );
      toast.success(
        res.is_flagged ? 'User Flagged' : 'Flag Cleared',
        `User ${flagUserTarget.name || flagUserTarget.email} flag state set to ${res.is_flagged ? 'flagged' : 'unflagged'}.`
      );
      setFlagUserTarget(null);
    } catch (err) {
      toast.error('Action Failed', err?.response?.data?.detail || 'Could not update user flag state.');
    } finally {
      setFlagging(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.user_id || '').toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filterRole === 'flagged') return u.is_flagged;
      if (filterRole === 'admin') return u.is_admin;
      if (filterRole === 'standard') return !u.is_admin && !u.is_flagged;
      return true;
    });
  }, [users, search, filterRole]);

  const columns = [
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name || 'Unnamed User'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>
        </div>
      ),
    },
    {
      key: 'is_admin',
      label: 'Role',
      sortable: true,
      render: (_, row) => <RoleBadge isAdmin={row.is_admin} isFlagged={row.is_flagged} />,
    },
    {
      key: 'is_flagged',
      label: 'Security Status',
      sortable: true,
      render: (flagged) =>
        flagged ? (
          <span className="badge badge-danger">
            <AlertTriangle size={12} /> Suspicious
          </span>
        ) : (
          <span className="badge badge-success">
            <UserCheck size={12} /> Clean
          </span>
        ),
    },
    {
      key: 'request_count',
      label: 'Guardrail Requests',
      sortable: true,
      render: (count) => (
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {formatNumber(count ?? 0)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered On',
      sortable: true,
      render: (val) => formatDateTime(val),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button
            className={`btn btn-sm ${row.is_flagged ? 'btn-ghost' : 'btn-danger'}`}
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title={row.is_flagged ? 'Remove flag' : 'Flag as suspicious'}
            onClick={() => setFlagUserTarget(row)}
          >
            {row.is_flagged ? <FlagOff size={13} /> : <Flag size={13} />}
            {row.is_flagged ? 'Unflag' : 'Flag'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Browse user conversation history"
            onClick={() => navigate(`/admin/conversations?userId=${row.user_id}`)}
          >
            <MessageSquare size={13} /> Chats
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
          <h1 className="page-title">User Directory</h1>
          <p className="page-subtitle">
            Inspect registered accounts, activity history, and security flags
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-row section-gap">
        <div className="search-bar" style={{ minWidth: 280, flex: 1 }}>
          <Search className="search-bar-icon" size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, or user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 160 }}
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">All Users ({users.length})</option>
          <option value="flagged">Flagged ({users.filter((u) => u.is_flagged).length})</option>
          <option value="admin">Administrators ({users.filter((u) => u.is_admin).length})</option>
          <option value="standard">Standard ({users.filter((u) => !u.is_admin && !u.is_flagged).length})</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={filteredUsers}
            loading={loading}
            error={error}
            onRetry={fetchUsers}
            onRowClick={(row) => setSelectedUser(row)}
            emptyTitle="No users match your criteria"
            emptyDesc="Try clearing the search query or selecting a different role filter."
            initialPageSize={25}
          />
        </div>
      </div>

      {/* User Details Modal */}
      <Modal
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="User Profile & Security Record"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                const uid = selectedUser.user_id;
                setSelectedUser(null);
                navigate(`/admin/conversations?userId=${uid}`);
              }}
            >
              <MessageSquare size={14} /> View User Chats
            </button>
            <button className="btn btn-primary" onClick={() => setSelectedUser(null)}>
              Done
            </button>
          </div>
        }
      >
        {selectedUser && (
          <div className="detail-panel">
            <div className="detail-field">
              <span className="detail-field-label">User ID</span>
              <span className="detail-field-value mono">{selectedUser.user_id}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Full Name</span>
              <span className="detail-field-value">{selectedUser.name || '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Email Address</span>
              <span className="detail-field-value">{selectedUser.email}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Role</span>
              <span className="detail-field-value">
                <RoleBadge isAdmin={selectedUser.is_admin} isFlagged={selectedUser.is_flagged} />
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Suspicious Flag</span>
              <span className="detail-field-value">
                {selectedUser.is_flagged ? (
                  <span className="badge badge-danger">Active Flag</span>
                ) : (
                  <span className="badge badge-success">Not Flagged</span>
                )}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Guardrail Requests</span>
              <span className="detail-field-value">{formatNumber(selectedUser.request_count ?? 0)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Registration Date</span>
              <span className="detail-field-value">{formatDateTime(selectedUser.created_at)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Flag / Unflag Modal */}
      <ConfirmModal
        open={Boolean(flagUserTarget)}
        onClose={() => setFlagUserTarget(null)}
        onConfirm={handleToggleFlag}
        title={flagUserTarget?.is_flagged ? 'Clear User Security Flag?' : 'Flag User as Suspicious?'}
        message={
          flagUserTarget?.is_flagged
            ? `Are you sure you want to remove the suspicious security flag from ${flagUserTarget.name || flagUserTarget.email}?`
            : `Flagging ${flagUserTarget?.name || flagUserTarget?.email} will mark their account as suspicious across admin metrics.`
        }
        confirmLabel={flagUserTarget?.is_flagged ? 'Remove Flag' : 'Flag Account'}
        danger={!flagUserTarget?.is_flagged}
        loading={flagging}
      />
    </div>
  );
}
