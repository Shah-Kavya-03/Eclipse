import React, { useState, useEffect } from 'react';

export default function DeleteChatModal({ isOpen, chat, onConfirm, onClose }) {
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsDeleting(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !isDeleting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isDeleting, onClose]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (isDeleting || !chat?.id) return;
        setIsDeleting(true);
        try {
            const success = await onConfirm(chat.id);
            if (success) {
                onClose();
            }
        } catch (err) {
            console.error('Delete confirmation error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            className="modal-overlay active"
            id="deleteChatOverlay"
            onClick={(e) => {
                if (e.target.id === 'deleteChatOverlay' && !isDeleting) {
                    onClose();
                }
            }}
        >
            <div
                className="modal delete-chat-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="deleteChatHeading"
            >
                <div className="modal-header">
                    <h2 id="deleteChatHeading">Delete Conversation?</h2>
                    <button
                        className="closeModal"
                        id="deleteChatClose"
                        onClick={onClose}
                        disabled={isDeleting}
                        aria-label="Close dialog"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="delete-chat-body">
                    <div className="delete-chat-icon-wrapper">
                        <i className="fa-solid fa-trash-can"></i>
                    </div>

                    <p className="delete-chat-text">
                        This conversation will be permanently deleted. This action cannot be undone.
                    </p>

                    {chat?.title && (
                        <div className="delete-chat-target-title" title={chat.title}>
                            <i className="fa-regular fa-message"></i>
                            <span className="delete-chat-title-text">{chat.title}</span>
                        </div>
                    )}
                </div>

                <div className="delete-chat-actions">
                    <button
                        type="button"
                        className="delete-chat-cancel-btn"
                        id="deleteChatCancel"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="delete-chat-confirm-btn"
                        id="deleteChatConfirm"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                <span>Deleting...</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-trash-can"></i>
                                <span>Delete Chat</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
