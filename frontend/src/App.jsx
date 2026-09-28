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
import './css/style.css';
import './css/audit.css';

export default function App() {
    const { currentUser } = useAuth();
    const { openConversation, renameConversation, refreshConversationsFromBackend } = useChat();

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
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isSignupOpen, setIsSignupOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    const profileBtnRef = useRef(null);

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

    // Handle query params on initial load
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (currentUser?.user_id) {
            refreshConversationsFromBackend();
        }

        if (params.get('auth') === 'login' && !currentUser) {
            setIsLoginOpen(true);
        }

        const openId = params.get('open');
        if (openId) {
            openConversation(openId);
            setCurrentPage('chat');
        }

        if (params.toString()) {
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        }
    }, [currentUser, openConversation, refreshConversationsFromBackend]);

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
                onOpenAccount={() => setIsAccountOpen(true)}
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
                onClose={() => setIsAccountOpen(false)}
                onOpenSignout={() => setIsLogoutOpen(true)}
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
