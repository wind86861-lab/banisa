import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    X, Ambulance, Loader2, AlertTriangle, CheckCircle2,
    MapPin, Heart, Activity, Stethoscope, Zap,
} from 'lucide-react';
import api from '../../../shared/api/axios';
import ImageUpload from '../../../shared/components/ImageUpload';

const TYPES = [
    { value: 'BASIC',          label: 'Umumiy' },
    { value: 'INTENSIVE_CARE', label: 'Reanimatsiya' },
    { value: 'NEONATAL',       label: "Yangi tug'ilgan bolalar" },
    { value: 'CARDIAC',        label: 'Yurak (kardiologiya)' },
    { value: 'TRAUMA',         label: 'Travmatologiya' },
    { value: 'OBSTETRIC',      label: "Tug'ruq" },
];

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
    const [baseLatitude, setBaseLatitude] = useState(existing?.baseLatitude ?? '');
    const [baseLongitude, setBaseLongitude] = useState(existing?.baseLongitude ?? '');
    const [baseFee, setBaseFee] = useState(existing?.baseFee ?? '');
    const [pricePerKm, setPricePerKm] = useState(existing?.pricePerKm ?? '');
    const [dispatchPhone, setDispatchPhone] = useState(existing?.dispatchPhone || '');
    const [dispatcherPhone, setDispatcherPhone] = useState(existing?.dispatcherPhone || '');
    const dispatcherLinked = Boolean(existing?.dispatcherUserId);
    const [notes, setNotes] = useState(existing?.notes || '');
    const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl || '');
    const [status, setStatus] = useState(existing?.status || 'OFFLINE');

    const toggleEquip = (key) => {
        setEquipment((cur) => cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]);
    };

    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setBaseLatitude(pos.coords.latitude.toFixed(6));
                setBaseLongitude(pos.coords.longitude.toFixed(6));
            },
            (err) => console.warn('geo:', err.message),
            { enableHighAccuracy: true, timeout: 8000 },
        );
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
                baseLatitude: baseLatitude === '' ? null : Number(baseLatitude),
                baseLongitude: baseLongitude === '' ? null : Number(baseLongitude),
                baseFee: baseFee === '' ? null : Number(baseFee),
                pricePerKm: pricePerKm === '' ? null : Number(pricePerKm),
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
        onSuccess: onSaved,
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
                            <label>Turi</label>
                            <select value={type} onChange={(e) => setType(e.target.value)}>
                                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
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
                            <label>Tezkor telefon</label>
                            <input
                                value={dispatchPhone}
                                onChange={(e) => setDispatchPhone(e.target.value)}
                                placeholder="+998 71 ..."
                            />
                        </div>

                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <label>
                                🤖 Dispatcher Telegram (mas'ul shaxs telefoni)
                            </label>
                            <input
                                value={dispatcherPhone}
                                onChange={(e) => setDispatcherPhone(e.target.value)}
                                placeholder="+998 90 ..."
                            />
                            <div style={{ fontSize: 11, marginTop: 4, color: dispatcherLinked ? '#059669' : '#94a3b8' }}>
                                {dispatcherLinked
                                    ? '✅ Bog\'langan — bu shaxs Telegram bot orqali tez yordam so\'rovlarini qabul qiladi'
                                    : 'Bu raqamga ega shaxs Banisa botiga /start bossa, avtomatik ulanadi'}
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

                        <div className="cab-field" style={{ gridColumn: 'span 2' }}>
                            <label>
                                Baza joylashuvi
                                <button
                                    type="button"
                                    className="cab-link-btn"
                                    onClick={useMyLocation}
                                >
                                    <MapPin size={11} /> Mening joylashuvim
                                </button>
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={baseLatitude}
                                    onChange={(e) => setBaseLatitude(e.target.value)}
                                    placeholder="Latitude"
                                />
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={baseLongitude}
                                    onChange={(e) => setBaseLongitude(e.target.value)}
                                    placeholder="Longitude"
                                />
                            </div>
                            <div className="cab-hint">
                                Bemorlar xaritada ko'rishadi. Belgilanmasa — klinika joylashuvi ishlatiladi.
                            </div>
                        </div>

                        <div className="cab-field">
                            <label>Chaqiruv narxi (so'm)</label>
                            <input
                                type="number"
                                value={baseFee}
                                onChange={(e) => setBaseFee(e.target.value)}
                                placeholder="50000"
                            />
                        </div>
                        <div className="cab-field">
                            <label>1 km narxi (so'm)</label>
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
