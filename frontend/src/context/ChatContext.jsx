import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    apiSendChat,
    apiGetConversations,
    apiGetConversation,
    apiUpdateConversationTitle,
    apiDeleteConversation,
    mapBackendStatus
} from '../api/config';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ChatContext = createContext(null);

function sortConversationsList(list) {
    return [...list].sort((a, b) => {
        if ((b.pinned || false) !== (a.pinned || false)) {
            return (b.pinned || false) - (a.pinned || false);
        }
        return Number(b.id) - Number(a.id) || 0;
    });
}

export function ChatProvider({ children }) {
    const { currentUser } = useAuth();
    const { showToast } = useToast();

    const [conversations, setConversations] = useState(() => {
        if (!currentUser?.user_id) {
            return [];
        }
        const stored = localStorage.getItem('guardrailChats');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return [];
            }
        }
        return [];
    });

    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [isTyping, setIsTyping] = useState(false);

    // Save conversations to localStorage whenever they change (signed-in users only)
    useEffect(() => {
        if (currentUser?.user_id) {
            localStorage.setItem('guardrailChats', JSON.stringify(conversations));
        }
    }, [conversations, currentUser]);

    // Refresh conversations from backend for logged in users
    const refreshConversationsFromBackend = useCallback(async () => {
        if (!currentUser?.user_id) return;
        try {
            const data = await apiGetConversations(currentUser.user_id);
            const fetched = (data.conversations || []).map((conv) => ({
                id: conv.session_id,
                title: conv.title || 'New Chat',
                model: conv.model_used || 'Gemini 2.5 Flash',
                status: 'Protected',
                messages: [],
                pinned: false,
                loaded: false
            }));
            setConversations((prev) => {
                // Preserve local loaded message states or pinned states where matching
                const merged = fetched.map((f) => {
                    const existing = prev.find((p) => String(p.id) === String(f.id));
                    if (existing && existing.loaded) {
                        return {
                            ...f,
                            messages: existing.messages,
                            loaded: true,
                            pinned: existing.pinned || false
                        };
                    }
                    if (existing) {
                        return { ...f, pinned: existing.pinned || false };
                    }
                    return f;
                });
                return sortConversationsList(merged);
            });
        } catch (err) {
            console.error('Failed to load conversations from backend:', err);
        }
    }, [currentUser]);

    // When auth changes
    useEffect(() => {
        if (currentUser?.user_id) {
            refreshConversationsFromBackend();
        } else {
            // Guest mode: start fresh
            setConversations([]);
            setCurrentConversationId(null);
        }
    }, [currentUser, refreshConversationsFromBackend]);

    const currentConversation = conversations.find(
        (c) => String(c.id) === String(currentConversationId)
    ) || null;

    const openConversation = useCallback(
        async (id) => {
            setCurrentConversationId(id);
            const chat = conversations.find((c) => String(c.id) === String(id));
            if (!chat) return;

            // Lazy load messages if needed
            if (chat.loaded === false) {
                try {
                    const data = await apiGetConversation(id);
                    const loadedMessages = (data.messages || []).map((m) => ({
                        sender: m.sender === 'assistant' ? 'ai' : 'user',
                        text: m.text
                    }));
                    setConversations((prev) =>
                        prev.map((c) =>
                            String(c.id) === String(id)
                                ? { ...c, messages: loadedMessages, loaded: true }
                                : c
                        )
                    );
                } catch (err) {
                    console.error('Failed to load conversation history:', err);
                }
            }
        },
        [conversations]
    );

    const newChat = useCallback(() => {
        setCurrentConversationId(null);
        setIsTyping(false);
    }, []);

    const sendMessage = useCallback(
        async (text) => {
            const trimmed = text.trim();
            if (!trimmed || isTyping) return;

            let targetId = currentConversationId;
            let currentList = [...conversations];

            if (!targetId || !currentList.some((c) => String(c.id) === String(targetId))) {
                targetId = Date.now();
                const newConv = {
                    id: targetId,
                    title: trimmed.length > 35 ? trimmed.substring(0, 35) + '...' : trimmed,
                    model: 'Gemini 2.5 Flash',
                    status: 'Protected',
                    messages: [{ sender: 'user', text: trimmed }],
                    pinned: false,
                    loaded: true
                };
                currentList = [newConv, ...currentList];
                setCurrentConversationId(targetId);
                setConversations(sortConversationsList(currentList));
            } else {
                currentList = currentList.map((c) => {
                    if (String(c.id) === String(targetId)) {
                        return {
                            ...c,
                            messages: [...c.messages, { sender: 'user', text: trimmed }]
                        };
                    }
                    return c;
                });
                setConversations(currentList);
            }

            setIsTyping(true);

            try {
                const data = await apiSendChat(
                    trimmed,
                    targetId,
                    currentUser?.user_id || 'guest'
                );

                const displayStatus = mapBackendStatus(data.status);
                const replyText = data.response
                    ? data.response
                    : data.blocked_reason ||
                      data.lime_explanation ||
                      'Your message could not be processed.';

                const aiMessage = {
                    sender: 'ai',
                    text: replyText,
                    status: displayStatus,
                    blocked_reason: data.blocked_reason || null,
                    lime_explanation: data.lime_explanation || null
                };

                setConversations((prev) =>
                    prev.map((c) => {
                        if (String(c.id) === String(targetId)) {
                            return {
                                ...c,
                                status: displayStatus,
                                model: data.model_used || c.model,
                                lastLimeExplanation: data.lime_explanation,
                                messages: [...c.messages, aiMessage]
                            };
                        }
                        return c;
                    })
                );
            } catch (err) {
                console.error('Chat request failed:', err);
                const errorText = 'Could not reach the guardrail backend. Is the server running?';
                setConversations((prev) =>
                    prev.map((c) => {
                        if (String(c.id) === String(targetId)) {
                            return {
                                ...c,
                                messages: [...c.messages, { sender: 'ai', text: errorText }]
                            };
                        }
                        return c;
                    })
                );
            } finally {
                setIsTyping(false);
            }
        },
        [conversations, currentConversationId, currentUser, isTyping]
    );

    const renameConversation = useCallback(
        async (id, newTitle) => {
            const title = newTitle.trim();
            if (!title) {
                showToast('Chat name cannot be empty', 'error');
                return false;
            }

            setConversations((prev) =>
                prev.map((c) => (String(c.id) === String(id) ? { ...c, title } : c))
            );

            showToast('Chat renamed', 'success');

            if (currentUser?.user_id) {
                try {
                    await apiUpdateConversationTitle(id, title);
                } catch (err) {
                    console.warn('Rename did not persist to backend (kept locally):', err);
                }
            }
            return true;
        },
        [currentUser, showToast]
    );

    const togglePinConversation = useCallback(
        (id) => {
            setConversations((prev) => {
                const updated = prev.map((c) => {
                    if (String(c.id) === String(id)) {
                        const pinned = !c.pinned;
                        showToast(pinned ? 'Chat pinned 📌' : 'Chat unpinned', 'success');
                        return { ...c, pinned };
                    }
                    return c;
                });
                return sortConversationsList(updated);
            });
        },
        [showToast]
    );

    const deleteConversation = useCallback(
        async (id) => {
            setConversations((prev) => prev.filter((c) => String(c.id) !== String(id)));
            if (String(currentConversationId) === String(id)) {
                setCurrentConversationId(null);
            }
            showToast('Chat deleted', 'success');

            try {
                await apiDeleteConversation(id);
            } catch (err) {
                console.warn('Backend delete failed (chat still removed locally):', err);
            }
        },
        [currentConversationId, showToast]
    );

    return (
        <ChatContext.Provider
            value={{
                conversations,
                currentConversation,
                currentConversationId,
                isTyping,
                openConversation,
                newChat,
                sendMessage,
                renameConversation,
                togglePinConversation,
                deleteConversation,
                refreshConversationsFromBackend
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
