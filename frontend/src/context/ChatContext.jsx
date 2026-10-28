import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
    const { currentUser, registerLogoutCallback } = useAuth();
    const { showToast } = useToast();

    // Priority 1: Never load from localStorage on initial render — always start empty.
    // Conversations are fetched from the backend once auth is confirmed.
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [isTyping, setIsTyping] = useState(false);

    // Session token and user ref to invalidate any in-flight requests on logout or account switch
    const activeSessionRef = useRef(0);
    const activeUserIdRef = useRef(currentUser?.user_id || null);

    useEffect(() => {
        activeUserIdRef.current = currentUser?.user_id || null;
    }, [currentUser?.user_id]);

    // Priority 1: Clear all conversation state immediately and invalidate pending requests
    const clearConversationState = useCallback(() => {
        activeSessionRef.current += 1;
        setConversations([]);
        setCurrentConversationId(null);
        setIsTyping(false);
        // Also clear any cached localStorage conversations
        localStorage.removeItem('guardrailChats');
    }, []);

    // Register clear-state callback with AuthContext so logout immediately purges chat history
    useEffect(() => {
        if (registerLogoutCallback) {
            registerLogoutCallback(clearConversationState);
        }
    }, [registerLogoutCallback, clearConversationState]);

    // Refresh conversations from backend for logged-in users with strict session verification
    const refreshConversationsFromBackend = useCallback(async () => {
        const targetUserId = currentUser?.user_id;
        if (!targetUserId) {
            clearConversationState();
            return;
        }
        const sessionToken = ++activeSessionRef.current;

        try {
            const data = await apiGetConversations(targetUserId);
            // Verify session token and active user ID are still valid
            if (activeSessionRef.current !== sessionToken || activeUserIdRef.current !== targetUserId) {
                return; // User logged out or switched accounts while request was in-flight
            }
            if (!data || !Array.isArray(data.conversations)) {
                console.warn('Unexpected conversations response:', data);
                return;
            }
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
                if (activeSessionRef.current !== sessionToken || activeUserIdRef.current !== targetUserId) {
                    return [];
                }
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
    }, [currentUser?.user_id, clearConversationState]);

    // When auth changes — wipe state immediately, then fetch only if logged in
    useEffect(() => {
        clearConversationState();
        if (currentUser?.user_id) {
            refreshConversationsFromBackend();
        }
    }, [currentUser?.user_id, refreshConversationsFromBackend, clearConversationState]);

    const currentConversation = conversations.find(
        (c) => String(c.id) === String(currentConversationId)
    ) || null;

    const conversationsRef = useRef(conversations);
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const openConversation = useCallback(
        async (id) => {
            setCurrentConversationId(id);
            const chat = conversationsRef.current.find((c) => String(c.id) === String(id));
            if (!chat) return;

            const sessionToken = activeSessionRef.current;
            const currentUserId = activeUserIdRef.current;

            if (chat.loaded === false) {
                try {
                    const data = await apiGetConversation(id);
                    if (activeSessionRef.current !== sessionToken || activeUserIdRef.current !== currentUserId) {
                        return;
                    }
                    const loadedMessages = (data.messages || []).map((m) => ({
                        sender: m.sender === 'assistant' ? 'ai' : 'user',
                        text: m.text
                    }));
                    setConversations((prev) => {
                        if (activeSessionRef.current !== sessionToken || activeUserIdRef.current !== currentUserId) {
                            return [];
                        }
                        return prev.map((c) =>
                            String(c.id) === String(id)
                                ? { ...c, messages: loadedMessages, loaded: true }
                                : c
                        );
                    });
                } catch (err) {
                    console.error('Failed to load conversation history:', err);
                }
            }
        },
        [] // Stable callback — does NOT re-create when conversations change
    );

    const newChat = useCallback(() => {
        setCurrentConversationId(null);
        setIsTyping(false);
    }, []);

    const sendMessage = useCallback(
        async (text) => {
            const trimmed = text.trim();
            if (!trimmed || isTyping) return;

            const sessionToken = activeSessionRef.current;
            const sendingUserId = currentUser?.user_id || 'guest';

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
                    sendingUserId
                );

                // If user logged out or session switched while awaiting response, discard
                if (activeSessionRef.current !== sessionToken || (activeUserIdRef.current || 'guest') !== sendingUserId) {
                    return;
                }

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
                    lime_explanation: data.lime_explanation || null,
                    redactions: data.redactions || data.redacted_fields || null,
                    processed_prompt: data.processed_prompt || null,
                    processed_response: data.processed_response || null,
                    suspicious_content: data.suspicious_content || data.flagged_content || null,
                    threat_category: data.threat_category || data.category || null,
                };

                setConversations((prev) => {
                    if (activeSessionRef.current !== sessionToken || (activeUserIdRef.current || 'guest') !== sendingUserId) {
                        return [];
                    }
                    return prev.map((c) => {
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
                    });
                });
            } catch (err) {
                if (activeSessionRef.current !== sessionToken) return;
                console.error('Chat request failed:', err);
                const errorText = 'Could not reach the guardrail backend. Is the server running?';
                setConversations((prev) => {
                    if (activeSessionRef.current !== sessionToken) return [];
                    return prev.map((c) => {
                        if (String(c.id) === String(targetId)) {
                            return {
                                ...c,
                                messages: [...c.messages, { sender: 'ai', text: errorText, status: null }]
                            };
                        }
                        return c;
                    });
                });
            } finally {
                if (activeSessionRef.current === sessionToken) {
                    setIsTyping(false);
                }
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
            if (currentUser?.user_id) {
                try {
                    const res = await apiDeleteConversation(id);
                    if (res && !res.ok && res.status !== 404) {
                        throw new Error(`Delete failed with status ${res.status}`);
                    }
                } catch (err) {
                    console.error('Backend delete failed:', err);
                    showToast('Failed to delete conversation. Please try again.', 'error');
                    return false;
                }
            } else {
                try {
                    await apiDeleteConversation(id);
                } catch (err) {
                    // Ignore for local/guest conversation deletion failure
                }
            }

            setConversations((prev) => prev.filter((c) => String(c.id) !== String(id)));
            if (String(currentConversationId) === String(id)) {
                setCurrentConversationId(null);
            }
            showToast('Chat deleted', 'success');
            return true;
        },
        [currentUser, currentConversationId, showToast]
    );

    /**
     * Bug 4: Clear history — clears frontend state immediately after successful API call.
     * Does NOT modify backend behavior; only resets frontend state on success.
     */
    const clearAllHistory = useCallback(
        async (apiClearFn) => {
            try {
                const success = await apiClearFn();
                if (success) {
                    setConversations([]);
                    setCurrentConversationId(null);
                    localStorage.removeItem('guardrailChats');
                }
                return success;
            } catch (err) {
                console.error('clearAllHistory error:', err);
                return false;
            }
        },
        []
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
                clearAllHistory,
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
