'use client';

import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface UrgencyBadgeProps {
    bookingTime: string;
    hasSession: boolean;
    sessionStatus: string | null;
}

/**
 * Returns urgency level based on waiting time
 * - urgent: waiting > 60 minutes
 * - attention: waiting 30-60 minutes  
 * - normal: waiting < 30 minutes
 * - none: already being examined or completed
 */
function getUrgencyLevel(bookingTime: string, hasSession: boolean, sessionStatus: string | null): {
    level: 'urgent' | 'attention' | 'normal' | 'none';
    waitingMinutes: number;
    label: string;
} {
    // If session is completed or active, no urgency
    if (hasSession && (sessionStatus === 'completed' || sessionStatus === 'active')) {
        return { level: 'none', waitingMinutes: 0, label: '' };
    }

    const now = new Date();
    const booking = new Date(bookingTime);
    const diffMs = now.getTime() - booking.getTime();
    const waitingMinutes = Math.floor(diffMs / (1000 * 60));

    // If booking is in the future, no urgency
    if (waitingMinutes < 0) {
        return { level: 'none', waitingMinutes: 0, label: '' };
    }

    if (waitingMinutes > 60) {
        return {
            level: 'urgent',
            waitingMinutes,
            label: `Chờ ${Math.floor(waitingMinutes / 60)}h ${waitingMinutes % 60}p`
        };
    }

    if (waitingMinutes >= 30) {
        return {
            level: 'attention',
            waitingMinutes,
            label: `Chờ ${waitingMinutes} phút`
        };
    }

    if (waitingMinutes >= 5) {
        return {
            level: 'normal',
            waitingMinutes,
            label: `Chờ ${waitingMinutes} phút`
        };
    }

    return { level: 'none', waitingMinutes, label: 'Mới đặt' };
}

export default function UrgencyBadge({ bookingTime, hasSession, sessionStatus }: UrgencyBadgeProps) {
    const { level, label } = getUrgencyLevel(bookingTime, hasSession, sessionStatus);

    if (level === 'none') {
        return null;
    }

    const config = {
        urgent: {
            bg: 'bg-red-100',
            text: 'text-red-700',
            border: 'border-red-300',
            icon: <AlertTriangle className="w-3 h-3" />,
            pulse: true,
        },
        attention: {
            bg: 'bg-amber-100',
            text: 'text-amber-700',
            border: 'border-amber-300',
            icon: <Clock className="w-3 h-3" />,
            pulse: false,
        },
        normal: {
            bg: 'bg-slate-100',
            text: 'text-slate-600',
            border: 'border-slate-300',
            icon: <Clock className="w-3 h-3" />,
            pulse: false,
        },
    };

    const style = config[level];

    return (
        <span
            className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                ${style.bg} ${style.text} border ${style.border}
                ${style.pulse ? 'animate-pulse' : ''}
            `}
        >
            {style.icon}
            {label}
        </span>
    );
}

// Export for use in row highlighting
export function getRowUrgencyClass(bookingTime: string, hasSession: boolean, sessionStatus: string | null): string {
    const { level } = getUrgencyLevel(bookingTime, hasSession, sessionStatus);

    switch (level) {
        case 'urgent':
            return 'bg-red-50/70 hover:bg-red-100/70';
        case 'attention':
            return 'bg-amber-50/50 hover:bg-amber-100/50';
        default:
            return 'hover:bg-sky-50/50';
    }
}
