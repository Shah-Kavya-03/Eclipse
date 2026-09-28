import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatArea({ onOpenLogin }) {
    const { currentUser } = useAuth();
    const { currentConversation, isTyping } = useChat();
    const chatContainerRef = useRef(null);

    const hasMessages =
        currentConversation &&
        currentConversation.messages &&
        currentConversation.messages.length > 0;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [currentConversation?.messages, isTyping]);

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
                        {currentUser ? `Hey, ${currentUser.name} 👋` : 'Welcome to AI Guardrail'}
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
                /* CHAT CONTAINER */
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
            )}

            {/* INPUT */}
            <ChatInput />
        </main>
    );
}
