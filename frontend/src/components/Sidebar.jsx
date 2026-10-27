import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import EclipseLogo from './EclipseLogo';

export default function Sidebar({
    collapsed,
    onToggleCollapse,
    currentPage,
    onNavigate,
    onOpenSearch,
    onOpenRename,
    onOpenDelete,
    onOpenLogin,
    onToggleProfileDropdown,
    profileBtnRef
}) {
    const { currentUser, authToken } = useAuth();
    const {
        conversations,
        currentConversationId,
        openConversation,
        newChat,
        togglePinConversation,
        deleteConversation
    } = useChat();

    const [activeMenuId, setActiveMenuId] = useState(null);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('eclipseTheme') || 'dark';
    });

    useEffect(() => {
        const handleThemeChange = () => {
            setTheme(localStorage.getItem('eclipseTheme') || 'dark');
        };
        window.addEventListener('eclipse-theme-change', handleThemeChange);
        window.addEventListener('storage', handleThemeChange);
        return () => {
            window.removeEventListener('eclipse-theme-change', handleThemeChange);
            window.removeEventListener('storage', handleThemeChange);
        };
    }, []);

    const handleToggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('eclipseTheme', nextTheme);
        const root = document.documentElement;
        if (nextTheme === 'light') {
            root.setAttribute('data-theme', 'light');
        } else {
            root.removeAttribute('data-theme');
        }
        window.dispatchEvent(new Event('eclipse-theme-change'));
    };

    // Close any open chat item menu when clicking anywhere else
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveMenuId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleOpenChat = (id) => {
        openConversation(id);
        if (currentPage !== 'chat') {
            onNavigate('chat');
        }
    };

    const handleNewChat = () => {
        newChat();
        if (currentPage !== 'chat') {
            onNavigate('chat');
        }
    };

    const handleProfileClick = (e) => {
        if (currentUser) {
            onToggleProfileDropdown();
        } else {
            onOpenLogin();
        }
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar">
            <div className="sidebar-top">
                <div className="sidebar-toggle-wrapper">
                    <button
                        id="toggleSidebar"
                        className="icon-btn tooltip"
                        data-tooltip="Toggle Sidebar"
                        onClick={(e) => {
                            e.currentTarget.blur();
                            onToggleCollapse();
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.blur();
                        }}
                        aria-label="Toggle Sidebar"
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>
                </div>
                <div className="logo">
                    <EclipseLogo className="sidebar-brand-logo" alt="Eclipse" />
                    <span
                        className="logo-text"
                        style={{ userSelect: 'none' }}
                        draggable="false"
                    >
                        Eclipse
                    </span>
                </div>
            </div>

            {/* NEW CHAT BUTTON */}
            <button
                className="new-chat-btn tooltip"
                data-tooltip="New Chat"
                onClick={(e) => {
                    e.currentTarget.blur();
                    handleNewChat();
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.blur();
                }}
            >
                <i className="fa-solid fa-plus"></i>
                <span style={{ userSelect: 'none' }} draggable="false">
                    New Chat
                </span>
            </button>

            {/* NAVIGATION */}
            <nav className="nav-links">
                <a
                    href="#"
                    className="tooltip search-nav-btn"
                    id="searchBtn"
                    data-tooltip="Search Chats"
                    onClick={(e) => {
                        e.preventDefault();
                        e.currentTarget.blur();
                        onOpenSearch();
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.blur();
                    }}
                >
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <span style={{ userSelect: 'none' }} draggable="false">
                        Search Chats
                    </span>
                </a>

                {currentUser?.is_admin && (
                    <a
                        href={`http://${window.location.hostname || 'localhost'}:5174/admin`}
                        className="tooltip admin-nav-btn"
                        id="adminSidebarBtn"
                        data-tooltip="Admin Dashboard"
                        onClick={(e) => {
                            e.preventDefault();
                            const hostname = window.location.hostname || 'localhost';
                            const baseUrl = `http://${hostname}:5174/admin`;
                            let url = baseUrl;
                            if (currentUser?.is_admin) {
                                try {
                                    document.cookie = 'eclipse_logged_out=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                                    document.cookie = 'eclipse_logged_out=; path=/admin; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                                } catch {}
                                const token = localStorage.getItem('eclipse_admin_token') || authToken;
                                const currentTheme = localStorage.getItem(`eclipseTheme_${currentUser.user_id}`) || localStorage.getItem('eclipseTheme') || 'dark';
                                const payload = encodeURIComponent(JSON.stringify({ token, user: currentUser, theme: currentTheme }));
                                url = `${baseUrl}#session=${payload}`;
                                try {
                                    document.cookie = `eclipse_admin_shared=${payload}; path=/; max-age=604800; SameSite=Lax`;
                                } catch {}
                            }
                            window.location.href = url;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.blur();
                        }}
                        style={{ color: 'var(--accent-primary, #8B7CFF)' }}
                    >
                        <i className="fa-solid fa-shield-halved" style={{ color: 'var(--accent-primary, #8B7CFF)' }}></i>
                        <span style={{ userSelect: 'none', color: 'var(--accent-primary, #8B7CFF)', fontWeight: 600 }} draggable="false">
                            Admin Dashboard
                        </span>
                    </a>
                )}
            </nav>

            {/* RECENT CHATS */}
            <div className="recent-container">
                <div
                    className="recent-title"
                    style={{ userSelect: 'none' }}
                    draggable="false"
                >
                    Recent Chats
                </div>

                <div
                    id="recentChats"
                    className="recent-chats"
                    style={{ userSelect: 'none' }}
                    draggable="false"
                >
                    {conversations.length === 0 ? (
                        <div className="empty-recents">No recent chats yet.</div>
                    ) : (
                        conversations.map((chat) => (
                            <div
                                key={chat.id}
                                className={`chat-item ${chat.pinned ? 'pinned' : ''} ${String(currentConversationId) === String(chat.id) &&
                                    currentPage === 'chat'
                                    ? 'active'
                                    : ''
                                    }`}
                            >
                                <span
                                    className="chat-title"
                                    onClick={() => handleOpenChat(chat.id)}
                                >
                                    {chat.title}
                                </span>

                                <button
                                    className="chat-menu-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(
                                            activeMenuId === chat.id ? null : chat.id
                                        );
                                    }}
                                >
                                    <i className="fa-solid fa-ellipsis"></i>
                                </button>

                                <div
                                    className={`chat-menu ${activeMenuId === chat.id ? 'active' : ''
                                        }`}
                                >
                                    <button
                                        className="rename-chat"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            onOpenRename(chat);
                                        }}
                                    >
                                        <i className="fa-solid fa-pen"></i>
                                        Rename Chat
                                    </button>

                                    <button
                                        className="pin-chat"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            togglePinConversation(chat.id);
                                        }}
                                    >
                                        <i className="fa-solid fa-thumbtack"></i>
                                        {chat.pinned ? 'Unpin Chat' : 'Pin Chat'}
                                    </button>

                                    <button
                                        className="delete-chat"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            if (onOpenDelete) {
                                                onOpenDelete(chat);
                                            } else {
                                                deleteConversation(chat.id);
                                            }
                                        }}
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                        Delete Chat
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SIDEBAR FOOTER: THEME TOGGLE & PROFILE */}
            <div className="sidebar-footer">
                {/* THEME TOGGLE (Immediately above user profile) */}
                <button
                    type="button"
                    className="sidebar-theme-toggle tooltip"
                    id="sidebarThemeToggle"
                    data-tooltip={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    onClick={(e) => {
                        e.currentTarget.blur();
                        handleToggleTheme();
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.blur();
                    }}
                    aria-label="Toggle Theme"
                >
                    <div className="theme-toggle-icon">
                        <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
                    </div>
                    {!collapsed && (
                        <span className="theme-toggle-label" style={{ userSelect: 'none' }} draggable="false">
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                    )}
                </button>

                {/* PROFILE */}
                <div
                    className="profile-area"
                    id="profileBtn"
                    ref={profileBtnRef}
                    onClick={handleProfileClick}
                    style={{ cursor: 'pointer' }}
                    aria-label={currentUser ? 'Open Profile Menu' : 'Sign In'}
                    tabIndex={collapsed ? 0 : undefined}
                    role={collapsed ? 'button' : undefined}
                    onKeyDown={(e) => {
                        if (collapsed && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleProfileClick(e);
                        }
                    }}
                >
                    <div className="profile-circle">
                        <i className="fa-solid fa-user"></i>
                    </div>

                    <div className="profile-details">
                        <span
                            className="username"
                            style={{ userSelect: 'none' }}
                            draggable="false"
                        >
                            {currentUser ? (currentUser.name || currentUser.username || 'User') : 'Sign In'}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
