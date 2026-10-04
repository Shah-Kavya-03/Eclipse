import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export default function Sidebar({
    collapsed,
    onToggleCollapse,
    currentPage,
    onNavigate,
    onOpenSearch,
    onOpenRename,
    onOpenLogin,
    onToggleProfileDropdown,
    profileBtnRef
}) {
    const { currentUser } = useAuth();
    const {
        conversations,
        currentConversationId,
        openConversation,
        newChat,
        togglePinConversation,
        deleteConversation
    } = useChat();

    const [activeMenuId, setActiveMenuId] = useState(null);

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

                        onClick={onToggleCollapse}
                        aria-label="Toggle Sidebar"
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    <span className="sidebar-toggle-tooltip">
                        Toggle Sidebar
                    </span>
                </div>
                <div className="logo">
                    <div className="logo-icon">
                        <i className="fa-solid fa-shield-halved"></i>
                    </div>
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
                onClick={handleNewChat}
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
                    className="tooltip"
                    id="searchBtn"
                    data-tooltip="Search Chats"
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenSearch();
                    }}
                >
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <span style={{ userSelect: 'none' }} draggable="false">
                        Search Chats
                    </span>
                </a>
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
                                            deleteConversation(chat.id);
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

            {/* PROFILE */}
            <div
                className="profile-area"
                id="profileBtn"
                ref={profileBtnRef}
                onClick={handleProfileClick}
                style={{ cursor: 'pointer' }}
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
                        {currentUser ? currentUser.name : 'Log In'}
                    </span>

                    <small style={{ userSelect: 'none' }} draggable="false">
                        {currentUser ? currentUser.email : 'Guest User'}
                    </small>
                </div>
            </div>
        </aside>
    );
}
