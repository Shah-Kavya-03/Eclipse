import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';

// Apply saved theme preference immediately to avoid flash
(function applyInitialTheme() {
    const theme = localStorage.getItem('eclipseTheme') || 'dark';
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (!prefersDark) {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }
    // 'dark' is the default — no attribute needed
})();

//document.documentElement.setAttribute('data-theme', 'light');
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ToastProvider>
            <AuthProvider>
                <ChatProvider>
                    <App />
                </ChatProvider>
            </AuthProvider>
        </ToastProvider>
    </React.StrictMode>
);
