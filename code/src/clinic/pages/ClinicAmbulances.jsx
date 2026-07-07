import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ambulance, Plus, Search, CheckCircle2, AlertCircle, Wrench, Power,
    Edit3, Trash2, X, Loader2, MapPin, Phone, Heart, Baby, Stethoscope,
    AlertTriangle, Activity, Users, Hash,
} from 'lucide-react';
import api from '../../shared/api/axios';
import AmbulanceEditDrawer from './ambulances/AmbulanceEditDrawer';
import './ambulances/clinic-ambulances.css';

const STATUS_META = {
    AVAILABLE: { label: "Bo'sh", color: '#10b981', icon: <CheckCircle2 size={12} />, dot: 'pulse' },
    BUSY:      { label: 'Bandda',  color: '#f59e0b', icon: <Activity size={12} /> },
    MAINTENANCE: { label: 'Texnik xizmatda', color: '#6366f1', icon: <Wrench size={12} /> },
    OFFLINE:   { label: "O'chiq",  color: '#94a3b8', icon: <Power size={12} /> },
};

const TYPE_META = {
    BASIC:          { label: 'Umumiy',          icon: <Ambulance size={12} />, color: '#06b6d4' },
    INTENSIVE_CARE: { label: 'Reanimatsiya',    icon: <Heart size={12} />,    color: '#ef4444' },
    NEONATAL:       { label: "Yangi tug'ilgan", icon: <Baby size={12} />,     color: '#ec4899' },
    CARDIAC:        { label: 'Yurak',           icon: <Heart size={12} />,    color: '#dc2626' },
    TRAUMA:         { label: 'Travmatologiya',  icon: <AlertCircle size={12} />, color: '#f97316' },
    OBSTETRIC:      { label: "Tug'ruq",         icon: <Baby size={12} />,     color: '#a855f7' },
};

const STATUSES = ['AVAILABLE', 'BUSY', 'MAINTENANCE', 'OFFLINE'];

function StatPill({ icon, value, label, color }) {
    return (
        <div className="cab-stat">
            <div className="cab-stat__icon" style={{ background: `${color}1f`, color }}>{icon}</div>
            <div>
                <div className="cab-stat__val">{value}</div>
                <div className="cab-stat__lbl">{label}</div>
            </div>
        </div>
    );
}

function StatusQuickSwitch({ current, onChange, isPending }) {
    return (
        <div className="cab-quickstatus">
            {STATUSES.map((s) => {
                const m = STATUS_META[s];
                const active = s === current;
                return (
                    <button
                        key={s}
                        className={`cab-qs-btn ${active ? 'cab-qs-btn--on' : ''}`}
                        style={active ? { background: m.color, color: '#fff', borderColor: 'transparent' } : { color: m.color }}
                        onClick={() => onChange(s)}
                        disabled={isPending}
                        title={m.label}
                    >
                        {m.icon} <span>{m.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

function AmbulanceCard({ a, onEdit, onDelete, onStatusChange, statusPending }) {
    const sm = STATUS_META[a.status] || STATUS_META.OFFLINE;
    const tm = TYPE_META[a.type] || TYPE_META.BASIC;
    return (
        <motion.div
            className="cab-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            <div className="cab-card__head">
                <div className="cab-card__icon" style={{ background: `${tm.color}1f`, color: tm.color }}>
                    <Ambulance size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cab-card__name">
                        <Hash size={11} style={{ marginRight: 2, opacity: 0.5 }} />
                        {a.callSign}
                    </div>
                    <div className="cab-card__type">
                        <span style={{ color: tm.color }}>{tm.icon}</span> Transfer
                    </div>
                </div>
                <div className="cab-card__status" style={{ background: `${sm.color}1f`, color: sm.color }}>
                    {sm.dot === 'pulse' && <span className="cab-pulse-dot" style={{ background: sm.color }} />}
                    {sm.label}
                </div>
            </div>

            <div className="cab-card__grid">
                <div className="cab-mini">
                    <div className="cab-mini__lbl">Sig'im</div>
                    <div className="cab-mini__val"><Users size={12} /> {a.capacity}</div>
                </div>
                <div className="cab-mini">
                    <div className="cab-mini__lbl">Davlat raqami</div>
                    <div className="cab-mini__val">{a.licensePlate || '—'}</div>
                </div>
                <div className="cab-mini">
                    <div className="cab-mini__lbl">Model</div>
                    <div className="cab-mini__val">{a.vehicleModel || '—'}</div>
                </div>
                <div className="cab-mini">
                    <div className="cab-mini__lbl">Joylashuv</div>
                    <div className="cab-mini__val">
                        {a.baseLatitude && a.baseLongitude
                            ? <><MapPin size={11} /> Set</>
                            : <span style={{ color: '#cbd5e1' }}>Belgilanmagan</span>}
                    </div>
                </div>
            </div>

            {a.equipment && a.equipment.length > 0 && (
                <div className="cab-equip">
                    {a.equipment.map((e) => <span key={e} className="cab-equip__chip">{e}</span>)}
                </div>
            )}

            <StatusQuickSwitch
                current={a.status}
                onChange={(s) => onStatusChange(a, s)}
                isPending={statusPending === a.id}
            />

            <div className="cab-card__foot">
                <div className="cab-card__phone">
                    {a.dispatchPhone && (
                        <span><Phone size={11} /> {a.dispatchPhone}</span>
                    )}
                </div>
                <div className="cab-card__actions">
                    <button className="cab-icon-btn" onClick={() => onEdit(a)} title="Tahrirlash">
                        <Edit3 size={14} />
                    </button>
                    <button className="cab-icon-btn cab-icon-btn--danger" onClick={() => onDelete(a)} title="O'chirish">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function DeleteConfirm({ open, item, onClose, onConfirm, isPending }) {
    if (!open) return null;
    return (
        <div className="cab-modal-bg" onClick={onClose}>
            <motion.div
                className="cab-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{ maxWidth: 420 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', marginBottom: 8, fontWeight: 800, fontSize: 17 }}>
                    <AlertTriangle size={18} /> Tez yordamni o'chirish
                </div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                    <strong>{item?.callSign}</strong> ni butunlay o'chirmoqchimisiz?
                    Bu amalni qaytarib bo'lmaydi.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="cab-btn" onClick={onClose}>Bekor</button>
                    <button className="cab-btn cab-btn--danger" onClick={onConfirm} disabled={isPending}>
                        {isPending && <Loader2 size={14} className="cab-spin" />}
                        O'chirish
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function ClinicAmbulances() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['clinic', 'ambulances'],
        queryFn: async () => (await api.get('/clinic/ambulances')).data?.data?.items ?? [],
    });

    const changeStatus = useMutation({
        mutationFn: async ({ id, status }) =>
            (await api.patch(`/clinic/ambulances/${id}/status`, { status })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'ambulances'] }),
    });

    const remove = useMutation({
        mutationFn: async (id) => (await api.delete(`/clinic/ambulances/${id}`)).data,
        onSuccess: () => {
            setDeleting(null);
            qc.invalidateQueries({ queryKey: ['clinic', 'ambulances'] });
        },
    });

    const filtered = useMemo(() => {
        const s = search.toLowerCase().trim();
        if (!s) return items;
        return items.filter((a) =>
            a.callSign.toLowerCase().includes(s) ||
            (a.licensePlate || '').toLowerCase().includes(s) ||
            (a.vehicleModel || '').toLowerCase().includes(s)
        );
    }, [items, search]);

    const stats = useMemo(() => ({
        total: items.length,
        available: items.filter((a) => a.status === 'AVAILABLE').length,
        busy: items.filter((a) => a.status === 'BUSY').length,
        maintenance: items.filter((a) => a.status === 'MAINTENANCE').length,
    }), [items]);

    return (
        <div className="cab-page">
            <motion.header
                className="cab-header"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="cab-header__left">
                    <div className="cab-header__icon"><Ambulance size={22} /></div>
                    <div>
                        <h1 className="cab-header__title">Tez yordam</h1>
                        <p className="cab-header__sub">Klinikangiz ambulanslar parki va ularning holati</p>
                    </div>
                </div>
                <button className="cab-btn cab-btn--primary" onClick={() => setEditing({})}>
                    <Plus size={14} /> Ambulans qo'shish
                </button>
            </motion.header>

            <div className="cab-stats">
                <StatPill icon={<Ambulance size={16} />} color="#06b6d4" value={stats.total} label="Jami" />
                <StatPill icon={<CheckCircle2 size={16} />} color="#10b981" value={stats.available} label="Bo'sh" />
                <StatPill icon={<Activity size={16} />} color="#f59e0b" value={stats.busy} label="Bandda" />
                <StatPill icon={<Wrench size={16} />} color="#6366f1" value={stats.maintenance} label="Texnik xizmatda" />
            </div>

            <div className="cab-toolbar">
                <div className="cab-search">
                    <Search size={14} />
                    <input
                        placeholder="Chaqiruv belgisi, raqam, model..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="cab-count">{filtered.length} / {items.length}</div>
            </div>

            {isLoading ? (
                <div className="cab-grid">
                    {[1, 2, 3].map((i) => <div key={i} className="cab-skel" style={{ height: 240 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="cab-empty">
                    <Ambulance size={48} color="#cbd5e1" />
                    <h3>{items.length === 0 ? "Hozircha ambulans yo'q" : 'Topilmadi'}</h3>
                    <p>
                        {items.length === 0
                            ? "Birinchi ambulansni qo'shing — bemorlar uni xaritada ko'radi"
                            : 'Qidiruv shartlarini o\'zgartiring'}
                    </p>
                    {items.length === 0 && (
                        <button className="cab-btn cab-btn--primary" onClick={() => setEditing({})}>
                            <Plus size={14} /> Birinchi ambulans
                        </button>
                    )}
                </div>
            ) : (
                <div className="cab-grid">
                    <AnimatePresence>
                        {filtered.map((a) => (
                            <AmbulanceCard
                                key={a.id}
                                a={a}
                                onEdit={setEditing}
                                onDelete={setDeleting}
                                onStatusChange={(amb, s) => changeStatus.mutate({ id: amb.id, status: s })}
                                statusPending={changeStatus.isPending ? changeStatus.variables?.id : null}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence>
                {editing && (
                    <AmbulanceEditDrawer
                        existing={editing.id ? editing : null}
                        onClose={() => setEditing(null)}
                        onSaved={() => {
                            setEditing(null);
                            qc.invalidateQueries({ queryKey: ['clinic', 'ambulances'] });
                        }}
                    />
                )}
            </AnimatePresence>

            <DeleteConfirm
                open={!!deleting}
                item={deleting}
                onClose={() => setDeleting(null)}
                onConfirm={() => remove.mutate(deleting.id)}
                isPending={remove.isPending}
            />
        </div>
    );
}
