import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export default function LogoutModal({ isOpen, onClose }) {
    const { logout } = useAuth();
    const { newChat } = useChat();

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        await logout();
        newChat();
        onClose();
    };

    return (
        <div
            className="modal-overlay active"
            id="logoutOverlay"
            onClick={(e) => {
                if (e.target.id === 'logoutOverlay') onClose();
            }}
        >
            <div className="modal">
                <div
                    className="modal-header"
                    style={{ userSelect: 'none' }}
                    draggable="false"
                >
                    <h2>Sign Out</h2>
                    <button className="closeModal" id="logoutClose" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div style={{ padding: '20px 0 10px', textAlign: 'center' }}>
                    <i
                        className="fa-solid fa-right-from-bracket"
                        style={{ fontSize: '42px', color: '#bb3af2', marginBottom: '18px' }}
                    ></i>
                    <p
                        style={{
                            color: '#CBD5E1',
                            fontSize: '16px',
                            lineHeight: 1.7,
                            userSelect: 'none'
                        }}
                        draggable="false"
                    >
                        Are you sure you want to sign out?
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                    <button
                        className="login-btn"
                        id="logoutConfirm"
                        style={{ userSelect: 'none' }}
                        draggable="false"
                        onClick={handleConfirm}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
