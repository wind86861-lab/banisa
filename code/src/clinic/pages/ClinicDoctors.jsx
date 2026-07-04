import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Search, Edit3, Trash2, Star, Calendar,
    Phone, Mail, Award, Stethoscope, Building2,
    X, Loader2, AlertTriangle, CheckCircle2, MoreVertical,
    Eye, EyeOff,
} from 'lucide-react';
import api from '../../shared/api/axios';
import DoctorEditDrawer from './doctors/DoctorEditDrawer';
import DoctorScheduleEditor from './doctors/DoctorScheduleEditor';
import './doctors/clinic-doctors.css';

const fmtMoney = (n) => (Number(n) || 0).toLocaleString('uz-UZ');

function StatPill({ icon, value, label, color }) {
    return (
        <div className="cdocs-stat">
            <div className="cdocs-stat__icon" style={{ background: `${color}1f`, color }}>{icon}</div>
            <div>
                <div className="cdocs-stat__val">{value}</div>
                <div className="cdocs-stat__lbl">{label}</div>
            </div>
        </div>
    );
}

function DoctorCard({ row, onEdit, onSchedule, onDetach, onToggleActive }) {
    const d = row.doctor;
    const initials = `${(d.firstName?.[0] || '').toUpperCase()}${(d.lastName?.[0] || '').toUpperCase()}`;
    const activeSchedDays = row.schedules.filter((s) => s.isActive).length;

    return (
        <motion.div
            className={`cdocs-card ${!row.isActive ? 'cdocs-card--off' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            <div className="cdocs-card__head">
                {d.photoUrl ? (
                    <img src={d.photoUrl} alt={d.firstName} className="cdocs-card__avatar" />
                ) : (
                    <div className="cdocs-card__avatar cdocs-card__avatar--initials">{initials}</div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cdocs-card__name">{d.firstName} {d.lastName}</div>
                    <div className="cdocs-card__spec">
                        <Stethoscope size={11} /> {d.specialtyName || 'Mutaxassislik tanlanmagan'}
                    </div>
                </div>
                <div className="cdocs-card__rating">
                    <Star size={12} fill={d.reviewCount > 0 ? '#fbbf24' : 'none'} color="#fbbf24" />
                    <span>{d.reviewCount > 0 ? d.averageRating.toFixed(1) : 'Yangi'}</span>
                    {d.reviewCount > 0 && <span style={{ color: '#94a3b8', fontWeight: 600 }}>· {d.reviewCount}</span>}
                </div>
            </div>

            <div className="cdocs-card__grid">
                <div className="cdocs-mini">
                    <div className="cdocs-mini__lbl">Konsultatsiya</div>
                    <div className="cdocs-mini__val">{fmtMoney(row.consultationPrice)} so'm</div>
                </div>
                <div className="cdocs-mini">
                    <div className="cdocs-mini__lbl">Klinikalar</div>
                    <div className="cdocs-mini__val">{d.totalClinics}/3</div>
                </div>
                <div className="cdocs-mini">
                    <div className="cdocs-mini__lbl">Jadval</div>
                    <div className="cdocs-mini__val">{activeSchedDays} kun</div>
                </div>
            </div>

            <div className="cdocs-card__foot">
                <div className="cdocs-card__contact">
                    {d.phone && <span><Phone size={11} /> {d.phone}</span>}
                </div>
                <div className="cdocs-card__actions">
                    <button className="cdocs-btn-icon" onClick={() => onToggleActive(row)} title={row.isActive ? 'Faolsiz qil' : 'Faollashtir'}>
                        {row.isActive ? <Eye size={14} /> : <EyeOff size={14} color="#94a3b8" />}
                    </button>
                    <button className="cdocs-btn-icon" onClick={() => onSchedule(row)} title="Jadval">
                        <Calendar size={14} />
                    </button>
                    <button className="cdocs-btn-icon" onClick={() => onEdit(row)} title="Tahrirlash">
                        <Edit3 size={14} />
                    </button>
                    <button className="cdocs-btn-icon cdocs-btn-icon--danger" onClick={() => onDetach(row)} title="Klinikadan chiqarish">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function DetachConfirm({ open, row, onClose, onConfirm, isPending }) {
    if (!open) return null;
    const d = row?.doctor;
    return (
        <div className="cdocs-modal-bg" onClick={onClose}>
            <motion.div
                className="cdocs-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{ maxWidth: 440 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', marginBottom: 8, fontWeight: 800, fontSize: 17 }}>
                    <AlertTriangle size={18} /> Doktorni klinikadan chiqarish
                </div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                    <strong>{d?.firstName} {d?.lastName}</strong> ni klinikangizdan chiqarmoqchimisiz?
                    Doktor profili va boshqa klinikalardagi ishi saqlanadi — faqat sizning klinikangiz bilan bog'liq jadval va konsultatsiya o'chadi.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="cdocs-btn" onClick={onClose}>Bekor</button>
                    <button className="cdocs-btn cdocs-btn--danger" onClick={onConfirm} disabled={isPending}>
                        {isPending && <Loader2 size={14} className="cdocs-spin" />}
                        Chiqarish
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function ClinicDoctors() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null);   // {} or row
    const [scheduling, setScheduling] = useState(null);
    const [detaching, setDetaching] = useState(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['clinic', 'doctors'],
        queryFn: async () => (await api.get('/clinic/doctors')).data?.data?.items ?? [],
    });

    const toggleActive = useMutation({
        mutationFn: async (row) =>
            (await api.patch(`/clinic/doctors/${row.doctorClinicId}`, { isActive: !row.isActive })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'doctors'] }),
    });

    const detach = useMutation({
        mutationFn: async (row) =>
            (await api.delete(`/clinic/doctors/${row.doctorClinicId}`)).data,
        onSuccess: () => {
            setDetaching(null);
            qc.invalidateQueries({ queryKey: ['clinic', 'doctors'] });
        },
    });

    const filtered = useMemo(() => {
        const s = search.toLowerCase().trim();
        if (!s) return items;
        return items.filter((r) => {
            const d = r.doctor;
            return (
                `${d.firstName} ${d.lastName}`.toLowerCase().includes(s) ||
                (d.phone || '').includes(s) ||
                (d.specialtyName || '').toLowerCase().includes(s)
            );
        });
    }, [items, search]);

    const stats = useMemo(() => {
        const active = items.filter((r) => r.isActive).length;
        const totalScheduledHours = items.reduce((sum, r) => {
            return sum + r.schedules.reduce((s, sch) => {
                if (!sch.isActive) return s;
                const [sh, sm] = sch.startTime.split(':').map(Number);
                const [eh, em] = sch.endTime.split(':').map(Number);
                return s + (eh * 60 + em - sh * 60 - sm) / 60;
            }, 0);
        }, 0);
        return {
            total: items.length,
            active,
            avgRating: items.length > 0
                ? (items.reduce((s, r) => s + (r.doctor.averageRating || 0), 0) / items.length).toFixed(1)
                : '0.0',
            weeklyHours: Math.round(totalScheduledHours),
        };
    }, [items]);

    return (
        <div className="cdocs-page">
            <motion.header
                className="cdocs-header"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="cdocs-header__left">
                    <div className="cdocs-header__icon"><Users size={22} /></div>
                    <div>
                        <h1 className="cdocs-header__title">Doktorlar</h1>
                        <p className="cdocs-header__sub">Klinikangizdagi doktorlar va ularning ish jadvali</p>
                    </div>
                </div>
                <button className="cdocs-btn cdocs-btn--primary" onClick={() => setEditing({})}>
                    <Plus size={14} /> Doktor qo'shish
                </button>
            </motion.header>

            <div className="cdocs-stats">
                <StatPill icon={<Users size={16} />} color="#06b6d4" value={stats.total} label="Jami doktorlar" />
                <StatPill icon={<CheckCircle2 size={16} />} color="#10b981" value={stats.active} label="Faol" />
                <StatPill icon={<Star size={16} />} color="#f59e0b" value={stats.avgRating} label="O'rtacha reyting" />
                <StatPill icon={<Calendar size={16} />} color="#6366f1" value={`${stats.weeklyHours}s`} label="Haftalik ish soat" />
            </div>

            <div className="cdocs-toolbar">
                <div className="cdocs-search">
                    <Search size={14} />
                    <input
                        placeholder="Ism, telefon yoki mutaxassislik..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="cdocs-count">{filtered.length} / {items.length}</div>
            </div>

            {isLoading ? (
                <div className="cdocs-grid">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="cdocs-skel" style={{ height: 200 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="cdocs-empty">
                    <Users size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                        {items.length === 0 ? "Hozircha doktor yo'q" : 'Topilmadi'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, marginBottom: 16 }}>
                        {items.length === 0
                            ? "Birinchi doktorni qo'shing — telefon orqali mavjud doktorni topa olasiz"
                            : 'Qidiruv shartlarini o\'zgartiring'}
                    </div>
                    {items.length === 0 && (
                        <button className="cdocs-btn cdocs-btn--primary" onClick={() => setEditing({})}>
                            <Plus size={14} /> Birinchi doktor
                        </button>
                    )}
                </div>
            ) : (
                <div className="cdocs-grid">
                    <AnimatePresence>
                        {filtered.map((row) => (
                            <DoctorCard
                                key={row.doctorClinicId}
                                row={row}
                                onEdit={setEditing}
                                onSchedule={setScheduling}
                                onDetach={setDetaching}
                                onToggleActive={(r) => toggleActive.mutate(r)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence>
                {editing && (
                    <DoctorEditDrawer
                        row={editing.doctorClinicId ? editing : null}
                        onClose={() => setEditing(null)}
                        onSaved={() => {
                            setEditing(null);
                            qc.invalidateQueries({ queryKey: ['clinic', 'doctors'] });
                        }}
                    />
                )}
                {scheduling && (
                    <DoctorScheduleEditor
                        row={scheduling}
                        onClose={() => setScheduling(null)}
                        onSaved={() => {
                            setScheduling(null);
                            qc.invalidateQueries({ queryKey: ['clinic', 'doctors'] });
                        }}
                    />
                )}
            </AnimatePresence>

            <DetachConfirm
                open={!!detaching}
                row={detaching}
                onClose={() => setDetaching(null)}
                onConfirm={() => detach.mutate(detaching)}
                isPending={detach.isPending}
            />
        </div>
    );
}
