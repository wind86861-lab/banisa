import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Stethoscope, Plus, Edit2, Trash2, X, Loader2, Search,
    GripVertical, Eye, EyeOff, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import api from '../../shared/api/axios';
import './admin-specialties.css';

function SpecialtyModal({ initial, onClose, onSaved }) {
    const isEdit = !!initial?.id;
    const [nameUz, setNameUz] = useState(initial?.nameUz || '');
    const [nameRu, setNameRu] = useState(initial?.nameRu || '');
    const [nameEn, setNameEn] = useState(initial?.nameEn || '');
    const [icon, setIcon] = useState(initial?.icon || '');
    const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

    const save = useMutation({
        mutationFn: async () => {
            const body = { nameUz, nameRu: nameRu || null, nameEn: nameEn || null, icon: icon || null, sortOrder: Number(sortOrder) || 0 };
            if (isEdit) {
                return (await api.patch(`/admin/specialties/${initial.id}`, body)).data;
            }
            return (await api.post('/admin/specialties', body)).data;
        },
        onSuccess: onSaved,
    });

    return (
        <div className="asp-modal-bg" onClick={onClose}>
            <motion.div
                className="asp-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="asp-modal__head">
                    <div className="asp-modal__title">
                        <Stethoscope size={18} /> {isEdit ? 'Mutaxassislikni tahrirlash' : 'Yangi mutaxassislik'}
                    </div>
                    <button className="asp-icon-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="asp-field">
                    <label className="asp-field__label">Nomi (UZ) *</label>
                    <input
                        className="asp-field__input"
                        value={nameUz}
                        onChange={(e) => setNameUz(e.target.value)}
                        placeholder="Kardiolog"
                        autoFocus
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="asp-field">
                        <label className="asp-field__label">Nomi (RU)</label>
                        <input className="asp-field__input" value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Кардиолог" />
                    </div>
                    <div className="asp-field">
                        <label className="asp-field__label">Nomi (EN)</label>
                        <input className="asp-field__input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Cardiologist" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                    <div className="asp-field">
                        <label className="asp-field__label">Ikon (lucide nomi yoki URL)</label>
                        <input className="asp-field__input" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Heart" />
                    </div>
                    <div className="asp-field">
                        <label className="asp-field__label">Tartib</label>
                        <input
                            type="number"
                            className="asp-field__input"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        />
                    </div>
                </div>

                {save.isError && (
                    <div className="asp-error">
                        <AlertTriangle size={14} />
                        {save.error?.response?.data?.message || 'Xato yuz berdi'}
                    </div>
                )}

                <div className="asp-modal__actions">
                    <button className="asp-btn" onClick={onClose}>Bekor</button>
                    <button
                        className="asp-btn asp-btn--primary"
                        onClick={() => save.mutate()}
                        disabled={save.isPending || nameUz.trim().length < 2}
                    >
                        {save.isPending ? <Loader2 size={14} className="asp-spin" /> : <CheckCircle2 size={14} />}
                        {isEdit ? 'Saqlash' : 'Yaratish'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function DeleteConfirm({ open, item, onClose, onConfirm, isPending, softNote }) {
    if (!open) return null;
    return (
        <div className="asp-modal-bg" onClick={onClose}>
            <motion.div
                className="asp-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{ maxWidth: 420 }}
            >
                <div className="asp-modal__title" style={{ color: '#dc2626', marginBottom: 8 }}>
                    <AlertTriangle size={18} /> O'chirishni tasdiqlang
                </div>
                <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
                    <strong>{item?.nameUz}</strong> mutaxassisligini o'chirmoqchimisiz?
                    {item?.doctorCount > 0 && (
                        <span style={{ display: 'block', marginTop: 8, color: '#b45309' }}>
                            ⚠ {item.doctorCount} ta doktorga bog'langan — o'chirish o'rniga faolsiz qilinadi.
                        </span>
                    )}
                </p>
                <div className="asp-modal__actions">
                    <button className="asp-btn" onClick={onClose}>Bekor</button>
                    <button
                        className="asp-btn asp-btn--danger"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 size={14} className="asp-spin" />}
                        {item?.doctorCount > 0 ? 'Faolsiz qil' : "O'chirish"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function AdminSpecialties() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['admin', 'specialties'],
        queryFn: async () => (await api.get('/admin/specialties')).data?.data?.items ?? [],
    });

    const toggleActive = useMutation({
        mutationFn: async ({ id, isActive }) =>
            (await api.patch(`/admin/specialties/${id}`, { isActive })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'specialties'] }),
    });

    const remove = useMutation({
        mutationFn: async (id) => (await api.delete(`/admin/specialties/${id}`)).data,
        onSuccess: () => {
            setDeleting(null);
            qc.invalidateQueries({ queryKey: ['admin', 'specialties'] });
        },
    });

    const filtered = items.filter((s) =>
        s.nameUz.toLowerCase().includes(search.toLowerCase()) ||
        (s.nameRu || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="asp-page">
            <motion.header
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="asp-header"
            >
                <div className="asp-header__left">
                    <div className="asp-header__icon"><Stethoscope size={22} /></div>
                    <div>
                        <h1 className="asp-header__title">Mutaxassisliklar katalogi</h1>
                        <p className="asp-header__sub">
                            Doktor mutaxassisliklarini boshqarish — klinikalar shu ro'yxatdan tanlaydi
                        </p>
                    </div>
                </div>
                <button
                    className="asp-btn asp-btn--primary"
                    onClick={() => setEditing({})}
                >
                    <Plus size={14} /> Yangi mutaxassislik
                </button>
            </motion.header>

            <div className="asp-toolbar">
                <div className="asp-search">
                    <Search size={14} />
                    <input
                        placeholder="Mutaxassislik nomidan qidiring..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="asp-count">{filtered.length} ta mutaxassislik</div>
            </div>

            <div className="asp-list">
                {isLoading ? (
                    [1, 2, 3, 4].map((i) => <div key={i} className="asp-skel" style={{ height: 64 }} />)
                ) : filtered.length === 0 ? (
                    <div className="asp-empty">
                        <Stethoscope size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                        <div style={{ fontSize: 16, fontWeight: 800 }}>
                            {items.length === 0 ? 'Hozircha mutaxassislik yo\'q' : 'Topilmadi'}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                            {items.length === 0 ? 'Birinchi mutaxassislikni qo\'shing' : 'Qidiruv shartlarini o\'zgartiring'}
                        </div>
                    </div>
                ) : (
                    filtered.map((s) => (
                        <motion.div
                            key={s.id}
                            className={`asp-row ${!s.isActive ? 'asp-row--off' : ''}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="asp-row__drag"><GripVertical size={16} /></div>
                            <div className="asp-row__icon" style={{ background: s.isActive ? 'rgba(6,182,212,0.12)' : 'rgba(148,163,184,0.18)' }}>
                                <Stethoscope size={16} color={s.isActive ? '#06b6d4' : '#94a3b8'} />
                            </div>
                            <div className="asp-row__body">
                                <div className="asp-row__name">{s.nameUz}</div>
                                <div className="asp-row__meta">
                                    {s.nameRu && <span>{s.nameRu}</span>}
                                    {s.nameEn && <span>· {s.nameEn}</span>}
                                    <span>· {s.doctorCount} doktor</span>
                                    <span>· Tartib: {s.sortOrder}</span>
                                </div>
                            </div>
                            <div className="asp-row__actions">
                                <button
                                    className="asp-icon-btn"
                                    onClick={() => toggleActive.mutate({ id: s.id, isActive: !s.isActive })}
                                    title={s.isActive ? 'Faolsiz qilish' : 'Faollashtirish'}
                                >
                                    {s.isActive ? <Eye size={14} /> : <EyeOff size={14} color="#94a3b8" />}
                                </button>
                                <button
                                    className="asp-icon-btn"
                                    onClick={() => setEditing(s)}
                                    title="Tahrirlash"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    className="asp-icon-btn asp-icon-btn--danger"
                                    onClick={() => setDeleting(s)}
                                    title="O'chirish"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <AnimatePresence>
                {editing && (
                    <SpecialtyModal
                        initial={editing}
                        onClose={() => setEditing(null)}
                        onSaved={() => {
                            setEditing(null);
                            qc.invalidateQueries({ queryKey: ['admin', 'specialties'] });
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
