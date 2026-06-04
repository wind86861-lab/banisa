import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Search, Filter, ChevronRight, X,
    ShieldCheck, FlaskConical, Power, AlertTriangle,
    Building2, Activity, KeyRound, History, BarChart3,
    Users, Zap, CheckCircle2, XCircle, Clock, Loader2,
} from 'lucide-react';
import api from '../../shared/api/axios';
import './admin-payme.css';

const fmtAgo = (iso) => {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s oldin`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}d oldin`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}s oldin`;
    return `${Math.floor(hr / 24)} kun oldin`;
};
const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('uz-UZ', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
};

const STATUS_META = {
    live:     { label: 'LIVE',     cls: 'apo-status--live',     icon: <ShieldCheck size={11} /> },
    test:     { label: 'TEST',     cls: 'apo-status--test',     icon: <FlaskConical size={11} /> },
    inactive: { label: 'O\'CHIQ',   cls: 'apo-status--inactive', icon: <Power size={11} /> },
    none:     { label: 'ULANMAGAN', cls: 'apo-status--none',     icon: <Clock size={11} /> },
};

function StatusPill({ status }) {
    const m = STATUS_META[status] || STATUS_META.none;
    return (
        <span className={`apo-status ${m.cls}`}>
            <span className="apo-status__dot" />
            {m.label}
        </span>
    );
}

function KpiCard({ icon, color, label, value }) {
    return (
        <motion.div className="apo-kpi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="apo-kpi__icon" style={{ background: `${color}1e`, color }}>{icon}</div>
            <div className="apo-kpi__label">{label}</div>
            <div className="apo-kpi__val">{value}</div>
        </motion.div>
    );
}

function ForceDisableModal({ open, clinic, onClose, onConfirm, isPending }) {
    const [reason, setReason] = useState('');
    if (!open) return null;
    return (
        <div className="apo-modal-bg" onClick={onClose}>
            <motion.div
                className="apo-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <h3 className="apo-modal__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="#dc2626" />
                    Force-disable
                </h3>
                <p className="apo-modal__sub">
                    <strong>{clinic?.clinicName}</strong> uchun Payme ulanishini darrov to'xtatasizmi?
                    Kalitlar saqlanadi, lekin webhook'lar rad etiladi.
                </p>
                <textarea
                    className="apo-modal__field"
                    placeholder="Sabab (audit log uchun) — masalan: 'Shubhali tranzaksiya, tekshirilmoqda'"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                />
                <div className="apo-modal__actions">
                    <button className="apo-btn" onClick={onClose}>Bekor</button>
                    <button
                        className="apo-btn apo-btn--danger"
                        onClick={() => onConfirm(reason)}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 size={12} className="spin" /> : <Power size={12} />}
                        Force-disable
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function Drawer({ clinicId, onClose, onForceDisable }) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'payme', 'clinic', clinicId],
        queryFn: async () => (await api.get(`/admin/payme/clinics/${clinicId}`)).data?.data,
        enabled: !!clinicId,
    });

    if (!clinicId) return null;

    const cfg = data?.config;
    const stats = data?.stats24h;
    const logs = data?.recentLogs || [];
    const versions = data?.versions || [];

    return (
        <AnimatePresence>
            <motion.div
                className="apo-drawer-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.aside
                className="apo-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28 }}
            >
                <div className="apo-drawer__head">
                    <div>
                        <div className="apo-drawer__title">
                            <Building2 size={18} /> {data?.clinic?.name || 'Yuklanmoqda…'}
                        </div>
                        <div className="apo-drawer__meta">
                            {data?.clinic?.region} • {data?.txCount ?? '—'} ta jami tranzaksiya
                        </div>
                    </div>
                    <button className="apo-drawer__close" onClick={onClose}><X size={20} /></button>
                </div>

                {isLoading ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                        {[1, 2, 3, 4].map((i) => <div key={i} className="apo-skel" style={{ height: 80 }} />)}
                    </div>
                ) : (
                    <>
                        {cfg ? (
                            <>
                                <div className="apo-section">
                                    <div className="apo-section__title"><KeyRound size={11} /> Konfiguratsiya</div>
                                    <div className="apo-info-grid">
                                        <div className="apo-info">
                                            <div className="apo-info__lbl">Status</div>
                                            <div className="apo-info__val">
                                                <StatusPill status={cfg.isActive ? (cfg.isTestMode ? 'test' : 'live') : 'inactive'} />
                                            </div>
                                        </div>
                                        <div className="apo-info">
                                            <div className="apo-info__lbl">Merchant ID</div>
                                            <div className="apo-info__val">{cfg.merchantId}</div>
                                        </div>
                                        <div className="apo-info">
                                            <div className="apo-info__lbl">Ulangan</div>
                                            <div className="apo-info__val">{fmtAgo(cfg.connectedAt)}</div>
                                        </div>
                                        <div className="apo-info">
                                            <div className="apo-info__lbl">Oxirgi webhook</div>
                                            <div className="apo-info__val">{fmtAgo(cfg.lastUsedAt)}</div>
                                        </div>
                                    </div>
                                    {cfg.isActive && (
                                        <button
                                            className="apo-btn apo-btn--danger"
                                            style={{ marginTop: 12, width: '100%' }}
                                            onClick={() => onForceDisable(data.clinic)}
                                        >
                                            <Power size={12} /> Force-disable
                                        </button>
                                    )}
                                </div>

                                <div className="apo-section">
                                    <div className="apo-section__title"><Activity size={11} /> 24 soat statistika</div>
                                    <div className="apo-info-grid">
                                        <div className="apo-info">
                                            <div className="apo-info__lbl">Muvaffaqiyatli</div>
                                            <div className="apo-info__val" style={{ color: '#047857' }}>{stats?.ok ?? 0}</div>
                                        </div>
                                        <div className="apo-info">
                                            <div className="apo-info__lbl">Xato</div>
                                            <div className="apo-info__val" style={{ color: '#b91c1c' }}>{stats?.fail ?? 0}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="apo-section">
                                    <div className="apo-section__title"><BarChart3 size={11} /> Oxirgi webhook'lar</div>
                                    {logs.length === 0 ? (
                                        <div className="apo-empty" style={{ padding: 20 }}>Webhook yo'q</div>
                                    ) : (
                                        <div className="apo-timeline">
                                            {logs.map((l) => {
                                                const ok = l.errorCode === null;
                                                return (
                                                    <div key={l.id} className={`apo-tl-item ${ok ? '' : 'apo-tl-item--err'}`}>
                                                        <span className={`apo-tl-dot ${ok ? 'apo-tl-dot--ok' : 'apo-tl-dot--err'}`} />
                                                        <div>
                                                            <div className="apo-tl-title">{l.method}</div>
                                                            <div className="apo-tl-meta">
                                                                {l.orderId && <span>Order: {l.orderId.slice(0, 10)}…</span>}
                                                                {l.isTestMode && <span style={{ marginLeft: 8, color: '#b45309' }}>TEST</span>}
                                                                {l.ip && <span style={{ marginLeft: 8 }}>{l.ip}</span>}
                                                            </div>
                                                            {!ok && l.errorMsg && <div className="apo-tl-err">{l.errorMsg}</div>}
                                                        </div>
                                                        <div className="apo-tl-time">{fmtAgo(l.createdAt)}<br />{l.durationMs}ms</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="apo-section">
                                    <div className="apo-section__title"><History size={11} /> Audit tarixi</div>
                                    {versions.length === 0 ? (
                                        <div className="apo-empty" style={{ padding: 20 }}>Hech qanday o'zgarish yo'q</div>
                                    ) : (
                                        <div className="apo-timeline">
                                            {versions.map((v) => (
                                                <div key={v.id} className="apo-tl-item">
                                                    <span className="apo-tl-dot apo-tl-dot--ok" style={{ background: '#6366f1' }} />
                                                    <div>
                                                        <div className="apo-tl-title">v{v.version} — {v.reason || 'no reason'}</div>
                                                        <div className="apo-tl-meta">
                                                            {v.isTestMode ? 'Test' : 'Live'} • merchant {v.merchantId}
                                                            {v.changedBy && ` • by ${v.changedBy.slice(0, 8)}`}
                                                        </div>
                                                    </div>
                                                    <div className="apo-tl-time">{fmtAgo(v.createdAt)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="apo-empty">
                                Bu klinika hali Payme bilan ulanmagan.<br />
                                Webhook URL: <code style={{ fontSize: 11 }}>{cfg?.webhookUrl || `/api/payme/callback/${clinicId}`}</code>
                            </div>
                        )}
                    </>
                )}
            </motion.aside>
        </AnimatePresence>
    );
}

export default function AdminPaymeOversight() {
    const qc = useQueryClient();
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [activeClinic, setActiveClinic] = useState(null);
    const [forceTarget, setForceTarget] = useState(null);

    const { data: overview } = useQuery({
        queryKey: ['admin', 'payme', 'overview'],
        queryFn: async () => (await api.get('/admin/payme/overview')).data?.data,
        refetchInterval: 60_000,
    });

    const { data: rows, isLoading } = useQuery({
        queryKey: ['admin', 'payme', 'clinics', status, search],
        queryFn: async () => (await api.get('/admin/payme/clinics', {
            params: { status, search: search || undefined },
        })).data?.data?.items ?? [],
    });

    const forceDisable = useMutation({
        mutationFn: async ({ clinicId, reason }) =>
            (await api.post(`/admin/payme/clinics/${clinicId}/force-disable`, { reason })).data,
        onSuccess: () => {
            setForceTarget(null);
            qc.invalidateQueries({ queryKey: ['admin', 'payme'] });
        },
    });

    return (
        <div className="apo-page">
            <motion.header
                className="apo-header"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="apo-header__left">
                    <div className="apo-header__icon"><CreditCard size={22} /></div>
                    <div>
                        <h1 className="apo-header__title">Payme nazorat</h1>
                        <p className="apo-header__sub">Barcha klinikalarning to'lov tizimi statusi</p>
                    </div>
                </div>
            </motion.header>

            <div className="apo-kpis">
                <KpiCard
                    icon={<Building2 size={16} />}
                    color="#06b6d4"
                    label="Jami klinika"
                    value={overview?.totalClinics ?? '—'}
                />
                <KpiCard
                    icon={<ShieldCheck size={16} />}
                    color="#10b981"
                    label="LIVE rejim"
                    value={overview?.live ?? '—'}
                />
                <KpiCard
                    icon={<FlaskConical size={16} />}
                    color="#f59e0b"
                    label="TEST rejim"
                    value={overview?.test ?? '—'}
                />
                <KpiCard
                    icon={<Clock size={16} />}
                    color="#6366f1"
                    label="Ulanmagan"
                    value={overview?.none ?? '—'}
                />
                <KpiCard
                    icon={<Activity size={16} />}
                    color="#0891b2"
                    label="24h webhook"
                    value={overview ? `${overview.webhooks24h.ok}/${overview.webhooks24h.total}` : '—'}
                />
            </div>

            <div className="apo-tools">
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                    <Search
                        size={14}
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                    />
                    <input
                        className="apo-input"
                        style={{ paddingLeft: 32 }}
                        placeholder="Klinika nomi yoki merchant ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="apo-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="all">Barchasi</option>
                    <option value="active">Faol (live/test)</option>
                    <option value="inactive">O'chirilgan</option>
                    <option value="none">Ulanmagan</option>
                </select>
            </div>

            <div className="apo-table-wrap">
                <table className="apo-table">
                    <thead>
                        <tr>
                            <th>Klinika</th>
                            <th>Status</th>
                            <th>Merchant ID</th>
                            <th>Oxirgi webhook</th>
                            <th>Tx soni</th>
                            <th style={{ textAlign: 'right' }}>Amal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [1, 2, 3, 4, 5].map((i) => (
                                <tr key={i}>
                                    <td colSpan={6}><div className="apo-skel" style={{ height: 40 }} /></td>
                                </tr>
                            ))
                        ) : (rows || []).length === 0 ? (
                            <tr><td colSpan={6}><div className="apo-empty">Klinika topilmadi</div></td></tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.clinicId} onClick={() => setActiveClinic(r.clinicId)}>
                                    <td data-label="Klinika">
                                        <div className="apo-clinic-name">{r.clinicName}</div>
                                        <div className="apo-clinic-meta">{r.region}</div>
                                    </td>
                                    <td data-label="Status"><StatusPill status={r.configStatus} /></td>
                                    <td data-label="Merchant" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                                        {r.merchantId ? `${r.merchantId.slice(0, 10)}…` : '—'}
                                    </td>
                                    <td data-label="Oxirgi">{fmtAgo(r.lastUsedAt)}</td>
                                    <td data-label="Tx" className="apo-tx-cnt">{r.txCount}</td>
                                    <td data-label="Amal" style={{ textAlign: 'right' }}>
                                        <div className="apo-actions">
                                            {r.isActive && (
                                                <button
                                                    className="apo-btn apo-btn--danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setForceTarget(r);
                                                    }}
                                                    title="Force-disable"
                                                >
                                                    <Power size={12} />
                                                </button>
                                            )}
                                            <button className="apo-btn apo-btn--ghost">
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {activeClinic && (
                    <Drawer
                        clinicId={activeClinic}
                        onClose={() => setActiveClinic(null)}
                        onForceDisable={(c) => setForceTarget(c)}
                    />
                )}
            </AnimatePresence>

            <ForceDisableModal
                open={!!forceTarget}
                clinic={forceTarget}
                onClose={() => setForceTarget(null)}
                onConfirm={(reason) =>
                    forceDisable.mutate({ clinicId: forceTarget.clinicId, reason })
                }
                isPending={forceDisable.isPending}
            />
        </div>
    );
}
