import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Ambulance, Phone, MapPin, Clock, CheckCircle2, XCircle,
    Activity, ChevronRight, Loader2, AlertCircle, RefreshCw, Star,
} from 'lucide-react';
import api from '../../shared/api/axios';

const STATUS_META = {
    PENDING:    { label: 'Kutilmoqda',    color: '#f59e0b', icon: Clock },
    DISPATCHED: { label: 'Qabul qilindi', color: '#3b82f6', icon: CheckCircle2 },
    ON_ROUTE:   { label: "Yo'lda",         color: '#06b6d4', icon: Activity },
    ARRIVED:    { label: 'Yetib keldi',   color: '#8b5cf6', icon: MapPin },
    COMPLETED:  { label: 'Yakunlandi',    color: '#10b981', icon: CheckCircle2 },
    CANCELLED:  { label: 'Bekor qilingan', color: '#94a3b8', icon: XCircle },
};

const ACTIVE_STATUSES = ['DISPATCHED', 'ON_ROUTE', 'ARRIVED'];

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function StatusPill({ status, size = 'md' }) {
    const m = STATUS_META[status] || { label: status, color: '#94a3b8', icon: Clock };
    const Icon = m.icon;
    const fz = size === 'sm' ? 11 : 12;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: `${m.color}1f`, color: m.color, borderRadius: 999,
            padding: '3px 9px', fontSize: fz, fontWeight: 600,
        }}>
            <Icon size={fz} /> {m.label}
        </span>
    );
}

function RequestRow({ r, onOpen }) {
    const patientName = [r.patient?.firstName, r.patient?.lastName].filter(Boolean).join(' ') || 'Bemor';
    const amb = r.acceptedAmbulance;
    const distance = r.estimatedDistanceKm != null ? `${r.estimatedDistanceKm.toFixed(1)} km` : '—';
    return (
        <div
            onClick={() => onOpen(r)}
            style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
                padding: 14, marginBottom: 10, cursor: 'pointer',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 10,
                transition: 'transform .12s, border-color .12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <StatusPill status={r.status} />
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{patientName}</span>
                    {r.patient?.phone && (
                        <a href={`tel:${r.patient.phone}`} onClick={(e) => e.stopPropagation()}
                           style={{ color: '#0284c7', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={11} /> {r.patient.phone}
                        </a>
                    )}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {amb && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Ambulance size={11} /> {amb.callSign}
                        </span>
                    )}
                    <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {r.pickupAddress || `${r.pickupLat.toFixed(4)}, ${r.pickupLng.toFixed(4)}`}</span>
                    <span>{distance}</span>
                    <span>{fmtDate(r.createdAt)}</span>
                </div>
            </div>
            <div style={{ alignSelf: 'center', color: '#94a3b8' }}><ChevronRight size={18} /></div>
        </div>
    );
}

function DetailDrawer({ requestId, onClose }) {
    const { data: r, isLoading } = useQuery({
        queryKey: ['skory-request', requestId],
        queryFn: async () => (await api.get(`/clinic/skory-requests/${requestId}`)).data?.data,
        enabled: !!requestId,
        refetchInterval: 8000,
    });
    if (!requestId) return null;
    const patientName = r ? [r.patient?.firstName, r.patient?.lastName].filter(Boolean).join(' ') || 'Bemor' : '';
    return (
        <>
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
            }} />
            <aside style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 96vw)',
                background: '#fff', zIndex: 101, padding: 24, overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>So'rov tafsilotlari</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 0, fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>
                {isLoading || !r ? <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="cab-spin" /></div> : (
                    <>
                        <div style={{ marginBottom: 14 }}><StatusPill status={r.status} /></div>
                        <div style={{ fontSize: 13, lineHeight: 1.7, color: '#334155' }}>
                            <div><b>Bemor:</b> {patientName}</div>
                            {r.patient?.phone && <div><b>Tel:</b> <a href={`tel:${r.patient.phone}`}>{r.patient.phone}</a></div>}
                            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                            <div><b>📍 Olib ketish:</b> {r.pickupAddress || `${r.pickupLat.toFixed(5)}, ${r.pickupLng.toFixed(5)}`}</div>
                            <div>
                                <a href={`https://maps.google.com/?q=${r.pickupLat},${r.pickupLng}`} target="_blank" rel="noopener noreferrer"
                                   style={{ fontSize: 11, color: '#0284c7' }}>📍 Xaritada ko'rish →</a>
                            </div>
                            {r.destAddress && <div style={{ marginTop: 8 }}><b>🏥 Manzil:</b> {r.destAddress}</div>}
                            {r.destClinic?.nameUz && <div><b>Klinika:</b> {r.destClinic.nameUz}</div>}
                            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                            {r.acceptedAmbulance && (
                                <>
                                    <div><b>🚑 Ambulans:</b> {r.acceptedAmbulance.callSign} {r.acceptedAmbulance.vehicleModel && `(${r.acceptedAmbulance.vehicleModel})`}</div>
                                    {r.acceptedAmbulance.licensePlate && <div><b>Davlat raqami:</b> {r.acceptedAmbulance.licensePlate}</div>}
                                </>
                            )}
                            {r.estimatedDistanceKm != null && <div><b>Masofa:</b> {r.estimatedDistanceKm.toFixed(1)} km</div>}
                            {r.estimatedDurationMin != null && <div><b>ETA:</b> ~{r.estimatedDurationMin} daq</div>}
                            {r.priceMaxSom && <div><b>Maks. narx:</b> {r.priceMaxSom.toLocaleString('uz-UZ')} so'm</div>}
                            {r.description && (
                                <>
                                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                    <div><b>📝 Tafsilot:</b><br />{r.description}</div>
                                </>
                            )}
                            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                                <div>Yaratildi: {fmtDate(r.createdAt)}</div>
                                {r.acceptedAt && <div>Qabul: {fmtDate(r.acceptedAt)}</div>}
                                {r.completedAt && <div>Yakun: {fmtDate(r.completedAt)}</div>}
                                {r.cancelledAt && <div>Bekor: {fmtDate(r.cancelledAt)} ({r.cancelReason || '—'})</div>}
                            </div>
                            {r.review && (
                                <>
                                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                    <div><b>Bemor sharhi:</b> {'⭐'.repeat(r.review.rating)} <span style={{ color: '#64748b' }}>({r.review.rating}/5)</span></div>
                                    {r.review.comment && <div style={{ marginTop: 4, color: '#475569' }}>"{r.review.comment}"</div>}
                                </>
                            )}
                            {r.offers?.length > 0 && (
                                <>
                                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                    <div style={{ marginBottom: 6 }}><b>Yuborilgan ambulanslar:</b></div>
                                    {r.offers.map((o) => (
                                        <div key={o.id} style={{ fontSize: 11, marginBottom: 4 }}>
                                            • <b>{o.ambulance?.callSign}</b> — {o.status} ({fmtDate(o.sentAt)})
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </>
                )}
            </aside>
        </>
    );
}

export default function ClinicSkoryRequests() {
    const [statusFilter, setStatusFilter] = useState('');
    const [openId, setOpenId] = useState(null);

    const { data: stats } = useQuery({
        queryKey: ['skory-stats'],
        queryFn: async () => (await api.get('/clinic/skory-requests/stats')).data?.data,
        refetchInterval: 30000,
    });

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['skory-requests', statusFilter],
        queryFn: async () => {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            return (await api.get('/clinic/skory-requests', { params })).data?.data?.items ?? [];
        },
        refetchInterval: 15000,
    });

    const grouped = useMemo(() => {
        const items = data || [];
        const active = items.filter((r) => ACTIVE_STATUSES.includes(r.status));
        const pending = items.filter((r) => r.status === 'PENDING');
        const past = items.filter((r) => ['COMPLETED', 'CANCELLED'].includes(r.status));
        return { active, pending, past };
    }, [data]);

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 22 }}>
                    <Ambulance size={22} color="#dc2626" /> Tez yordam so'rovlari
                </h2>
                <button onClick={() => refetch()} disabled={isFetching}
                        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px',
                                 cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <RefreshCw size={14} className={isFetching ? 'cab-spin' : ''} /> Yangilash
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                <Stat label="Hozir faol" value={stats?.activeNow ?? 0} color="#3b82f6" icon={<Activity size={16} />} />
                <Stat label="30 kun (jami)" value={stats?.last30Days?.total ?? 0} color="#0f172a" icon={<Clock size={16} />} />
                <Stat label="30 kun (yakun)" value={stats?.last30Days?.completed ?? 0} color="#10b981" icon={<CheckCircle2 size={16} />} />
                <Stat label="30 kun (bekor)" value={stats?.last30Days?.cancelled ?? 0} color="#94a3b8" icon={<XCircle size={16} />} />
                <Stat
                    label={`Reyting (${stats?.rating?.count ?? 0} ta)`}
                    value={stats?.rating?.avg != null ? `${stats.rating.avg} ⭐` : '—'}
                    color="#f59e0b"
                    icon={<Star size={16} />}
                />
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                <FilterChip active={statusFilter === ''} onClick={() => setStatusFilter('')}>Hammasi</FilterChip>
                {Object.entries(STATUS_META).map(([k, m]) => (
                    <FilterChip key={k} active={statusFilter === k} onClick={() => setStatusFilter(k)} color={m.color}>{m.label}</FilterChip>
                ))}
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="cab-spin" size={28} /></div>
            ) : (data || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <AlertCircle size={32} color="#94a3b8" />
                    <div style={{ marginTop: 8, color: '#64748b' }}>Hozircha so'rov yo'q</div>
                </div>
            ) : (
                <>
                    {grouped.active.length > 0 && (
                        <Section title="🔴 Hozir faol" subtitle={`${grouped.active.length} ta`}>
                            {grouped.active.map((r) => <RequestRow key={r.id} r={r} onOpen={(x) => setOpenId(x.id)} />)}
                        </Section>
                    )}
                    {grouped.pending.length > 0 && (
                        <Section title="⏳ Yuborilmoqda" subtitle={`${grouped.pending.length} ta`}>
                            {grouped.pending.map((r) => <RequestRow key={r.id} r={r} onOpen={(x) => setOpenId(x.id)} />)}
                        </Section>
                    )}
                    {grouped.past.length > 0 && (
                        <Section title="Tarix">
                            {grouped.past.map((r) => <RequestRow key={r.id} r={r} onOpen={(x) => setOpenId(x.id)} />)}
                        </Section>
                    )}
                </>
            )}

            <DetailDrawer requestId={openId} onClose={() => setOpenId(null)} />
        </div>
    );
}

function Stat({ label, value, color, icon }) {
    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <div style={{ background: `${color}1f`, color, borderRadius: 10, padding: 8 }}>{icon}</div>
            <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{label}</div>
            </div>
        </div>
    );
}

function FilterChip({ active, onClick, children, color }) {
    return (
        <button onClick={onClick} style={{
            background: active ? (color || '#0f172a') : '#fff',
            color: active ? '#fff' : '#475569',
            border: `1px solid ${active ? 'transparent' : '#e2e8f0'}`,
            borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
        }}>{children}</button>
    );
}

function Section({ title, subtitle, children }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                {title} {subtitle && <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {subtitle}</span>}
            </h3>
            {children}
        </div>
    );
}
