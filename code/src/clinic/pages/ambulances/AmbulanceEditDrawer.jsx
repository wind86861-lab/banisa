import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    X, Ambulance, Loader2, AlertTriangle, CheckCircle2,
    Heart, Activity, Stethoscope, Zap,
} from 'lucide-react';
import api from '../../../shared/api/axios';
import ImageUpload from '../../../shared/components/ImageUpload';

// Two patient-facing tiers. Both are transport (moving the patient) — the
// difference is the level of on-board care, described to the patient at order
// time. Mapped onto the existing enum values (no new enum needed).
const TYPES = [
    { value: 'BASIC', label: '🚐 Oddiy tibbiy transport', hint: 'Ahvoli barqaror bemorni xavfsiz olib o\'tish' },
    { value: 'INTENSIVE_CARE', label: '🚑 Reanimatsion tez yordam', hint: 'Reanimatsiya jihozlari + tibbiy xodim, yo\'lda nazorat' },
];

// Format a band's km range for the tariff table label.
const bandRange = (b) => b.maxKm == null ? `${b.minKm}+ km` : `${b.minKm}–${b.maxKm} km`;

const EQUIPMENT_PRESETS = [
    { key: 'defibrillator', label: 'Defibrillator' },
    { key: 'ventilator',    label: "Sun'iy nafas (ventilyator)" },
    { key: 'monitor',       label: 'Yurak monitor' },
    { key: 'ekg',           label: 'EKG' },
    { key: 'oxygen',        label: 'Kislorod' },
    { key: 'incubator',     label: 'Inkubator (chaqaloq)' },
    { key: 'stretcher',     label: 'Nosilka' },
    { key: 'iv-pump',       label: 'IV nasos' },
];

const STATUS_OPTIONS = [
    { value: 'OFFLINE', label: "O'chiq (boshlanish)" },
    { value: 'AVAILABLE', label: "Bo'sh" },
];

export default function AmbulanceEditDrawer({ existing, onClose, onSaved }) {
    const isEdit = !!existing?.id;
    const [callSign, setCallSign] = useState(existing?.callSign || '');
    const [type, setType] = useState(existing?.type || 'BASIC');
    const [vehicleModel, setVehicleModel] = useState(existing?.vehicleModel || '');
    const [licensePlate, setLicensePlate] = useState(existing?.licensePlate || '');
    const [capacity, setCapacity] = useState(existing?.capacity ?? 1);
    const [equipment, setEquipment] = useState(existing?.equipment || []);
    const [baseFee, setBaseFee] = useState(existing?.baseFee ?? '');
    const [pricePerKm, setPricePerKm] = useState(existing?.pricePerKm ?? '');

    // Per-band tariff table (admin-defined bands × this vehicle's price).
    const { data: bands = [] } = useQuery({
        queryKey: ['skory', 'bands'],
        queryFn: async () => (await api.get('/skory/bands')).data?.data?.items ?? [],
    });
    const [bandTariffs, setBandTariffs] = useState(() => {
        const m = {};
        for (const t of existing?.bandTariffs ?? []) m[t.bandId] = { baseFee: t.baseFee, pricePerKm: t.pricePerKm };
        return m;
    });
    const setTariff = (bandId, field, value) =>
        setBandTariffs((cur) => ({ ...cur, [bandId]: { ...(cur[bandId] || {}), [field]: value } }));
    const [dispatchPhone, setDispatchPhone] = useState(existing?.dispatchPhone || '');
    const [dispatcherPhone, setDispatcherPhone] = useState(existing?.dispatcherPhone || '');
    const [dispatcherLinked, setDispatcherLinked] = useState(Boolean(existing?.dispatcherUserId));
    const [notes, setNotes] = useState(existing?.notes || '');
    const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl || '');
    const [status, setStatus] = useState(existing?.status || 'OFFLINE');

    const toggleEquip = (key) => {
        setEquipment((cur) => cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]);
    };

    const save = useMutation({
        mutationFn: async () => {
            const body = {
                callSign,
                type,
                vehicleModel: vehicleModel || null,
                licensePlate: licensePlate || null,
                capacity: Number(capacity) || 1,
                equipment,
                baseFee: baseFee === '' ? null : Number(baseFee),
                pricePerKm: pricePerKm === '' ? null : Number(pricePerKm),
                bandTariffs: bands
                    .map((b) => ({
                        bandId: b.id,
                        baseFee: bandTariffs[b.id]?.baseFee,
                        pricePerKm: bandTariffs[b.id]?.pricePerKm,
                    }))
                    // keep only rows the clinic actually filled (a per-km value)
                    .filter((r) => r.pricePerKm !== undefined && r.pricePerKm !== '' && r.pricePerKm !== null)
                    .map((r) => ({ bandId: r.bandId, baseFee: Number(r.baseFee || 0), pricePerKm: Number(r.pricePerKm) })),
                dispatchPhone: dispatchPhone || null,
                dispatcherPhone: dispatcherPhone || null,
                photoUrl: photoUrl || null,
                notes: notes || null,
            };
            if (isEdit) {
                return (await api.patch(`/clinic/ambulances/${existing.id}`, body)).data;
            }
            return (await api.post('/clinic/ambulances', { ...body, status })).data;
        },
        onSuccess: (res) => {
            // Refresh the linked indicator in-place so admin sees the result
            // without closing+reopening the drawer.
            const updated = res?.data;
            if (updated) setDispatcherLinked(Boolean(updated.dispatcherUserId));
            onSaved?.(res);
        },
    });

    const canSubmit = callSign.trim().length >= 1;

    return (
        <>
            <motion.div
                className="cab-drawer-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.aside
                className="cab-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28 }}
            >
                <div className="cab-drawer__head">
                    <div className="cab-drawer__title">
                        <Ambulance size={18} />
                        {isEdit ? 'Ambulansni tahrirlash' : 'Yangi ambulans'}
                    </div>
                    <button className="cab-icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="cab-drawer__body">
                    <div className="cab-form-grid">
                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <label>Chaqiruv belgisi *</label>
                            <input
                                value={callSign}
                                onChange={(e) => setCallSign(e.target.value)}
                                placeholder="A-12 yoki Skoraya-7"
                                autoFocus
                            />
                        </div>

                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <label>Xizmat turi</label>
                            <select value={type} onChange={(e) => setType(e.target.value)}>
                                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <div className="cab-hint">{TYPES.find((t) => t.value === type)?.hint}</div>
                        </div>

                        <div className="cab-field">
                            <label>Avto modeli</label>
                            <input
                                value={vehicleModel}
                                onChange={(e) => setVehicleModel(e.target.value)}
                                placeholder="Mercedes Sprinter"
                            />
                        </div>
                        <div className="cab-field">
                            <label>Davlat raqami</label>
                            <input
                                value={licensePlate}
                                onChange={(e) => setLicensePlate(e.target.value)}
                                placeholder="01 X 234 AA"
                            />
                        </div>

                        <div className="cab-field">
                            <label>Sig'im (bemor)</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                            />
                        </div>
                        <div className="cab-field">
                            <label>📞 Klinika qabul telefoni</label>
                            <input
                                value={dispatchPhone}
                                onChange={(e) => setDispatchPhone(e.target.value)}
                                placeholder="+998 71 ..."
                            />
                            <div className="cab-hint">Bemorlar ko'radigan asosiy aloqa raqami</div>
                        </div>

                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <label>
                                🤖 Dispatcher Telegram (mas'ul shaxs)
                            </label>
                            <input
                                value={dispatcherPhone}
                                onChange={(e) => setDispatcherPhone(e.target.value)}
                                placeholder="+998 90 ..."
                            />
                            <div style={{ fontSize: 11, marginTop: 4, color: dispatcherLinked ? '#059669' : '#94a3b8' }}>
                                {dispatcherLinked
                                    ? '✅ Bog\'langan — bu shaxs Telegram bot orqali tez yordam so\'rovlarini qabul qiladi'
                                    : '⚠️ Hali bog\'lanmagan. Bu raqamga ega shaxs Banisa botiga /start bossa, avtomatik ulanadi. Bunisiz ambulans onlayn so\'rovlarni olmaydi.'}
                            </div>
                        </div>

                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <label>Jihozlar</label>
                            <div className="cab-equip-grid">
                                {EQUIPMENT_PRESETS.map((eq) => (
                                    <button
                                        key={eq.key}
                                        type="button"
                                        className={`cab-equip-toggle ${equipment.includes(eq.key) ? 'cab-equip-toggle--on' : ''}`}
                                        onClick={() => toggleEquip(eq.key)}
                                    >
                                        {equipment.includes(eq.key) && <CheckCircle2 size={11} />}
                                        {eq.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {bands.length > 0 && (
                            <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                                <label>Masofa bo'yicha narx</label>
                                <div className="cab-hint" style={{ marginBottom: 8 }}>
                                    Bemor yo'li qaysi poyasga tushsa, o'sha poyas narxi ishlaydi:
                                    boshlang'ich narx + (yo'l km × km narxi). Faqat to'ldirilgan poyaslar hisobga olinadi.
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {bands.map((b) => (
                                        <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ minWidth: 96, fontSize: 13, fontWeight: 600, color: '#334155' }}>
                                                {b.label}<div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{bandRange(b)}</div>
                                            </div>
                                            <input
                                                type="number" min={0}
                                                value={bandTariffs[b.id]?.baseFee ?? ''}
                                                onChange={(e) => setTariff(b.id, 'baseFee', e.target.value)}
                                                placeholder="boshlang'ich"
                                                style={{ flex: 1, minWidth: 110, padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                                            />
                                            <input
                                                type="number" min={0}
                                                value={bandTariffs[b.id]?.pricePerKm ?? ''}
                                                onChange={(e) => setTariff(b.id, 'pricePerKm', e.target.value)}
                                                placeholder="1 km narxi"
                                                style={{ flex: 1, minWidth: 110, padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="cab-field">
                            <label>Chaqiruv narxi (so'm){bands.length > 0 ? ' — zaxira' : ''}</label>
                            <input
                                type="number"
                                value={baseFee}
                                onChange={(e) => setBaseFee(e.target.value)}
                                placeholder="50000"
                            />
                            {bands.length > 0 && <div className="cab-hint">Poyas narxi to'ldirilmagan holatda ishlatiladi</div>}
                        </div>
                        <div className="cab-field">
                            <label>1 km narxi (so'm){bands.length > 0 ? ' — zaxira' : ''}</label>
                            <input
                                type="number"
                                value={pricePerKm}
                                onChange={(e) => setPricePerKm(e.target.value)}
                                placeholder="3000"
                            />
                        </div>

                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <ImageUpload
                                value={photoUrl}
                                onChange={setPhotoUrl}
                                label="Ambulans rasmi (ixtiyoriy)"
                                hint="Bemorlar xaritada ambulansni ko'rganda tanishtirgich"
                            />
                        </div>

                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <label>Izoh</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Qo'shimcha ma'lumot"
                            />
                        </div>

                        {!isEdit && (
                            <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                                <label>Boshlash holati</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {save.isError && (
                        <div className="cab-error">
                            <AlertTriangle size={14} />
                            {save.error?.response?.data?.message || 'Saqlashda xato'}
                        </div>
                    )}
                </div>

                <div className="cab-drawer__foot">
                    <button className="cab-btn" onClick={onClose}>Bekor</button>
                    <button
                        className="cab-btn cab-btn--primary"
                        onClick={() => save.mutate()}
                        disabled={save.isPending || !canSubmit}
                    >
                        {save.isPending ? <Loader2 size={14} className="cab-spin" /> : <CheckCircle2 size={14} />}
                        {isEdit ? 'Saqlash' : "Qo'shish"}
                    </button>
                </div>
            </motion.aside>
        </>
    );
}
