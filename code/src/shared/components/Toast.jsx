import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

let _nextId = 1;

// Module-level imperative handle so NON-React code (e.g. the axios response
// interceptor) can raise toasts without a hook. ToastProvider registers the
// live `show` fn on mount; before that, calls are safe no-ops.
let _imperativeShow = null;
export const toastBus = {
    success: (msg, dur) => _imperativeShow?.(msg, 'success', dur),
    error:   (msg, dur) => _imperativeShow?.(msg, 'error', dur ?? 6000),
    warning: (msg, dur) => _imperativeShow?.(msg, 'warning', dur),
    info:    (msg, dur) => _imperativeShow?.(msg, 'info', dur),
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const remove = useCallback((id) => {
        clearTimeout(timers.current[id]);
        setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, []);

    const show = useCallback((message, type = 'info', duration = 4000) => {
        const id = _nextId++;
        setToasts(prev => [...prev, { id, message, type, leaving: false }]);
        timers.current[id] = setTimeout(() => remove(id), duration);
        return id;
    }, [remove]);

    // Expose the live `show` to the module-level bus for non-React callers.
    useEffect(() => {
        _imperativeShow = show;
        return () => { if (_imperativeShow === show) _imperativeShow = null; };
    }, [show]);

    const toast = {
        success: (msg, dur) => show(msg, 'success', dur),
        error:   (msg, dur) => show(msg, 'error', dur ?? 6000),
        warning: (msg, dur) => show(msg, 'warning', dur),
        info:    (msg, dur) => show(msg, 'info', dur),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast--${t.type} ${t.leaving ? 'toast--out' : 'toast--in'}`}>
                        <span className="toast__icon">{ICONS[t.type]}</span>
                        <span className="toast__message">{t.message}</span>
                        <button className="toast__close" onClick={() => remove(t.id)} aria-label="Yopish">✕</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const ICONS = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
};

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside ToastProvider');
    return ctx;
}
