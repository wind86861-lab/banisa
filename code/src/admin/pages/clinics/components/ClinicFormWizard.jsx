import React, { useState, useEffect } from 'react';
import { X, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateClinic, useUpdateClinic } from '../hooks/useClinics';

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: 'Asosiy', icon: '🏥' },
    { id: 2, label: 'Joylashuv', icon: '📍' },
    { id: 3, label: 'Aloqa', icon: '📞' },
    { id: 4, label: 'Ish Vaqtlari', icon: '🕐' },
    { id: 5, label: 'Imkoniyatlar', icon: '🏗️' },
    { id: 6, label: "Mas'ul Shaxs", icon: '👤' },
    { id: 7, label: 'Hujjatlar', icon: '📄' },
    { id: 8, label: "To'lov", icon: '🏦' },
];

const CLINIC_TYPES = [
    { value: 'GENERAL', label: 'Umumiy klinika', icon: '🏥' },
    { value: 'SPECIALIZED', label: 'Ixtisoslashgan markaz', icon: '🎯' },
    { value: 'DIAGNOSTIC', label: 'Diagnostika markazi', icon: '🔬' },
    { value: 'DENTAL', label: 'Stomatologiya', icon: '🦷' },
    { value: 'MATERNITY', label: "Tug'ruqxona", icon: '👶' },
    { value: 'REHABILITATION', label: 'Reabilitatsiya', icon: '♿' },
    { value: 'PHARMACY', label: 'Dorixona', icon: '💊' },
    { value: 'OTHER', label: 'Boshqa', icon: '🏢' },
];

const UZBEKISTAN_REGIONS = [
    { id: 'tashkent_city', name: "Toshkent shahri" },
    { id: 'tashkent_region', name: "Toshkent viloyati" },
    { id: 'andijan', name: "Andijon viloyati" },
    { id: 'fergana', name: "Farg'ona viloyati" },
    { id: 'namangan', name: 'Namangan viloyati' },
    { id: 'samarkand', name: 'Samarqand viloyati' },
    { id: 'bukhara', name: 'Buxoro viloyati' },
    { id: 'navoi', name: "Navoiy viloyati" },
    { id: 'kashkadarya', name: "Qashqadaryo viloyati" },
    { id: 'surkhandarya', name: 'Surxondaryo viloyati' },
    { id: 'jizzakh', name: 'Jizzax viloyati' },
    { id: 'syrdarya', name: "Sirdaryo viloyati" },
    { id: 'khorezm', name: 'Xorazm viloyati' },
    { id: 'karakalpakstan', name: "Qoraqalpog'iston Respublikasi" },
];

const DISTRICTS_BY_REGION = {
    tashkent_city: ['Bektemir', 'Chilonzor', "Mirzo Ulug'bek", 'Mirobod', 'Olmazor', 'Sergeli', 'Shayxontohur', 'Uchtepa', 'Yakkasaroy', 'Yunusobod', 'Yashnobod'],
    tashkent_region: ['Angren', 'Bekobod', "Bo'stonliq", 'Chinoz', 'Ohangaron', 'Parkent', 'Piskent', 'Qibray', "Yangiyo'l", 'Zangiota'],
    andijan: ['Andijon shahri', 'Asaka', 'Baliqchi', 'Buloqboshi', 'Izboskan', 'Jalaquduq', 'Marhamat', "Oltinko'l", 'Paxtaobod', 'Shahrixon'],
    fergana: ["Farg'ona shahri", 'Beshariq', 'Buvayda', "Dang'ara", 'Furqat', "Qo'qon shahri", "Marg'ilon shahri", 'Oltiariq', "Uchko'prik", 'Yozyovon'],
    namangan: ['Namangan shahri', 'Chortoq', 'Chust', 'Kosonsoy', 'Mingbuloq', 'Norin', 'Pop', "To'raqo'rg'on", 'Uychi'],
    samarkand: ['Samarqand shahri', "Bulung'ur", 'Ishtixon', 'Jomboy', "Kattaqo'rg'on", 'Narpay', 'Nurobod', "Pastdarg'om", 'Payariq', 'Urgut'],
    bukhara: ['Buxoro shahri', 'Gijduvon', 'Jondor', "Ko'g'on", 'Peshku', 'Romitan', 'Shofirkon', 'Vobkent'],
    navoi: ['Navoiy shahri', 'Karmana', 'Konimex', 'Navbahor', 'Nurota', 'Qiziltepa', 'Tomdi', 'Uchquduq', 'Zarafshon'],
    kashkadarya: ['Qarshi shahri', 'Chiroqchi', 'Dehqonobod', "G'uzor", 'Kasbi', 'Kitob', 'Koson', 'Muborak', 'Nishon', 'Shahrisabz'],
    surkhandarya: ['Termiz shahri', 'Angor', 'Bandixon', 'Boysun', 'Denov', 'Muzrabot', 'Oltinsoy', "Qumqo'rg'on", 'Sariosiyo', 'Sherobod', 'Uzun'],
    jizzakh: ['Jizzax shahri', 'Arnasoy', 'Baxmal', 'Dustlik', 'Forish', "G'allaorol", 'Paxtakor', 'Sharof Rashidov', 'Yangiobod', 'Zafarobod', 'Zomin'],
    syrdarya: ['Guliston shahri', 'Boyovut', 'Mirzaobod', 'Oqoltin', 'Sardoba', 'Sayxunobod', 'Shirin shahri', 'Xovos'],
    khorezm: ['Urganch shahri', "Bog'ot", 'Gurlan', 'Hazorasp', 'Xiva shahri', 'Kushkupir', 'Shavot', 'Yangiariq', 'Yangibozor'],
    karakalpakstan: ['Nukus shahri', 'Amudaryo', 'Beruniy', 'Chimboy', "Ellikqal'a", 'Kegeyli', "Mo'ynoq", "Qaniko'l", 'Shumanay', "Taxtako'pir", "To'rtko'l", "Xo'jayli"],
};

const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Dushanba', short: 'Du' },
    { key: 'tuesday', label: 'Seshanba', short: 'Se' },
    { key: 'wednesday', label: 'Chorshanba', short: 'Ch' },
    { key: 'thursday', label: 'Payshanba', short: 'Pa' },
    { key: 'friday', label: 'Juma', short: 'Ju' },
    { key: 'saturday', label: 'Shanba', short: 'Sh' },
    { key: 'sunday', label: 'Yakshanba', short: 'Ya' },
];

const DEFAULT_WORKING_HOURS = {
    monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '15:00' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '15:00' },
};

const POSITIONS = [
    { value: 'direktor', label: 'Direktor' },
    { value: 'bosh_vrach', label: 'Bosh vrach' },
    { value: 'tibbiy_direktor', label: 'Tibbiy direktor' },
    { value: 'manager', label: 'Manager' },
    { value: 'boshqa', label: 'Boshqa' },
];

const LEGAL_FORMS = [
    { value: 'mchj', label: "MChJ (Mas'uliyati Cheklangan Jamiyat)" },
    { value: 'aj', label: 'AJ (Aksiyadorlik Jamiyati)' },
    { value: 'xk', label: 'XK (Xususiy Korxona)' },
    { value: 'yakka', label: 'Yakka tartibdagi tadbirkor' },
    { value: 'davlat', label: 'Davlat muassasasi' },
    { value: 'boshqa', label: 'Boshqa' },
];

const PAYMENT_METHODS = [
    { value: 'CLICK', label: 'Click', icon: '📱' },
    { value: 'PAYME', label: 'Payme', icon: '💳' },
    { value: 'UZCARD', label: 'Uzcard', icon: '💳' },
    { value: 'HUMO', label: 'Humo', icon: '💳' },
    { value: 'CASH', label: 'Naqd pul', icon: '💵' },
    { value: 'BANK', label: "Bank o'tkazmasi", icon: '🏦' },
];

const AMENITIES_LIST = [
    'Wi-Fi', 'Kutish zali', 'Avtoturargoh', 'Apteka', 'Kafeteriya',
    'Nogironlar uchun rampa', 'Lift', 'Bolalar xonasi', 'Namozxona',
];

const EMPTY_FORM = {
    // Step 1: Basic
    nameUz: '', nameRu: '', nameEn: '', type: 'GENERAL', description: '',
    // Step 2: Location
    region: '', district: '', street: '', apartment: '', landmark: '',
    latitude: '', longitude: '',
    // Step 3: Contacts
    phones: '', emails: '', website: '',
    telegram: '', instagram: '', facebook: '',
    // Step 4: Working Hours
    workingHours: DEFAULT_WORKING_HOURS,
    hasEmergency: false, hasAmbulance: false, hasOnlineBooking: true,
    // Step 5: Facilities
    bedsCount: '', floorsCount: '', parkingAvailable: false,
    amenities: [],
    // Step 6: Admin
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '', adminPosition: '',
    // Step 7: Documents
    registrationNumber: '', taxId: '', licenseNumber: '',
    licenseIssuedAt: '', licenseExpiresAt: '', licenseIssuedBy: '',
    legalForm: '', legalName: '',
    // Step 8: Payment
    paymentMethods: [], priceRange: '', insuranceAccepted: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClinicFormWizard({ open, editData, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const createMut = useCreateClinic();
    const updateMut = useUpdateClinic();

    useEffect(() => {
        if (!open) return;
        setStep(1);
        if (editData) {
            const wh = editData.workingHours;
            const sm = editData.socialMedia || {};
            setForm({
                ...EMPTY_FORM,
                ...editData,
                phones: Array.isArray(editData.phones) ? editData.phones.join(', ') : (editData.phones || ''),
                emails: Array.isArray(editData.emails) ? editData.emails.join(', ') : (editData.emails || ''),
                workingHours: (wh && typeof wh === 'object' && !Array.isArray(wh) && wh.monday) ? wh : DEFAULT_WORKING_HOURS,
                telegram: sm.telegram || '',
                instagram: sm.instagram || '',
                facebook: sm.facebook || '',
                amenities: Array.isArray(editData.amenities) ? editData.amenities : [],
                paymentMethods: Array.isArray(editData.paymentMethods) ? editData.paymentMethods : [],
                insuranceAccepted: Array.isArray(editData.insuranceAccepted) ? editData.insuranceAccepted : [],
                licenseIssuedAt: editData.licenseIssuedAt ? editData.licenseIssuedAt.substring(0, 10) : '',
                licenseExpiresAt: editData.licenseExpiresAt ? editData.licenseExpiresAt.substring(0, 10) : '',
                bedsCount: editData.bedsCount ?? '',
                floorsCount: editData.floorsCount ?? '',
                latitude: editData.latitude ?? '',
                longitude: editData.longitude ?? '',
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editData, open]);

    if (!open) return null;

    const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
    const setBool = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.checked }));

    const setWorkingHour = (day, field, value) => {
        setForm(p => ({
            ...p,
            workingHours: {
                ...p.workingHours,
                [day]: { ...p.workingHours[day], [field]: value },
            },
        }));
    };

    const toggleArrayItem = (key, value) => {
        setForm(p => {
            const arr = p[key] || [];
            return { ...p, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
        });
    };

    const handleSubmit = async () => {
        if (!form.nameUz.trim()) { alert("Klinika nomi (UZ) kiritilishi shart"); setStep(1); return; }
        if (!form.region) { alert("Viloyat tanlanishi shart"); setStep(2); return; }
        if (!form.district) { alert("Tuman kiritilishi shart"); setStep(2); return; }
        if (!form.street) { alert("Ko'cha / manzil kiritilishi shart"); setStep(2); return; }

        setSaving(true);
        try {
            const payload = {
                nameUz: form.nameUz.trim(),
                nameRu: form.nameRu.trim() || undefined,
                nameEn: form.nameEn.trim() || undefined,
                type: form.type,
                description: form.description.trim() || undefined,
                region: form.region,
                district: form.district,
                street: form.street.trim(),
                apartment: form.apartment.trim() || undefined,
                landmark: form.landmark.trim() || undefined,
                latitude: form.latitude ? parseFloat(form.latitude) : undefined,
                longitude: form.longitude ? parseFloat(form.longitude) : undefined,
                phones: form.phones ? form.phones.split(',').map(s => s.trim()).filter(Boolean) : [],
                emails: form.emails ? form.emails.split(',').map(s => s.trim()).filter(Boolean) : [],
                website: form.website.trim() || undefined,
                socialMedia: (form.telegram || form.instagram || form.facebook) ? {
                    telegram: form.telegram || undefined,
                    instagram: form.instagram || undefined,
                    facebook: form.facebook || undefined,
                } : undefined,
                workingHours: form.workingHours,
                hasEmergency: form.hasEmergency,
                hasAmbulance: form.hasAmbulance,
                hasOnlineBooking: form.hasOnlineBooking,
                bedsCount: form.bedsCount ? parseInt(form.bedsCount) : undefined,
                floorsCount: form.floorsCount ? parseInt(form.floorsCount) : undefined,
                parkingAvailable: form.parkingAvailable,
                amenities: form.amenities.length > 0 ? form.amenities : undefined,
                adminFirstName: form.adminFirstName.trim() || undefined,
                adminLastName: form.adminLastName.trim() || undefined,
                adminEmail: form.adminEmail.trim() || undefined,
                adminPhone: form.adminPhone.trim() || undefined,
                adminPosition: form.adminPosition || undefined,
                registrationNumber: form.registrationNumber.trim() || undefined,
                taxId: form.taxId.trim() || undefined,
                licenseNumber: form.licenseNumber.trim() || undefined,
                licenseIssuedAt: form.licenseIssuedAt || undefined,
                licenseExpiresAt: form.licenseExpiresAt || undefined,
                licenseIssuedBy: form.licenseIssuedBy.trim() || undefined,
                legalForm: form.legalForm || undefined,
                legalName: form.legalName.trim() || undefined,
                paymentMethods: form.paymentMethods.length > 0 ? form.paymentMethods : undefined,
                priceRange: form.priceRange.trim() || undefined,
                insuranceAccepted: form.insuranceAccepted.length > 0 ? form.insuranceAccepted : undefined,
            };

            // Remove undefined values
            Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

            if (editData?.id) {
                await updateMut.mutateAsync({ id: editData.id, ...payload });
            } else {
                await createMut.mutateAsync(payload);
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            alert('Xatolik: ' + (err?.response?.data?.error || err.message || 'Noma\'lum xatolik'));
        } finally {
            setSaving(false);
        }
    };

    const canGoNext = step < 8;
    const canGoPrev = step > 1;

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onClose}>
                <motion.div
                    className="form-modal"
                    style={{ maxWidth: 780 }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="form-modal-header">
                        <h2>{editData ? 'Klinikani tahrirlash' : 'Yangi klinika qo\'shish'}</h2>
                        <button className="btn-close" onClick={onClose}><X size={22} /></button>
                    </div>

                    {/* Step tabs */}
                    <div className="form-steps" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {STEPS.map((s) => (
                            <div
                                key={s.id}
                                className={`step ${step >= s.id ? 'active' : ''}`}
                                onClick={() => setStep(s.id)}
                                style={{ cursor: 'pointer', fontSize: 12, padding: '10px 6px' }}
                            >
                                {s.icon} {s.label}
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="form-content" style={{ padding: '24px 32px' }}>
                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <div className="step-content">
                                <h3>🏥 Asosiy Ma'lumotlar</h3>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Klinika nomi (UZ) *</label>
                                        <input type="text" value={form.nameUz} onChange={set('nameUz')} placeholder="Masalan: Nefrologiya markazi" />
                                    </div>
                                    <div className="col">
                                        <label>Klinika nomi (RU)</label>
                                        <input type="text" value={form.nameRu} onChange={set('nameRu')} placeholder="Название на русском" />
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Klinika nomi (EN)</label>
                                        <input type="text" value={form.nameEn} onChange={set('nameEn')} placeholder="Name in English" />
                                    </div>
                                    <div className="col">
                                        <label>Klinika turi *</label>
                                        <select value={form.type} onChange={set('type')}>
                                            {CLINIC_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Tavsif</label>
                                    <textarea rows={4} value={form.description} onChange={set('description')} placeholder="Klinika haqida batafsil ma'lumot..." />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Location */}
                        {step === 2 && (
                            <div className="step-content">
                                <h3>📍 Joylashuv</h3>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Viloyat *</label>
                                        <select value={form.region} onChange={(e) => setForm(p => ({ ...p, region: e.target.value, district: '' }))}>
                                            <option value="">Viloyatni tanlang</option>
                                            {UZBEKISTAN_REGIONS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col">
                                        <label>Tuman *</label>
                                        {(() => {
                                            const regionKey = UZBEKISTAN_REGIONS.find(r => r.name === form.region)?.id;
                                            const districts = regionKey ? (DISTRICTS_BY_REGION[regionKey] || []) : [];
                                            return districts.length > 0 ? (
                                                <select value={form.district} onChange={set('district')}>
                                                    <option value="">Tumanni tanlang</option>
                                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            ) : (
                                                <input type="text" value={form.district} onChange={set('district')} placeholder="Tuman nomi" />
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Ko'cha / manzil *</label>
                                        <input type="text" value={form.street} onChange={set('street')} placeholder="Amir Temur ko'chasi 15" />
                                    </div>
                                    <div className="col">
                                        <label>Bino / xonadon</label>
                                        <input type="text" value={form.apartment} onChange={set('apartment')} placeholder="3-qavat, 12-xona" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Mo'ljal (landmark)</label>
                                    <input type="text" value={form.landmark} onChange={set('landmark')} placeholder="Metro yonida, Korzinka ro'parasida..." />
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Kenglik (latitude)</label>
                                        <input type="text" value={form.latitude} onChange={set('latitude')} placeholder="41.311081" />
                                    </div>
                                    <div className="col">
                                        <label>Uzunlik (longitude)</label>
                                        <input type="text" value={form.longitude} onChange={set('longitude')} placeholder="69.240562" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Contacts */}
                        {step === 3 && (
                            <div className="step-content">
                                <h3>📞 Aloqa Ma'lumotlari</h3>
                                <div className="form-group">
                                    <label>Telefon raqamlari (vergul bilan ajrating)</label>
                                    <input type="text" value={form.phones} onChange={set('phones')} placeholder="+998901234567, +998711234567" />
                                    <small style={{ color: '#8892B0', fontSize: 12 }}>Bir nechta raqamni vergul bilan ajrating</small>
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Email manzil(lar)</label>
                                        <input type="text" value={form.emails} onChange={set('emails')} placeholder="info@klinika.uz" />
                                    </div>
                                    <div className="col">
                                        <label>Veb-sayt</label>
                                        <input type="text" value={form.website} onChange={set('website')} placeholder="https://klinika.uz" />
                                    </div>
                                </div>
                                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4 style={{ marginBottom: 12, fontSize: 14, color: '#64748b' }}>Ijtimoiy tarmoqlar</h4>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Telegram</label>
                                        <input type="text" value={form.telegram} onChange={set('telegram')} placeholder="@klinika_uz" />
                                    </div>
                                    <div className="col">
                                        <label>Instagram</label>
                                        <input type="text" value={form.instagram} onChange={set('instagram')} placeholder="@klinika_uz" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Facebook</label>
                                    <input type="text" value={form.facebook} onChange={set('facebook')} placeholder="https://facebook.com/klinika" />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Working Hours */}
                        {step === 4 && (
                            <div className="step-content">
                                <h3>🕐 Ish Vaqtlari</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                    {DAYS_OF_WEEK.map(day => {
                                        const wh = form.workingHours[day.key] || {};
                                        return (
                                            <div key={day.key} style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '10px 14px', borderRadius: 10,
                                                background: wh.isOpen ? '#f0fdf4' : '#fef2f2',
                                                border: `1px solid ${wh.isOpen ? '#bbf7d0' : '#fecaca'}`,
                                            }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 120, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!wh.isOpen}
                                                        onChange={(e) => setWorkingHour(day.key, 'isOpen', e.target.checked)}
                                                        style={{ width: 16, height: 16 }}
                                                    />
                                                    {day.label}
                                                </label>
                                                {wh.isOpen && (
                                                    <>
                                                        <input
                                                            type="time"
                                                            value={wh.openTime || '08:00'}
                                                            onChange={(e) => setWorkingHour(day.key, 'openTime', e.target.value)}
                                                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                                                        />
                                                        <span style={{ color: '#9ca3af' }}>—</span>
                                                        <input
                                                            type="time"
                                                            value={wh.closeTime || '18:00'}
                                                            onChange={(e) => setWorkingHour(day.key, 'closeTime', e.target.value)}
                                                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                                                        />
                                                    </>
                                                )}
                                                {!wh.isOpen && <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>Dam olish</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.hasEmergency} onChange={setBool('hasEmergency')} style={{ width: 16, height: 16 }} />
                                        🚨 Shoshilinch yordam
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.hasAmbulance} onChange={setBool('hasAmbulance')} style={{ width: 16, height: 16 }} />
                                        🚑 Tez yordam xizmati
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.hasOnlineBooking} onChange={setBool('hasOnlineBooking')} style={{ width: 16, height: 16 }} />
                                        📱 Onlayn band qilish
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Facilities */}
                        {step === 5 && (
                            <div className="step-content">
                                <h3>🏗️ Imkoniyatlar</h3>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Yotoq o'rinlar soni</label>
                                        <input type="number" min="0" value={form.bedsCount} onChange={set('bedsCount')} placeholder="50" />
                                    </div>
                                    <div className="col">
                                        <label>Qavatlar soni</label>
                                        <input type="number" min="0" value={form.floorsCount} onChange={set('floorsCount')} placeholder="5" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.parkingAvailable} onChange={setBool('parkingAvailable')} style={{ width: 16, height: 16 }} />
                                        🅿️ Avtoturargoh mavjud
                                    </label>
                                </div>
                                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <div className="form-group">
                                    <label>Qulayliklar</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                        {AMENITIES_LIST.map(a => (
                                            <button
                                                key={a}
                                                type="button"
                                                onClick={() => toggleArrayItem('amenities', a)}
                                                style={{
                                                    padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                                                    border: form.amenities.includes(a) ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                                    background: form.amenities.includes(a) ? '#eff6ff' : '#f9fafb',
                                                    color: form.amenities.includes(a) ? '#1d4ed8' : '#374151',
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                }}
                                            >
                                                {form.amenities.includes(a) && <Check size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 6: Admin Person */}
                        {step === 6 && (
                            <div className="step-content">
                                <h3>👤 Mas'ul Shaxs</h3>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Ism</label>
                                        <input type="text" value={form.adminFirstName} onChange={set('adminFirstName')} placeholder="Abdulaziz" />
                                    </div>
                                    <div className="col">
                                        <label>Familiya</label>
                                        <input type="text" value={form.adminLastName} onChange={set('adminLastName')} placeholder="Karimov" />
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Lavozim</label>
                                        <select value={form.adminPosition} onChange={set('adminPosition')}>
                                            <option value="">Tanlang</option>
                                            {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col">
                                        <label>Telefon</label>
                                        <input type="text" value={form.adminPhone} onChange={set('adminPhone')} placeholder="+998901234567" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="admin@klinika.uz" />
                                </div>
                            </div>
                        )}

                        {/* Step 7: Documents */}
                        {step === 7 && (
                            <div className="step-content">
                                <h3>📄 Hujjatlar</h3>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Yuridik shakli</label>
                                        <select value={form.legalForm} onChange={set('legalForm')}>
                                            <option value="">Tanlang</option>
                                            {LEGAL_FORMS.map(lf => <option key={lf.value} value={lf.value}>{lf.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col">
                                        <label>Yuridik nomi</label>
                                        <input type="text" value={form.legalName} onChange={set('legalName')} placeholder="OOO 'Salom Med'" />
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>INN (STIR)</label>
                                        <input type="text" value={form.taxId} onChange={set('taxId')} placeholder="123456789" />
                                    </div>
                                    <div className="col">
                                        <label>Ro'yxatga olish raqami</label>
                                        <input type="text" value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="12345" />
                                    </div>
                                </div>
                                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4 style={{ marginBottom: 12, fontSize: 14, color: '#64748b' }}>Litsenziya</h4>
                                <div className="form-group">
                                    <label>Litsenziya raqami</label>
                                    <input type="text" value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="L-12345/2024" />
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <label>Berilgan sana</label>
                                        <input type="date" value={form.licenseIssuedAt} onChange={set('licenseIssuedAt')} />
                                    </div>
                                    <div className="col">
                                        <label>Amal qilish muddati</label>
                                        <input type="date" value={form.licenseExpiresAt} onChange={set('licenseExpiresAt')} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Kim tomonidan berilgan</label>
                                    <input type="text" value={form.licenseIssuedBy} onChange={set('licenseIssuedBy')} placeholder="Sog'liqni saqlash vazirligi" />
                                </div>
                            </div>
                        )}

                        {/* Step 8: Payment */}
                        {step === 8 && (
                            <div className="step-content">
                                <h3>🏦 To'lov Ma'lumotlari</h3>
                                <div className="form-group">
                                    <label>Qabul qilinadigan to'lov usullari</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                        {PAYMENT_METHODS.map(pm => (
                                            <button
                                                key={pm.value}
                                                type="button"
                                                onClick={() => toggleArrayItem('paymentMethods', pm.value)}
                                                style={{
                                                    padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                                    border: form.paymentMethods.includes(pm.value) ? '2px solid #10b981' : '1px solid #d1d5db',
                                                    background: form.paymentMethods.includes(pm.value) ? '#ecfdf5' : '#f9fafb',
                                                    color: form.paymentMethods.includes(pm.value) ? '#059669' : '#374151',
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                }}
                                            >
                                                {pm.icon} {pm.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Narx diapazoni</label>
                                    <input type="text" value={form.priceRange} onChange={set('priceRange')} placeholder="50,000 - 500,000 so'm" />
                                </div>
                                <div className="form-group">
                                    <label>Sug'urta kompaniyalari (vergul bilan)</label>
                                    <input
                                        type="text"
                                        value={(form.insuranceAccepted || []).join(', ')}
                                        onChange={(e) => setForm(p => ({
                                            ...p,
                                            insuranceAccepted: e.target.value ? e.target.value.split(',').map(s => s.trimStart()) : [],
                                        }))}
                                        placeholder="Gross, Uzbekinvest, Alfa..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="form-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={canGoPrev ? () => setStep(s => s - 1) : onClose}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            {canGoPrev ? <><ChevronLeft size={16} /> Orqaga</> : 'Bekor qilish'}
                        </button>

                        <div style={{ display: 'flex', gap: 10 }}>
                            {canGoNext && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => setStep(s => s + 1)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    Keyingisi <ChevronRight size={16} />
                                </button>
                            )}
                            {step === 8 && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#059669' }}
                                >
                                    {saving ? <><Loader2 size={16} className="spin" /> Saqlanmoqda...</> : <><Check size={16} /> {editData ? 'Saqlash' : 'Qo\'shish'}</>}
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
