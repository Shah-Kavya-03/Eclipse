import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// -------------------------------------------------------
// Bug 12: Replace [Redacted] tokens with descriptive labels
// -------------------------------------------------------
const REDACTION_PATTERNS = [
    { re: /\[Redacted:?\s*email[^\]]*\]/gi, label: '[Email Address Removed]' },
    { re: /\[Redacted:?\s*phone[^\]]*\]/gi, label: '[Phone Number Removed]' },
    { re: /\[Redacted:?\s*api[_\s]?key[^\]]*\]/gi, label: '[API Key Removed]' },
    { re: /\[Redacted:?\s*ssn[^\]]*\]/gi, label: '[SSN Removed]' },
    { re: /\[Redacted:?\s*credit[^\]]*\]/gi, label: '[Credit Card Removed]' },
    { re: /\[Redacted:?\s*name[^\]]*\]/gi, label: '[Name Removed]' },
    { re: /\[Redacted:?\s*address[^\]]*\]/gi, label: '[Address Removed]' },
    { re: /\[Redacted:?\s*ip[^\]]*\]/gi, label: '[IP Address Removed]' },
    { re: /\[Redacted:?\s*password[^\]]*\]/gi, label: '[Password Removed]' },
    // Generic fallback — must be last
    { re: /\[Redacted[^\]]*\]/gi, label: '[Sensitive Information Removed]' },
];

function applyRedactionLabels(text) {
    if (!text) return text;
    let result = text;
    for (const { re, label } of REDACTION_PATTERNS) {
        result = result.replace(re, label);
    }
    return result;
}

// -------------------------------------------------------
// StatusBadge: maps display status to label + colour class
// -------------------------------------------------------
function StatusBadge({ status }) {
    if (!status || status === 'Protected') return null;

    const badgeMap = {
        'Protected': { label: 'Protected', cls: 'status-badge--protected' },
        'Modified': { label: 'Modified', cls: 'status-badge--modified' },
        'Blocked': { label: 'Blocked', cls: 'status-badge--blocked' },
    };

    const badge = badgeMap[status] || { label: status, cls: 'status-badge--unknown' };

    return (
        <span className={`status-badge ${badge.cls}`} title={`Guardrail status: ${badge.label}`}>
            {badge.label === 'Modified' && <i className="fa-solid fa-pen-to-square"></i>}
            {badge.label === 'Blocked' && <i className="fa-solid fa-ban"></i>}
            {badge.label === 'Protected' && <i className="fa-solid fa-shield-halved"></i>}
            {badge.label}
        </span>
    );
}

// -------------------------------------------------------
// Bug 7: Suspicious content highlight indicator
// -------------------------------------------------------
function SuspiciousIndicator({ message }) {
    const hasSuspicious =
        message.suspicious_content ||
        message.threat_category ||
        (message.status === 'Blocked' && message.blocked_reason);

    if (!hasSuspicious) return null;

    const label = message.threat_category
        ? `Flagged: ${message.threat_category}`
        : message.suspicious_content
            ? 'Suspicious content detected'
            : null;

    if (!label) return null;

    return (
        <div className="suspicious-indicator" title={label}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{label}</span>
        </div>
    );
}

// -------------------------------------------------------
// Bug 10: Professional Markdown renderer
// -------------------------------------------------------
function MarkdownContent({ text }) {
    const processedText = applyRedactionLabels(text);

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // Bug 10: style code blocks and inline code
                code({ node, inline, className, children, ...props }) {
                    if (inline) {
                        return (
                            <code className="inline-code" {...props}>
                                {children}
                            </code>
                        );
                    }
                    return (
                        <pre className="code-block">
                            <code className={className} {...props}>
                                {children}
                            </code>
                        </pre>
                    );
                },
                // Open links safely
                a({ href, children, ...props }) {
                    return (
                        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                            {children}
                        </a>
                    );
                },
            }}
        >
            {processedText}
        </ReactMarkdown>
    );
}

function MessageActions({ text }) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 1600);
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    };

    return (
        <div className="message-actions">
            <button
                type="button"
                className={`copy-message-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                aria-label={copied ? 'Message copied' : 'Copy message'}
                data-tooltip={copied ? 'Copied!' : 'Copy message'}
            >
                <i
                    className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'
                        }`}
                ></i>
            </button>
        </div>
    );
}

function ExpandableMessage({ text }) {
    const [expanded, setExpanded] = React.useState(false);
    const [needsExpansion, setNeedsExpansion] = React.useState(false);

    const measureRef = React.useRef(null);

    React.useEffect(() => {
        const element = measureRef.current;

        if (!element) return;

        const checkHeight = () => {
            /*
             * The measuring element is limited to 10 lines.
             * scrollHeight gives us the REAL full height.
             */
            setNeedsExpansion(
                element.scrollHeight > element.clientHeight + 2
            );
        };

        checkHeight();

        const resizeObserver = new ResizeObserver(checkHeight);
        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, [text]);

    return (
        <div className="expandable-message">

            {/* Visible message */}
            <div
                className={`message-text ${expanded ? 'expanded' : 'collapsed'
                    }`}
            >
                {text}
            </div>

            {/* Hidden measurement copy */}
            <div
                ref={measureRef}
                className="message-text-measure"
                aria-hidden="true"
            >
                {text}
            </div>

            {/* READ MORE */}
            {needsExpansion && (
                <button
                    type="button"
                    className="read-more-button"
                    onClick={() => setExpanded(prev => !prev)}
                >
                    {expanded ? 'Read less' : 'Read more'}
                </button>
            )}

        </div>
    );
}

// -------------------------------------------------------
// Main ChatMessage component
// -------------------------------------------------------
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

            {/* AI avatar stays on the LEFT */}
            {!isUser && (
                <div className="message-avatar">
                    <i className="fa-solid fa-shield-halved"></i>
                </div>
            )}

            <div className="message-main">

                <div className="message-content">
                    {isUser ? (
                        <ExpandableMessage
                            text={message.text}
                            isUser={true}
                        />
                    ) : (
                        <MarkdownContent text={message.text} />
                    )}

                    {!isUser && <SuspiciousIndicator message={message} />}

                    {!isUser &&
                        message.status &&
                        message.status !== 'Protected' && (
                            <div className="message-status-row">
                                <StatusBadge status={message.status} />
                            </div>
                        )}

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

                {/* COPY MESSAGE ACTION */}
                <MessageActions text={message.text} />

            </div>

            {/* USER avatar goes on the RIGHT */}
            {isUser && (
                <div className="message-avatar user-avatar">
                    <i className="fa-solid fa-user"></i>
                </div>
            )}

        </div>
    );
}
