import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';

export default function SearchModal({ isOpen, onClose }) {
    const { conversations, openConversation } = useChat();
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

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

    const filtered = conversations.filter((chat) =>
        chat.title.toLowerCase().includes(query.trim().toLowerCase())
    );

    return (
        <div
            className="modal-overlay active"
            id="searchOverlay"
            onClick={(e) => {
                if (e.target.id === 'searchOverlay') onClose();
            }}
        >
            <div className="modal search-modal">
                <div className="modal-header">
                    <h2 style={{ userSelect: 'none' }} draggable="false">
                        Search Chats
                    </h2>
                    <button className="closeModal" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <input
                    type="text"
                    id="searchInput"
                    ref={inputRef}
                    placeholder="Search conversations..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                <div
                    className="search-results"
                    id="searchResults"
                    style={{ userSelect: 'none' }}
                    draggable="false"
                >
                    {filtered.length === 0 ? (
                        <div className="no-results">No chats found.</div>
                    ) : (
                        filtered.map((chat) => (
                            <div
                                key={chat.id}
                                className="search-item"
                                onClick={() => {
                                    openConversation(chat.id);
                                    onClose();
                                }}
                            >
                                {chat.title}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
