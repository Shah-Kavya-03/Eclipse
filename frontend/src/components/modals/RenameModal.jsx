import React, { useState, useEffect, useRef } from 'react';

export default function RenameModal({ isOpen, initialTitle, onSave, onClose }) {
    const [title, setTitle] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle || '');
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen, initialTitle]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(title);
    };

    return (
        <div
            className="modal-overlay active"
            id="renameOverlay"
            onClick={(e) => {
                if (e.target.id === 'renameOverlay') onClose();
            }}
        >
            <div className="modal rename-modal">
                <div className="modal-header">
                    <h2>Rename Chat</h2>
                    <button className="closeModal" id="renameClose" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <form className="rename-content" onSubmit={handleSubmit}>
                    <label htmlFor="renameInput">Chat name</label>
                    <input
                        type="text"
                        id="renameInput"
                        ref={inputRef}
                        placeholder="Enter a new chat name..."
                        maxLength="100"
                        autoComplete="off"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="rename-actions">
                        <button
                            type="button"
                            className="rename-cancel"
                            id="renameCancel"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rename-save"
                            id="renameSave"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
