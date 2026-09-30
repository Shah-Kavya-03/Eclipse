import React from 'react';

// StatusBadge maps display status to label + color class
function StatusBadge({ status }) {
    if (!status || status === 'Protected') return null;

    const badgeMap = {
        'Protected': { label: 'Protected', cls: 'status-badge--protected' },
        'Modified':  { label: 'Modified',  cls: 'status-badge--modified'  },
        'Blocked':   { label: 'Blocked',   cls: 'status-badge--blocked'   },
    };

    const badge = badgeMap[status] || { label: status, cls: 'status-badge--blocked' };

    return (
        <span className={`status-badge ${badge.cls}`} title={`Guardrail status: ${badge.label}`}>
            {badge.label === 'Modified'  && <i className="fa-solid fa-pen-to-square"></i>}
            {badge.label === 'Blocked'   && <i className="fa-solid fa-ban"></i>}
            {badge.label === 'Protected' && <i className="fa-solid fa-shield-halved"></i>}
            {badge.label}
        </span>
    );
}

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

    const showBlockedDetails =
        !isUser &&
        message.status === 'Blocked' &&
        (message.blocked_reason || message.lime_explanation);

    return (
        <div className={`message ${isUser ? 'user-message' : 'ai-message'}`}>
            <div className="message-avatar">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="message-content">
                {message.text}

                {/* Status badge for AI messages that aren't simply 'Protected' */}
                {!isUser && message.status && message.status !== 'Protected' && (
                    <div className="message-status-row">
                        <StatusBadge status={message.status} />
                    </div>
                )}

                {/* Blocked details section */}
                {showBlockedDetails && (
                    <div className="blocked-details">
                        {message.blocked_reason && (
                            <div className="blocked-reason">
                                <i className="fa-solid fa-circle-exclamation"></i>
                                <span>{message.blocked_reason}</span>
                            </div>
                        )}
                        {message.lime_explanation && (
                            <div className="lime-explanation">
                                <i className="fa-solid fa-magnifying-glass"></i>
                                <span>{message.lime_explanation}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
