import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    X, Clock, Coffee, Plus, Trash2, Loader2,
    CheckCircle2, AlertTriangle, Calendar,
} from 'lucide-react';
import api from '../../../shared/api/axios';

const DAYS = [
    { idx: 1, label: 'Du', full: 'Dushanba' },
    { idx: 2, label: 'Se', full: 'Seshanba' },
    { idx: 3, label: 'Ch', full: 'Chorshanba' },
    { idx: 4, label: 'Pa', full: 'Payshanba' },
    { idx: 5, label: 'Ju', full: 'Juma' },
    { idx: 6, label: 'Sh', full: 'Shanba' },
    { idx: 0, label: 'Ya', full: 'Yakshanba' },
];

const PRESETS = [
    { label: 'Ish kunlari 9-18', items: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00', slotDurationMin: 30 })) },
    { label: 'Du-Sh 10-19', items: [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startTime: '10:00', endTime: '19:00', breakStart: null, breakEnd: null, slotDurationMin: 30 })) },
    { label: 'Faqat hafta oxiri', items: [6, 0].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '15:00', breakStart: null, breakEnd: null, slotDurationMin: 30 })) },
];

function emptyDay(dayOfWeek) {
    return {
        dayOfWeek,
        startTime: '09:00',
        endTime: '18:00',
        slotDurationMin: 30,
        breakStart: null,
        breakEnd: null,
    };
}

function DayCard({ day, item, onChange, onRemove, onAdd }) {
    const enabled = !!item;
    return (
        <div className={`cdocs-sched-day ${enabled ? '' : 'cdocs-sched-day--off'}`}>
            <div className="cdocs-sched-day__head">
                <div className="cdocs-sched-day__name">
                    <span className="cdocs-sched-day__dot" style={{ background: enabled ? '#06b6d4' : '#cbd5e1' }} />
                    {day.full}
                </div>
                {enabled ? (
                    <button className="cdocs-icon-btn cdocs-icon-btn--danger" onClick={onRemove} title="O'chirish">
                        <Trash2 size={13} />
                    </button>
                ) : (
                    <button className="cdocs-btn cdocs-btn--ghost" onClick={() => onAdd(day.idx)}>
                        <Plus size={12} /> Qo'shish
                    </button>
                )}
            </div>

            {enabled && (
                <div className="cdocs-sched-day__body">
                    <div className="cdocs-sched-row">
                        <Clock size={13} color="#64748b" />
                        <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => onChange({ ...item, startTime: e.target.value })}
                        />
                        <span style={{ color: '#94a3b8' }}>—</span>
                        <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => onChange({ ...item, endTime: e.target.value })}
                        />
                    </div>

                    <div className="cdocs-sched-row">
                        <Coffee size={13} color="#64748b" />
                        <input
                            type="time"
                            placeholder="Tushlik"
                            value={item.breakStart || ''}
                            onChange={(e) => onChange({ ...item, breakStart: e.target.value || null })}
                        />
                        <span style={{ color: '#94a3b8' }}>—</span>
                        <input
                            type="time"
                            placeholder="Tushlik"
                            value={item.breakEnd || ''}
                            onChange={(e) => onChange({ ...item, breakEnd: e.target.value || null })}
                        />
                    </div>

                    <div className="cdocs-sched-row">
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Slot:</span>
                        <select
                            value={item.slotDurationMin}
                            onChange={(e) => onChange({ ...item, slotDurationMin: Number(e.target.value) })}
                            style={{ flex: 1 }}
                        >
                            <option value={15}>15 daqiqa</option>
                            <option value={20}>20 daqiqa</option>
                            <option value={30}>30 daqiqa</option>
                            <option value={45}>45 daqiqa</option>
                            <option value={60}>1 soat</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DoctorScheduleEditor({ row, onClose, onSaved }) {
    const [items, setItems] = useState(() => row.schedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMin: s.slotDurationMin,
        breakStart: s.breakStart,
        breakEnd: s.breakEnd,
    })));

    const byDay = items.reduce((acc, it) => {
        acc[it.dayOfWeek] = it;
        return acc;
    }, {});

    const setDay = (dayOfWeek, value) => {
        setItems((prev) => {
            const filtered = prev.filter((p) => p.dayOfWeek !== dayOfWeek);
            return [...filtered, value];
        });
    };

    const addDay = (dayOfWeek) => {
        setItems((prev) => [...prev, emptyDay(dayOfWeek)]);
    };

    const removeDay = (dayOfWeek) => {
        setItems((prev) => prev.filter((p) => p.dayOfWeek !== dayOfWeek));
    };

    const applyPreset = (preset) => {
        setItems(preset.items.map((it) => ({ ...it })));
    };

    const save = useMutation({
        mutationFn: async () => (await api.put(
            `/clinic/doctors/${row.doctorClinicId}/schedule`,
            { items },
        )).data,
        onSuccess: onSaved,
    });

    const totalHours = items.reduce((s, it) => {
        const [sh, sm] = it.startTime.split(':').map(Number);
        const [eh, em] = it.endTime.split(':').map(Number);
        const work = (eh * 60 + em) - (sh * 60 + sm);
        let breakMin = 0;
        if (it.breakStart && it.breakEnd) {
            const [bsh, bsm] = it.breakStart.split(':').map(Number);
            const [beh, bem] = it.breakEnd.split(':').map(Number);
            breakMin = (beh * 60 + bem) - (bsh * 60 + bsm);
        }
        return s + Math.max(0, work - breakMin);
    }, 0) / 60;

    const totalSlots = items.reduce((s, it) => {
        const [sh, sm] = it.startTime.split(':').map(Number);
        const [eh, em] = it.endTime.split(':').map(Number);
        const work = (eh * 60 + em) - (sh * 60 + sm);
        let breakMin = 0;
        if (it.breakStart && it.breakEnd) {
            const [bsh, bsm] = it.breakStart.split(':').map(Number);
            const [beh, bem] = it.breakEnd.split(':').map(Number);
            breakMin = (beh * 60 + bem) - (bsh * 60 + bsm);
        }
        return s + Math.floor(Math.max(0, work - breakMin) / it.slotDurationMin);
    }, 0);

    return (
        <>
            <motion.div
                className="cdocs-drawer-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.aside
                className="cdocs-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28 }}
            >
                <div className="cdocs-drawer__head">
                    <div>
                        <div className="cdocs-drawer__title">
                            <Calendar size={18} />
                            Ish jadvali — {row.doctor.firstName} {row.doctor.lastName}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            Haftalik takrorlanuvchi jadval. Bemorlar shu vaqtlarda online band qila oladi.
                        </div>
                    </div>
                    <button className="cdocs-icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="cdocs-drawer__body">
                    <div className="cdocs-sched-stats">
                        <div>
                            <div className="cdocs-sched-stat__val">{items.length}</div>
                            <div className="cdocs-sched-stat__lbl">Faol kun</div>
                        </div>
                        <div>
                            <div className="cdocs-sched-stat__val">{totalHours.toFixed(1)}s</div>
                            <div className="cdocs-sched-stat__lbl">Haftalik soat</div>
                        </div>
                        <div>
                            <div className="cdocs-sched-stat__val">{totalSlots}</div>
                            <div className="cdocs-sched-stat__lbl">Slot soni</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Tez sozlash
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {PRESETS.map((p) => (
                                <button key={p.label} className="cdocs-btn cdocs-btn--ghost" onClick={() => applyPreset(p)}>
                                    {p.label}
                                </button>
                            ))}
                            <button className="cdocs-btn cdocs-btn--ghost" onClick={() => setItems([])}>
                                Tozalash
                            </button>
                        </div>
                    </div>

                    <div className="cdocs-sched-days">
                        {DAYS.map((d) => (
                            <DayCard
                                key={d.idx}
                                day={d}
                                item={byDay[d.idx]}
                                onChange={(v) => setDay(d.idx, v)}
                                onRemove={() => removeDay(d.idx)}
                                onAdd={addDay}
                            />
                        ))}
                    </div>

                    {save.isError && (
                        <div className="cdocs-error" style={{ marginTop: 12 }}>
                            <AlertTriangle size={14} />
                            {save.error?.response?.data?.message || 'Saqlashda xato'}
                        </div>
                    )}
                </div>

                <div className="cdocs-drawer__foot">
                    <button className="cdocs-btn" onClick={onClose}>Bekor</button>
                    <button
                        className="cdocs-btn cdocs-btn--primary"
                        onClick={() => save.mutate()}
                        disabled={save.isPending}
                    >
                        {save.isPending ? <Loader2 size={14} className="cdocs-spin" /> : <CheckCircle2 size={14} />}
                        Jadvalni saqlash
                    </button>
                </div>
            </motion.aside>
        </>
    );
}
