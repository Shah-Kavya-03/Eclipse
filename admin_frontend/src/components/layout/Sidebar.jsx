import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, AlertTriangle,
  ScrollText, FileDown, Settings, Activity, UserCog,
  ChevronLeft, ChevronRight, LogOut, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { EclipseLogo } from '../ui/EclipseLogo.jsx';

const NAV_ITEMS = [
  { path: '/admin',            label: 'Overview',         icon: LayoutDashboard, exact: true },
  { path: '/admin/users',      label: 'Users',            icon: Users },
  { path: '/admin/analytics',  label: 'Guardrail Analytics', icon: BarChart3 },
  { path: '/admin/anomalies',  label: 'Anomalies',        icon: AlertTriangle },
  { path: '/admin/logs',       label: 'Logs & Audit',     icon: ScrollText },
  { path: '/admin/reports',    label: 'Reports',          icon: FileDown },
  { path: '/admin/settings',   label: 'Settings',         icon: Settings },
  { path: '/admin/system-health', label: 'System Health', icon: Activity },
  { path: '/admin/account',    label: 'Admin Account',    icon: UserCog },
];

export function Sidebar({ collapsed, onToggle }) {
  const { logout, user, token } = useAuth();
  const location         = useLocation();

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <EclipseLogo size={28} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="sidebar-logo-text">Eclipse</div>
          <div className="sidebar-logo-sub">Admin Panel</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={Boolean(item.exact)}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              data-tooltip={item.label}
              aria-label={item.label}
            >
              <Icon className="sidebar-item-icon" size={18} />
              <span className="sidebar-item-label">{item.label}</span>
            </NavLink>
          );
        })}

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>Application</div>
        <a
          href={`http://${typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'}:5173/`}
          className="sidebar-item"
          data-tooltip="User Chat"
          aria-label="User Chat"
          onClick={(e) => {
            e.preventDefault();
            const hostname = window.location.hostname || 'localhost';
            let url = `http://${hostname}:5173/`;
            if (token && user) {
              const currentTheme = localStorage.getItem('eclipse_admin_theme') || 'dark';
              const payload = encodeURIComponent(JSON.stringify({ token, user, theme: currentTheme }));
              url = `http://${hostname}:5173/#session=${payload}`;
            }
            window.location.href = url;
          }}
        >
          <MessageSquare className="sidebar-item-icon" size={18} style={{ color: 'var(--accent-secondary)' }} />
          <span className="sidebar-item-label">User Chat</span>
        </a>
      </nav>

      {/* Bottom: user info + collapse toggle */}
      <div className="sidebar-toggle">
        <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {!collapsed && user && (
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={logout}
            className="btn btn-icon btn-ghost"
            title="Log out"
            aria-label="Log out"
            style={{ padding: 6 }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
