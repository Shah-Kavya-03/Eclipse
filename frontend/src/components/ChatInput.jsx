import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';

const QUICK_PROMPTS = [
    '🔒 What is prompt injection?',
    '🛡️ How does PII masking work?',
    '🤖 Explain AI guardrails',
    '⚠️ What are jailbreak attacks?',
];

export default function ChatInput() {
    const { sendMessage, isTyping, currentConversationId } = useChat();
    const [text, setText] = useState('');
    const textareaRef = useRef(null);

    // FIX: Reset input when New Chat is clicked (currentConversationId becomes null)
    useEffect(() => {
        if (currentConversationId === null) {
            setText('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    }, [currentConversationId]);

    const handleInput = (e) => {
        setText(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleSend = () => {
        if (!text.trim() || isTyping) return;
        sendMessage(text);
        setText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChipClick = (prompt) => {
        sendMessage(prompt);
    };

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const isSendDisabled = isTyping || !text.trim();

    return (
        <div className="chat-input-area">
            {/* Quick Prompt Chips — only shown when no conversation is open */}
            {currentConversationId === null && (
                <div className="chips">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => handleChipClick(prompt)}
                            disabled={isTyping}
                            style={{ userSelect: 'none' }}
                            draggable="false"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            <div className="input-box">
                <textarea
                    id="promptInput"
                    ref={textareaRef}
                    placeholder="Ask anything securely..."
                    rows={1}
                    value={text}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    style={{ userSelect: 'none' }}
                />

                <button
                    id="sendBtn"
                    className="send-button"
                    onClick={handleSend}
                    disabled={isSendDisabled}
                    title="Send message"
                    style={{ opacity: isSendDisabled ? 0.45 : 1, cursor: isSendDisabled ? 'not-allowed' : 'pointer' }}
                >
                    <i className="fa-solid fa-paper-plane"></i>
                </button>
            </div>

            <div className="security-footer" style={{ userSelect: 'none' }}>
                <i className="fa-solid fa-lock"></i>
                Protected by AI Guardrail
            </div>
        </div>
    );
}
