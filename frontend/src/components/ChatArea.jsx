import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatArea({ onOpenLogin }) {
    const { currentUser } = useAuth();
    const { currentConversation, isTyping } = useChat();
    const chatContainerRef = useRef(null);
    // Part F: showFade is only true when content is ACTUALLY scrollable
    const [showFade, setShowFade] = useState(false);

    const hasMessages =
        currentConversation &&
        currentConversation.messages &&
        currentConversation.messages.length > 0;

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [currentConversation?.messages, isTyping]);

    // Part F: Detect real scrollability — only activate fade when scrollHeight > clientHeight
    useEffect(() => {
        const el = chatContainerRef.current;
        if (!el) {
            setShowFade(false);
            return;
        }

        const checkFade = () => {
            // Part F: use scrollHeight > clientHeight + 10 threshold to avoid false positives
            const isScrollable = el.scrollHeight > el.clientHeight + 10;
            setShowFade(isScrollable);
        };

        checkFade();

        // Part E: recalculate on scroll, resize, and message changes
        el.addEventListener('scroll', checkFade);
        const ro = new ResizeObserver(checkFade);
        ro.observe(el);

        return () => {
            el.removeEventListener('scroll', checkFade);
            ro.disconnect();
        };
    }, [hasMessages, currentConversation?.messages, isTyping]);

    return (
        <main className="main">
            <div className="top-right">
                {!currentUser && (
                    <button
                        id="signInButton"
                        onClick={onOpenLogin}
                        style={{ userSelect: 'none' }}
                        draggable="false"
                    >
                        Sign In
                    </button>
                )}
            </div>

            {/* EMPTY STATE / WELCOME */}
            {!hasMessages ? (
                <section className="welcome-screen" id="welcomeScreen">
                    <div className="shield">
                        <i className="fa-solid fa-shield-halved"></i>
                    </div>

                    <h1
                        id="welcomeHeading"
                        style={{ userSelect: 'none' }}
                        draggable="false"
                    >
                        {currentUser
                            ? `Hey, ${currentUser.name} 👋`
                            : 'Welcome to Eclipse, Your AI Guardrail'}
                    </h1>

                    <p
                        id="welcomeText"
                        style={{ userSelect: 'none' }}
                        draggable="false"
                    >
                        {currentUser
                            ? 'How can I help you today?'
                            : 'Your prompts are automatically protected against prompt injection, sensitive information leakage, and unsafe AI responses.'}
                    </p>
                </section>
            ) : (
                /* CHAT CONTAINER WRAPPER — positions fade overlay relative to chat+input */
                <div className="chat-area-wrapper">
                    <section
                        className="chat-container active"
                        id="chatContainer"
                        ref={chatContainerRef}
                    >
                        {currentConversation.messages.map((msg, index) => (
                            <ChatMessage key={index} message={msg} />
                        ))}
                        {isTyping && <ChatMessage isTypingIndicator />}
                    </section>

                    {/* Part C: Bottom fade overlay — sits above chat, below input.
                        pointer-events:none so it never blocks interaction.
                        Only rendered when chat is actually scrollable. */}
                    {showFade && (
                        <div className="chat-fade-overlay" aria-hidden="true"></div>
                    )}
                </div>
            )}

            {/* INPUT — Part D: pass showSecurityFooter=false when chat is scrollable */}
            <ChatInput showSecurityFooter={!showFade} />
        </main>
    );
}
