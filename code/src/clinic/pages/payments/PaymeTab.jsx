import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy, RefreshCw, Activity, Zap, ShieldCheck, AlertTriangle,
    CheckCircle2, XCircle, Power, Eye, EyeOff, Loader2,
    QrCode, Lock, ArrowRight, ArrowLeft, Sparkles, ChevronRight,
    KeyRound, BarChart3, FlaskConical, Radio,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../../shared/api/axios';
import PaymeOnboardingWizard from './components/PaymeOnboardingWizard';
import PaymeTroubleshooter from './components/PaymeTroubleshooter';
import PaymeModeSwitchModal from './components/PaymeModeSwitchModal';

const fmtAgo = (iso) => {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec} soniya oldin`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} daqiqa oldin`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} soat oldin`;
    const d = Math.floor(hr / 24);
    return `${d} kun oldin`;
};

const fmtTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

function Toast({ msg }) {
    return (
        <AnimatePresence>
            {msg && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="pay-toast"
                >
                    <CheckCircle2 size={16} /> {msg}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function HeroCard({ config, stats }) {
    if (!config) return null;
    const isLive = config.isActive && !config.isTestMode;
    const isTest = config.isActive && config.isTestMode;
    let statusDot = 'pay-hero__status-dot--off';
    let statusLabel = 'O\'CHIQ';
    if (isLive) { statusDot = ''; statusLabel = 'LIVE'; }
    else if (isTest) { statusDot = 'pay-hero__status-dot--test'; statusLabel = 'TEST'; }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pay-hero"
        >
            <div className="pay-hero__row">
                <div>
                    <div className="pay-hero__title">
                        <ShieldCheck size={22} /> Payme — to'lov tizimi
                    </div>
                    <div className="pay-hero__sub">
                        Oxirgi webhook: {fmtAgo(stats?.lastAt)}
                        {config.lastRotatedAt && ` • Kalit yangilangan: ${fmtAgo(config.lastRotatedAt)}`}
                    </div>
                </div>
                <div className="pay-hero__status">
                    <span className={`pay-hero__status-dot ${statusDot}`} />
                    {statusLabel}
                </div>
            </div>
        </motion.div>
    );
}

function HealthCard({ stats, isLoading }) {
    const data = (stats?.buckets || []).map((b) => ({
        t: b.t,
        ok: b.ok,
        fail: b.fail,
        total: b.ok + b.fail,
    }));
    const total = stats?.total ?? 0;
    const successRate = total > 0 ? Math.round(((stats.ok ?? 0) / total) * 100) : 100;

    return (
        <div className="pay-card">
            <div className="pay-card__title"><Activity size={14} /> Ulanish holati — 24 soat</div>

            {isLoading ? (
                <div style={{ display: 'grid', gap: 10 }}>
                    <div className="pay-skel" style={{ height: 38, width: 140 }} />
                    <div className="pay-skel" style={{ height: 56 }} />
                </div>
            ) : (
                <>
                    <div className="pay-stats">
                        <div className="pay-stat pay-stat--ok">
                            <div className="pay-stat__val">{stats?.ok ?? 0}</div>
                            <div className="pay-stat__lbl">Muvaffaqiyatli</div>
                        </div>
                        <div className="pay-stat pay-stat--fail">
                            <div className="pay-stat__val">{stats?.fail ?? 0}</div>
                            <div className="pay-stat__lbl">Xato</div>
                        </div>
                        <div className="pay-stat pay-stat--neutral">
                            <div className="pay-stat__val">{stats?.p95 ?? 0}ms</div>
                            <div className="pay-stat__lbl">p95 javob</div>
                        </div>
                        <div className="pay-stat">
                            <div className="pay-stat__val">{successRate}%</div>
                            <div className="pay-stat__lbl">SLA</div>
                        </div>
                    </div>

                    <div className="pay-spark">
                        <ResponsiveContainer>
                            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="okGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2} fill="url(#okGrad)" />
                                <Tooltip
                                    contentStyle={{
                                        background: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                    formatter={(v, name) => [v, name === 'total' ? 'Webhook' : name]}
                                    labelFormatter={() => ''}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
}

function KeyVaultCard({ config, onRotate }) {
    const daysSince = config.lastRotatedAt
        ? Math.floor((Date.now() - new Date(config.lastRotatedAt).getTime()) / (24 * 3600_000))
        : config.connectedAt
            ? Math.floor((Date.now() - new Date(config.connectedAt).getTime()) / (24 * 3600_000))
            : 0;
    const needsRotation = daysSince > 90;

    return (
        <div className="pay-card">
            <div className="pay-card__title"><KeyRound size={14} /> Kalit boshqaruvi</div>

            <div className="pay-key-row">
                <div>
                    <div className="pay-key-row__label">Merchant ID</div>
                    <div className="pay-key-row__value">{config.merchantId}</div>
                </div>
            </div>

            <div className="pay-key-row">
                <div>
                    <div className="pay-key-row__label">Production kalit</div>
                    <div className="pay-key-row__value">{config.prodKeyMasked}</div>
                </div>
                <Lock size={16} color="#64748b" />
            </div>

            {config.hasTestKey && (
                <div className="pay-key-row">
                    <div>
                        <div className="pay-key-row__label">Test kalit</div>
                        <div className="pay-key-row__value">{config.testKeyMasked}</div>
                    </div>
                    <FlaskConical size={16} color="#64748b" />
                </div>
            )}

            <div style={{ fontSize: 11, color: '#64748b', marginTop: 10 }}>
                {config.lastRotatedAt
                    ? `Oxirgi yangilanish: ${fmtAgo(config.lastRotatedAt)}`
                    : `Ulangan: ${fmtAgo(config.connectedAt)}`}
            </div>

            {needsRotation && (
                <div className="pay-key-warn">
                    <AlertTriangle size={14} />
                    {daysSince} kun bo'ldi — xavfsizlik uchun kalitlarni yangilang
                </div>
            )}

            <button className="pay-btn pay-btn--ghost" style={{ marginTop: 12, width: '100%' }} onClick={onRotate}>
                <RefreshCw size={14} /> Kalitlarni yangilash
            </button>
        </div>
    );
}

function WebhookUrlBlock({ url, onCopy }) {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(url)}`;
    return (
        <div className="pay-card">
            <div className="pay-card__title"><Radio size={14} /> Webhook URL</div>

            <div className="pay-url-block">
                <div className="pay-url-row">
                    <div className="pay-url-input" title={url}>{url}</div>
                    <button className="pay-btn pay-btn--primary" onClick={() => onCopy(url)}>
                        <Copy size={14} /> Nusxa
                    </button>
                </div>

                <div className="pay-qr-row">
                    <img className="pay-qr-img" src={qrSrc} alt="Webhook QR" loading="lazy" />
                    <div className="pay-qr-hint">
                        <div style={{ marginBottom: 6 }}>
                            <strong>Payme kabinetiga joylash:</strong>
                        </div>
                        Payme merchant kabinetiga kiring → Sozlamalar → Webhook URL — yuqoridagi URL'ni joylang.
                        Mobil orqali Payme app'da QR kodni skanerlang.
                    </div>
                </div>
            </div>
        </div>
    );
}

function WebhookLogList({ items, isLoading }) {
    if (isLoading) {
        return (
            <div className="pay-card">
                <div className="pay-card__title"><BarChart3 size={14} /> Oxirgi webhook'lar</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    {[1, 2, 3, 4].map((i) => <div key={i} className="pay-skel" style={{ height: 44 }} />)}
                </div>
            </div>
        );
    }
    return (
        <div className="pay-card">
            <div className="pay-card__title"><BarChart3 size={14} /> Oxirgi webhook'lar</div>

            {(!items || items.length === 0) ? (
                <div className="pay-empty">
                    Hozircha hech qanday webhook qabul qilinmadi.<br />
                    Payme kabinetiga URL'ni joylab, test tranzaksiya yuboring.
                </div>
            ) : (
                <div className="pay-log">
                    {items.map((it) => {
                        const ok = it.errorCode === null;
                        return (
                            <div key={it.id} className={`pay-log__item ${ok ? '' : 'pay-log__item--err'}`}>
                                <div className="pay-log__icon">
                                    {ok ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div className="pay-log__method">{it.method}</div>
                                    {(it.orderId || it.paymeId) && (
                                        <div className="pay-log__order">
                                            {it.orderId && <span>Order: {it.orderId.slice(0, 12)}…</span>}
                                            {it.isTestMode && <span style={{ marginLeft: 8, color: '#b45309' }}>TEST</span>}
                                        </div>
                                    )}
                                    {!ok && it.errorMsg && (
                                        <PaymeTroubleshooter errorCode={it.errorCode} errorMsg={it.errorMsg} />
                                    )}
                                </div>
                                <div className="pay-log__time">{fmtTime(it.createdAt)}</div>
                                <div className="pay-log__dur">{it.durationMs}ms</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function PaymeTab() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [toast, setToast] = useState('');
    const [modeModalOpen, setModeModalOpen] = useState(false);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(''), 2200);
        return () => clearTimeout(t);
    }, [toast]);

    const { data: configData, isLoading: configLoading } = useQuery({
        queryKey: ['clinic', 'payme', 'config'],
        queryFn: async () => (await api.get('/clinic/payments/payme/config')).data?.data,
    });

    const config = configData?.config;
    const fallbackUrl = configData?.webhookUrl;

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['clinic', 'payme', 'stats'],
        queryFn: async () => (await api.get('/clinic/payments/payme/stats?range=24h')).data?.data,
        enabled: !!config,
        refetchInterval: 30_000,
    });

    const { data: recent, isLoading: recentLoading } = useQuery({
        queryKey: ['clinic', 'payme', 'recent'],
        queryFn: async () => (await api.get('/clinic/payments/payme/recent?limit=15')).data?.data?.items ?? [],
        enabled: !!config,
        refetchInterval: 30_000,
    });

    const toggleActive = useMutation({
        mutationFn: async (next) =>
            (await api.patch('/clinic/payments/payme/config/active', { isActive: next })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'payme', 'config'] }),
    });

    const toggleMode = useMutation({
        mutationFn: async (next) =>
            (await api.patch('/clinic/payments/payme/config/mode', { isTestMode: next })).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clinic', 'payme', 'config'] });
            setToast(`Rejim almashtirildi`);
        },
    });

    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setToast('Nusxalandi');
        } catch {
            setToast('Nusxa olib bo\'lmadi');
        }
    };

    if (configLoading) {
        return (
            <div className="pay-tab">
                <div className="pay-skel" style={{ height: 100 }} />
                <div className="pay-grid">
                    <div className="pay-skel" style={{ height: 240 }} />
                    <div className="pay-skel" style={{ height: 240 }} />
                </div>
                <div className="pay-skel" style={{ height: 160 }} />
            </div>
        );
    }

    if (!config || editing) {
        return (
            <PaymeOnboardingWizard
                webhookUrl={config?.webhookUrl || fallbackUrl}
                initialConfig={config}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                    setEditing(false);
                    qc.invalidateQueries({ queryKey: ['clinic', 'payme', 'config'] });
                    setToast('Saqlandi');
                }}
            />
        );
    }

    return (
        <div className="pay-tab">
            <HeroCard config={config} stats={stats} />

            <div className="pay-grid">
                <HealthCard stats={stats} isLoading={statsLoading} />
                <KeyVaultCard config={config} onRotate={() => setEditing(true)} />
            </div>

            <WebhookUrlBlock url={config.webhookUrl} onCopy={handleCopy} />

            <WebhookLogList items={recent} isLoading={recentLoading} />

            <div className="pay-card">
                <div className="pay-card__title"><ShieldCheck size={14} /> Xavfsizlik va rejim</div>

                <div className="pay-mode-row">
                    <div className="pay-mode-pill">
                        <span
                            className="pay-mode-pill__dot"
                            style={{ background: config.isActive ? (config.isTestMode ? '#fbbf24' : '#10b981') : '#94a3b8' }}
                        />
                        <div>
                            <div className="pay-mode-pill__txt">Rejim</div>
                            <div className="pay-mode-pill__val">
                                {!config.isActive ? "O'chiq" : config.isTestMode ? 'Test (sandbox)' : 'Live (real)'}
                            </div>
                        </div>
                    </div>

                    <button
                        className="pay-btn"
                        onClick={() => setModeModalOpen(true)}
                        disabled={!config.isActive}
                        title={config.isActive ? '' : 'Avval ulanishni yoqing'}
                    >
                        <Zap size={14} /> {config.isTestMode ? 'Live ga o\'tish' : 'Test ga o\'tish'}
                    </button>

                    <button
                        className={`pay-btn ${config.isActive ? 'pay-btn--danger' : 'pay-btn--primary'}`}
                        onClick={() => toggleActive.mutate(!config.isActive)}
                        disabled={toggleActive.isPending}
                    >
                        {toggleActive.isPending
                            ? <Loader2 size={14} className="spin" />
                            : <Power size={14} />}
                        {config.isActive ? "Ulanishni o'chirish" : 'Ulanishni yoqish'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                        <ShieldCheck size={14} color="#10b981" /> Kalitlar AES-256-GCM shifrlangan
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                        <Sparkles size={14} color="#6366f1" /> Tarix saqlanadi (rollback mavjud)
                    </div>
                </div>
            </div>

            <PaymeModeSwitchModal
                open={modeModalOpen}
                currentIsTest={config.isTestMode}
                onClose={() => setModeModalOpen(false)}
                onConfirm={() => {
                    toggleMode.mutate(!config.isTestMode);
                    setModeModalOpen(false);
                }}
            />

            <Toast msg={toast} />
        </div>
    );
}
