/**
 * js/context/AppContext.js
 * * This file defines a global context for the application to manage
 * * cross-component state like toasts and confirmation modals, avoiding prop drilling.
 */

import { html, Toast, ConfirmationModal } from '../UI.js';

const React = window.React;
const { createContext, useContext, useState, useCallback } = React;

// Create the context
const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {
    const [toast, setToast] = useState(null);
    const [confirmation, setConfirmation] = useState(null);

    // Function to display a toast message
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, key: Date.now() });
    }, []);

    // Function to display a confirmation modal
    const showConfirmation = useCallback((config) => {
        setConfirmation(config);
    }, []);

    const hideConfirmation = () => {
        setConfirmation(null);
    };

    const handleConfirm = () => {
        if (confirmation && typeof confirmation.onConfirm === 'function') {
            confirmation.onConfirm();
        }
        hideConfirmation();
    };

    const handleCancel = () => {
        if (confirmation && typeof confirmation.onCancel === 'function') {
            confirmation.onCancel();
        }
        hideConfirmation();
    };

    const value = {
        showToast,
        showConfirmation,
    };

    return html`
        <${AppContext.Provider} value=${value}>
            ${children}
            ${toast && html`<${Toast} key=${toast.key} message=${toast.message} type=${toast.type} onClose=${() => setToast(null)} />`}
            ${confirmation && html`<${ConfirmationModal} message=${confirmation.message} onConfirm=${handleConfirm} onCancel=${handleCancel} />`}
        <//>
    `;
};

// Custom hook for easy access to the toast function
export const useToast = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useToast must be used within an AppProvider');
    }
    return context.showToast;
};

// Custom hook for easy access to the confirmation modal function
export const useConfirmation = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useConfirmation must be used within an AppProvider');
    }
    return context.showConfirmation;
};
