import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useChat } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuditPage from './pages/AuditPage';
import ProfileDropdown from './components/ProfileDropdown';
import SearchModal from './components/modals/SearchModal';
import RenameModal from './components/modals/RenameModal';
import LoginModal from './components/modals/LoginModal';
import SignupModal from './components/modals/SignupModal';
import AccountModal from './components/modals/AccountModal';
import SettingsModal from './components/modals/SettingsModal';
import LogoutModal from './components/modals/LogoutModal';
import DeleteChatModal from './components/modals/DeleteChatModal';
import './css/style.css';
import './css/audit.css';
import './css/light-theme.css';

export default function App() {
    const { currentUser, logout } = useAuth();
    const { openConversation, renameConversation, deleteConversation } = useChat();

    // Navigation: 'chat' | 'audit'
    const [currentPage, setCurrentPage] = useState(() => {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (path.includes('audit') || hash.includes('audit')) {
            return 'audit';
        }
        return 'chat';
    });

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Modals state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [renameState, setRenameState] = useState({ isOpen: false, chat: null });
    const [deleteState, setDeleteState] = useState({ isOpen: false, chat: null });
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isSignupOpen, setIsSignupOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [accountTab, setAccountTab] = useState('information');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    const profileBtnRef = useRef(null);

    const handleSwitchAccount = async () => {
        setIsProfileDropdownOpen(false);
        setIsAccountOpen(false);
        if (logout) {
            await logout();
        }
        setIsLoginOpen(true);
    };

    // Sync URL when page changes
    const navigateTo = (page) => {
        setCurrentPage(page);
        const newUrl = page === 'audit' ? '#audit' : '#chat';
        window.history.pushState(null, '', newUrl);
    };

    // Listen to popstate (back/forward)
    useEffect(() => {
        const handlePopState = () => {
            const hash = window.location.hash.toLowerCase();
            const path = window.location.pathname.toLowerCase();
            if (hash.includes('audit') || path.includes('audit')) {
                setCurrentPage('audit');
            } else {
                setCurrentPage('chat');
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Run only ONCE on initial mount — do not depend on unstable context callbacks
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (params.get('logged_out') === '1') {
            window.history.replaceState({}, '', window.location.pathname);
            if (!currentUser && logout) {
                logout(true);
            }
        }

        const openId = params.get('open');
        if (openId) {
            openConversation(openId);
            setCurrentPage('chat');
        }

        if (params.get('auth') === 'login' && !currentUser) {
            setIsLoginOpen(true);
        }

        if (params.toString()) {
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        }
    }, []); // Empty dependency array ensures it runs once on mount

    // Secure cross-window session sharing for Admin Dashboard (port 5174)
    useEffect(() => {
        const handleSessionRequest = (e) => {
            if (e.origin !== 'http://localhost:5174' && e.origin !== 'http://127.0.0.1:5174') return;
            if (e.data?.type === 'ECLIPSE_REQUEST_SESSION') {
                const token = localStorage.getItem('eclipse_admin_token') || localStorage.getItem('guardrailToken');
                const userRaw = localStorage.getItem('guardrailUser');
                if (token && userRaw) {
                    try {
                        const parsedUser = JSON.parse(userRaw);
                        if (parsedUser?.is_admin) {
                            e.source?.postMessage(
                                {
                                    type: 'ECLIPSE_SESSION_RESPONSE',
                                    token,
                                    user: parsedUser,
                                },
                                e.origin
                            );
                        }
                    } catch {}
                }
            }
        };
        window.addEventListener('message', handleSessionRequest);
        return () => window.removeEventListener('message', handleSessionRequest);
    }, []);

    const handleSaveRename = async (newTitle) => {
        if (!renameState.chat) return;
        const success = await renameConversation(renameState.chat.id, newTitle);
        if (success) {
            setRenameState({ isOpen: false, chat: null });
        }
    };

    return (
        <div className="app">
            {/* SIDEBAR */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                currentPage={currentPage}
                onNavigate={navigateTo}
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenRename={(chat) => setRenameState({ isOpen: true, chat })}
                onOpenDelete={(chat) => setDeleteState({ isOpen: true, chat })}
                onOpenLogin={() => setIsLoginOpen(true)}
                onToggleProfileDropdown={() =>
                    setIsProfileDropdownOpen(!isProfileDropdownOpen)
                }
                profileBtnRef={profileBtnRef}
            />

            {/* MAIN PAGE */}
            {currentPage === 'chat' ? (
                <ChatArea onOpenLogin={() => setIsLoginOpen(true)} />
            ) : (
                <AuditPage />
            )}

            {/* PROFILE DROPDOWN */}
            <ProfileDropdown
                isOpen={isProfileDropdownOpen}
                onClose={() => setIsProfileDropdownOpen(false)}
                onOpenAccount={() => {
                    setAccountTab('information');
                    setIsAccountOpen(true);
                }}
                onOpenChangePassword={() => {
                    setAccountTab('password');
                    setIsAccountOpen(true);
                }}
                onOpenSwitchAccount={handleSwitchAccount}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenLogout={() => setIsLogoutOpen(true)}
                anchorRef={profileBtnRef}
            />

            {/* MODALS */}
            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />

            <RenameModal
                isOpen={renameState.isOpen}
                initialTitle={renameState.chat?.title || ''}
                onSave={handleSaveRename}
                onClose={() => setRenameState({ isOpen: false, chat: null })}
            />

            <DeleteChatModal
                isOpen={deleteState.isOpen}
                chat={deleteState.chat}
                onConfirm={deleteConversation}
                onClose={() => setDeleteState({ isOpen: false, chat: null })}
            />

            <LoginModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onOpenSignup={() => {
                    setIsLoginOpen(false);
                    setIsSignupOpen(true);
                }}
            />

            <SignupModal
                isOpen={isSignupOpen}
                onClose={() => setIsSignupOpen(false)}
                onBackToLogin={() => {
                    setIsSignupOpen(false);
                    setIsLoginOpen(true);
                }}
            />

            <AccountModal
                isOpen={isAccountOpen}
                initialTab={accountTab}
                onClose={() => setIsAccountOpen(false)}
                onOpenSignout={() => setIsLogoutOpen(true)}
                onSwitchAccount={handleSwitchAccount}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <LogoutModal
                isOpen={isLogoutOpen}
                onClose={() => setIsLogoutOpen(false)}
            />
        </div>
    );
}
