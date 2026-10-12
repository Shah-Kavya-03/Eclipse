import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';

// Pages
import { LoginPage } from './pages/LoginPage.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { ConversationsPage } from './pages/ConversationsPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { AnomaliesPage } from './pages/AnomaliesPage.jsx';
import { LogsPage } from './pages/LogsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { SystemHealthPage } from './pages/SystemHealthPage.jsx';
import { AccountPage } from './pages/AccountPage.jsx';

/**
 * Route protection guard that checks administrator authentication.
 */
function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        Verifying administrator credentials…
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/admin/login" element={<LoginPage />} />

            {/* Protected Admin Routes with Shared Layout */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="anomalies" element={<AnomaliesPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="system-health" element={<SystemHealthPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>

            {/* Root & Fallback Redirects */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
