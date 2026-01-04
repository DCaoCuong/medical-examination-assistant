'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Hook to use toast
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Toast Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = { id, type, message, duration };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, duration?: number) => {
        addToast('success', message, duration);
    }, [addToast]);

    const error = useCallback((message: string, duration?: number) => {
        addToast('error', message, duration ?? 6000); // Errors stay longer
    }, [addToast]);

    const warning = useCallback((message: string, duration?: number) => {
        addToast('warning', message, duration);
    }, [addToast]);

    const info = useCallback((message: string, duration?: number) => {
        addToast('info', message, duration);
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

// Single Toast Item
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const [isLeaving, setIsLeaving] = useState(false);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(onClose, 200); // Wait for animation
    };

    const typeConfig = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            icon: <CheckCircle className="w-5 h-5 text-green-500" />,
            textColor: 'text-green-800',
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: <XCircle className="w-5 h-5 text-red-500" />,
            textColor: 'text-red-800',
        },
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
            textColor: 'text-amber-800',
        },
        info: {
            bg: 'bg-sky-50',
            border: 'border-sky-200',
            icon: <Info className="w-5 h-5 text-sky-500" />,
            textColor: 'text-sky-800',
        },
    };

    const config = typeConfig[toast.type];

    return (
        <div
            className={`
                ${config.bg} ${config.border} border rounded-xl shadow-lg p-4 
                flex items-start gap-3 min-w-[320px]
                transform transition-all duration-200
                ${isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-slide-in'}
            `}
        >
            <div className="flex-shrink-0 mt-0.5">
                {config.icon}
            </div>
            <div className="flex-1">
                <p className={`text-sm font-medium ${config.textColor}`}>
                    {toast.message}
                </p>
            </div>
            <button
                onClick={handleClose}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 transition"
            >
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
        </div>
    );
}

// Add animation to globals.css if not exists
// @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
// .animate-slide-in { animation: slide-in 0.2s ease-out; }
