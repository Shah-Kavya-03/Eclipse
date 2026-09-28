import React from 'react';

export default function ChatMessage({ message, isTypingIndicator }) {
    if (isTypingIndicator) {
        return (
            <div className="message ai-message" id="typingIndicator">
                <div className="message-avatar">
                    <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div className="message-content">
                    <div className="typing">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        );
    }

    const isUser = message.sender === 'user';
    const icon = isUser ? 'fa-user' : 'fa-shield-halved';

    return (
        <div className={`message ${isUser ? 'user-message' : 'ai-message'}`}>
            <div className="message-avatar">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="message-content">
                {message.text}
            </div>
        </div>
    );
}
