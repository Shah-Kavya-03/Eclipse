import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';

export default function ChatInput() {
    const { sendMessage, isTyping } = useChat();
    const [text, setText] = useState('');
    const textareaRef = useRef(null);

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

    return (
        <div className="chat-input-area">
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
                    disabled={isTyping}
                    title="Send message"
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
