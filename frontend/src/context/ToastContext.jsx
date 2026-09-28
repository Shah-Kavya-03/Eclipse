import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, leaving: false }]);

        setTimeout(() => {
            setToasts((prev) =>
                prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
            );
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 300);
        }, 2500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, toast: showToast }}>
            {children}
            <div id="toastContainer">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`toast ${t.type}`}
                        style={
                            t.leaving
                                ? {
                                      opacity: 0,
                                      transform: 'translateX(40px)',
                                      transition: 'opacity 0.3s ease, transform 0.3s ease'
                                  }
                                : undefined
                        }
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
