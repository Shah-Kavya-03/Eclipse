import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';

export default function ChatInput({ showSecurityFooter }) {
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

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const isSendDisabled = isTyping || !text.trim();

    // Part D: security footer visibility is controlled by parent (ChatArea) based on scrollability
    const footerVisible = showSecurityFooter !== false;

    return (
        <div className="chat-input-area">
            {/* Part B: Quick prompt chips REMOVED — no replacement */}

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

            {/* Part D: hide footer when chat is scrollable */}
            {footerVisible && (
                <div className="security-footer" style={{ userSelect: 'none' }}>
                    <i className="fa-solid fa-lock"></i>
                    Protected by AI Guardrail
                </div>
            )}
        </div>
    );
}
