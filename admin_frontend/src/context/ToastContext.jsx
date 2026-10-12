import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const dismiss = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    setToasts((prev) => {
      // 1. Prevent duplicate active toasts with the same type and title/message
      const isDuplicate = prev.some(
        (t) => t.type === type && t.title === title && t.message === message
      );
      if (isDuplicate) return prev;

      const id = ++_id;
      timers.current[id] = setTimeout(() => dismiss(id), duration);

      // 2. Cap at max 4 visible notifications (evict oldest if overflow)
      const next = [...prev, { id, type, title, message }];
      if (next.length > 4) {
        const removed = next.shift();
        if (timers.current[removed.id]) {
          clearTimeout(timers.current[removed.id]);
          delete timers.current[removed.id];
        }
      }
      return next;
    });
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (title, message) => addToast({ type: 'success', title, message }),
    error:   (title, message) => addToast({ type: 'error',   title, message, duration: 6000 }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info:    (title, message) => addToast({ type: 'info',    title, message }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

/* ---- Toast container UI ---- */

const ICONS = {
  success: <CheckCircle size={18} color="var(--accent-success)" />,
  error:   <XCircle    size={18} color="var(--accent-danger)"  />,
  warning: <AlertTriangle size={18} color="var(--accent-warning)" />,
  info:    <Info       size={18} color="var(--accent-primary)" />,
};

function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} role="alert">
          <div className="toast-icon">{ICONS[t.type]}</div>
          <div className="toast-body">
            {t.title   && <div className="toast-title">{t.title}</div>}
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Close">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
