import React from 'react';

export const STATUS_CONFIG = {
    PENDING:   { label: 'Yangi',               color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  dot: '🟡' },
    IN_REVIEW: { label: "Ko'rib chiqilmoqda",  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  dot: '🔵' },
    APPROVED:  { label: 'Tasdiqlangan',         color: '#10b981', bg: 'rgba(16,185,129,0.12)',  dot: '🟢' },
    REJECTED:  { label: 'Rad etilgan',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   dot: '🔴' },
    SUSPENDED: { label: "To'xtatilgan",         color: '#6b7280', bg: 'rgba(107,114,128,0.12)', dot: '⏸' },
    DELETED:   { label: "O'chirilgan",          color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', dot: '🗑️' },
    BLOCKED:   { label: 'Bloklangan',           color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   dot: '🚫' },
};

export const SOURCE_CONFIG = {
    ADMIN_CREATED:   { label: 'Admin kiritgan',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: '👤' },
    SELF_REGISTERED: { label: 'O\'z-o\'zi',      color: '#0891b2', bg: 'rgba(8,145,178,0.1)',   icon: '📋' },
};

const StatusChip = ({ status, size = 'sm' }) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
    return (
        <span
            className={`status-badge ${size === 'lg' ? 'status-badge-lg' : ''}`}
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22` }}
        >
            {cfg.dot} {cfg.label}
        </span>
    );
};

export const SourceBadge = ({ source }) => {
    const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.ADMIN_CREATED;
    return (
        <span
            className="source-badge"
            style={{ color: cfg.color, background: cfg.bg }}
        >
            {cfg.icon} {cfg.label}
        </span>
    );
};

export default StatusChip;
