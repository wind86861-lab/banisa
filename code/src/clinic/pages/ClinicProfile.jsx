import { useState, useEffect, useRef } from 'react';
import {
    Building2, Phone, Mail, Globe, MapPin,
    FileText, Save, Loader2, CheckCircle2, Edit3,
    Clock, Settings, CalendarDays, CheckCircle, XCircle,
    Upload, ImageIcon, X, Loader2 as SpinLoader,
    CreditCard, Landmark, Share2, Award, Building, Briefcase,
} from 'lucide-react';
import api from '../../shared/api/axios';
import { useClinicProfile, useUpdateProfile } from '../hooks/useClinicData';
import { useWorkingHours, useUpdateWorkingHours } from '../hooks/useServiceSettings';
import BanisaLoader from '../../shared/components/BanisaLoader';
import LocationPicker from '../components/LocationPicker';
import './clinic-admin.css';

// ─── Static config ──────────────────────────────────────────────────────────

const TABS = [
    { key: 'basic',    label: 'Asosiy',      icon: <Building2 size={15} /> },
    { key: 'address',  label: 'Manzil',      icon: <MapPin size={15} /> },
    { key: 'contact',  label: 'Aloqa',       icon: <Phone size={15} /> },
    { key: 'schedule', label: 'Ish Jadval',  icon: <CalendarDays size={15} /> },
    { key: 'facility', label: 'Muassasa',    icon: <Building size={15} /> },
    { key: 'legal',    label: 'Litsenziya',  icon: <FileText size={15} /> },
    { key: 'bank',     label: 'Bank',        icon: <Landmark size={15} /> },
    { key: 'admin',    label: 'Mas\'ul shaxs', icon: <Briefcase size={15} /> },
    { key: 'settings', label: 'Sozlamalar',  icon: <Settings size={15} /> },
];

const CLINIC_TYPES = [
    { value: 'GENERAL',        label: 'Umumiy klinika' },
    { value: 'SPECIALIZED',    label: 'Ixtisoslashgan' },
    { value: 'DIAGNOSTIC',     label: 'Diagnostika markazi' },
    { value: 'DENTAL',         label: 'Tish klinikasi' },
    { value: 'MATERNITY',      label: "Tug'ruqxona" },
    { value: 'REHABILITATION', label: 'Reabilitatsiya' },
    { value: 'PHARMACY',       label: 'Dorixona' },
];

const LEGAL_FORMS = [
    { value: '',      label: '— Tanlanmagan —' },
    { value: 'MChJ',  label: "MChJ (Mas'uliyati cheklangan jamiyat)" },
    { value: 'AJ',    label: 'AJ (Aksiyadorlik jamiyati)' },
    { value: 'XK',    label: "Xususiy korxona" },
    { value: 'YaTT',  label: 'YaTT (Yakka tartibdagi tadbirkor)' },
    { value: 'OAJ',   label: 'OAJ (Ochiq aksiyadorlik jamiyati)' },
    { value: 'DUK',   label: 'DUK (Davlat unitar korxonasi)' },
];

const PAYMENT_METHOD_OPTIONS = [
    { value: 'CASH',   label: 'Naqd' },
    { value: 'CARD',   label: 'Bank karta (POS)' },
    { value: 'PAYME',  label: 'Payme' },
    { value: 'CLICK',  label: 'Click' },
    { value: 'UZUM',   label: 'Uzum Bank' },
    { value: 'TRANSFER', label: 'Bank o\'tkazmasi' },
];

const DAYS = [
    { key: 'monday',    label: 'Dushanba' },
    { key: 'tuesday',   label: 'Seshanba' },
    { key: 'wednesday', label: 'Chorshanba' },
    { key: 'thursday',  label: 'Payshanba' },
    { key: 'friday',    label: 'Juma' },
    { key: 'saturday',  label: 'Shanba' },
    { key: 'sunday',    label: 'Yakshanba' },
];
const DEFAULT_DAY = { start: '08:00', end: '20:00', isDayOff: false };

// ─── Helpers ────────────────────────────────────────────────────────────────

const fromBackend = (data) => {
    if (!data) return {};
    const result = {};
    for (const [key, val] of Object.entries(data)) {
        if (!val || typeof val !== 'object') continue;
        result[key] = {
            start: val.openTime ?? val.start ?? '08:00',
            end: val.closeTime ?? val.end ?? '20:00',
            isDayOff: val.isDayOff ?? !val.isOpen ?? false,
        };
    }
    return result;
};

const toBackend = (data) => {
    if (!data) return {};
    const result = {};
    for (const [key, val] of Object.entries(data)) {
        if (!val || typeof val !== 'object') continue;
        result[key] = {
            start: val.start ?? val.openTime ?? '08:00',
            end: val.end ?? val.closeTime ?? '20:00',
            isDayOff: val.isDayOff ?? false,
        };
    }
    return result;
};

const isoToDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
};

// ─── Reusable bits ──────────────────────────────────────────────────────────

function FileUploadField({ label, value, onChange, accept = 'image/*', endpoint = '/upload/clinic-logo', kind = 'image' }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append(kind === 'pdf' ? 'file' : 'image', file);
        setUploading(true);
        try {
            const { data } = await api.post(endpoint, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.data.url);
        } catch (err) {
            alert('Yuklash xatoligi: ' + (err?.response?.data?.message || err?.message || "Noma'lum xatolik"));
        } finally {
            setUploading(false);
        }
    };

    const fullUrl = value ? (value.startsWith('/') ? `https://banisa.uz${value}` : value) : null;

    return (
        <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {value ? (
                    kind === 'image' ? (
                        <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border-color)', background: '#f8fafc' }}>
                            <img src={fullUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button type="button" onClick={() => onChange('')}
                                style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={13} />
                            </button>
                        </div>
                    ) : (
                        <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', background: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>
                            <FileText size={16} /> Yuklangan faylni ko'rish
                        </a>
                    )
                ) : (
                    <div style={{ width: kind === 'image' ? 96 : 240, height: kind === 'image' ? 96 : 56, borderRadius: 12, border: '2px dashed var(--border-color)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                        {kind === 'image' ? <ImageIcon size={28} /> : <FileText size={22} />}
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button type="button" onClick={() => fileRef.current.click()} disabled={uploading}
                        style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {uploading ? <SpinLoader size={14} className="ca-spin" /> : <Upload size={14} />}
                        {uploading ? 'Yuklanmoqda...' : (value ? 'Yangisiga almashtirish' : 'Fayl yuklash')}
                    </button>
                    {value && (
                        <button type="button" onClick={() => onChange('')}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', fontSize: 12, color: '#dc2626', cursor: 'pointer' }}>
                            O'chirish
                        </button>
                    )}
                    <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} />
                </div>
            </div>
        </div>
    );
}

function ToggleSwitch({ checked, onChange }) {
    return (
        <div onClick={() => onChange(!checked)}
            style={{ width: 38, height: 20, borderRadius: 10, flexShrink: 0, background: checked ? '#1dbfc1' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </div>
    );
}

function CheckboxList({ value = [], options, onChange }) {
    const toggle = (v) => {
        const set = new Set(value);
        set.has(v) ? set.delete(v) : set.add(v);
        onChange(Array.from(set));
    };
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {options.map(opt => {
                const active = value.includes(opt.value);
                return (
                    <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
                        style={{
                            padding: '8px 14px', borderRadius: 999,
                            border: '1.5px solid ' + (active ? '#1dbfc1' : 'var(--border-color)'),
                            background: active ? 'rgba(29,191,193,0.12)' : '#fff',
                            color: active ? '#0e7d80' : 'var(--text-main)',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Schedule tab (extended with always-open + lunch + holidays) ────────────

function ScheduleTab({ form, set }) {
    const { data: savedHours, isLoading } = useWorkingHours();
    const updateMut = useUpdateWorkingHours();
    const [hours, setHours] = useState({});
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => { if (savedHours) setHours(fromBackend(savedHours)); }, [savedHours]);

    const setDay = (key, patch) =>
        setHours(prev => ({ ...prev, [key]: { ...(prev[key] ?? DEFAULT_DAY), ...patch } }));

    const handleSave = async () => {
        setSaved(false); setError(null);
        try {
            await updateMut.mutateAsync(toBackend(hours));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Saqlashda xatolik');
        }
    };

    if (isLoading) return <BanisaLoader message="Ish jadvali yuklanmoqda..." />;

    return (
        <>
            <div className="ca-section-card">
                <div className="ca-section-head">
                    <span className="ca-section-title"><Clock size={16} /> Ish vaqtlari</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Har bir kun uchun vaqt belgilang</span>
                </div>
                <div className="ca-section-body">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, fontSize: 14, fontWeight: 600 }}>
                        <ToggleSwitch checked={!!form.isAlwaysOpen} onChange={v => set('isAlwaysOpen', v)} />
                        24/7 ochiq (har kun, har soat)
                    </label>

                    {!form.isAlwaysOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {DAYS.map(({ key, label }) => {
                                const day = hours[key] ?? DEFAULT_DAY;
                                return (
                                    <div key={key} style={{
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        padding: '14px 18px', borderRadius: 10,
                                        border: '1.5px solid ' + (day.isDayOff ? 'var(--border-color)' : '#1dbfc1'),
                                        background: day.isDayOff ? 'var(--hover-bg)' : 'rgba(29,191,193,0.04)',
                                        flexWrap: 'wrap',
                                    }}>
                                        <span style={{ minWidth: 110, fontWeight: 600, fontSize: 14, color: day.isDayOff ? 'var(--text-muted)' : 'var(--text-main)' }}>{label}</span>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none', minWidth: 130, fontSize: 13, color: day.isDayOff ? '#ef4444' : 'var(--text-muted)', fontWeight: 500 }}>
                                            <ToggleSwitch checked={day.isDayOff} onChange={v => setDay(key, { isDayOff: v })} />
                                            Dam olish
                                        </label>
                                        {!day.isDayOff && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 220 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Boshlanish</span>
                                                    <input type="time" value={day.start ?? '08:00'} onChange={e => setDay(key, { start: e.target.value })} step={300}
                                                        style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border-color)', fontSize: 14, fontWeight: 600 }} />
                                                </div>
                                                <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 16, marginTop: 16 }}>—</span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tugash</span>
                                                    <input type="time" value={day.end ?? '20:00'} onChange={e => setDay(key, { end: e.target.value })} step={300}
                                                        style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border-color)', fontSize: 14, fontWeight: 600 }} />
                                                </div>
                                                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 13, fontWeight: 600 }}><CheckCircle size={14} /> Ochiq</div>
                                            </div>
                                        )}
                                        {day.isDayOff && (<div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 13, fontWeight: 600 }}><XCircle size={14} /> Yopiq</div>)}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {saved && <div className="ca-banner-success" style={{ marginTop: 16 }}><CheckCircle2 size={16} /> Saqlandi</div>}
                    {error && <div className="ca-banner-error" style={{ marginTop: 16 }}><XCircle size={16} /> {error}</div>}

                    <button className="ca-btn-primary" style={{ marginTop: 20 }} onClick={handleSave} disabled={updateMut.isPending}>
                        {updateMut.isPending ? <><Loader2 size={14} className="ca-spin" /> Saqlanmoqda...</> : <><Save size={14} /> Jadval saqlash</>}
                    </button>
                </div>
            </div>

            <div className="ca-section-card">
                <div className="ca-section-head"><span className="ca-section-title">Tushlik tanaffusi va bayramlar</span></div>
                <div className="ca-section-body">
                    <div className="ca-form-row">
                        <div className="ca-form-group">
                            <label className="ca-label">Tushlik boshi</label>
                            <input type="time" value={form.lunchBreakStart ?? ''} onChange={e => set('lunchBreakStart', e.target.value)} />
                        </div>
                        <div className="ca-form-group">
                            <label className="ca-label">Tushlik tugashi</label>
                            <input type="time" value={form.lunchBreakEnd ?? ''} onChange={e => set('lunchBreakEnd', e.target.value)} />
                        </div>
                    </div>
                    <div className="ca-form-group ca-form-row single">
                        <label className="ca-label">Bayramlar va istisnolar (eslatma)</label>
                        <textarea rows={3} value={form.holidayNotes ?? ''} onChange={e => set('holidayNotes', e.target.value)}
                            placeholder="Masalan: Mustaqillik kuni (1 sentyabr) — yopiq" />
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ClinicProfile() {
    const [tab, setTab] = useState('basic');
    const [form, setForm] = useState({});
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [phones, setPhones] = useState(['']);
    const [emails, setEmails] = useState(['']);
    const [social, setSocial] = useState({ telegram: '', instagram: '', facebook: '', youtube: '' });
    const [certificates, setCertificates] = useState([]); // [{url, name}]
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [insuranceAccepted, setInsuranceAccepted] = useState([]);

    const { data: profile, isLoading } = useClinicProfile();
    const updateMut = useUpdateProfile();

    useEffect(() => {
        if (!profile) return;
        setForm({
            // Basic
            nameUz: profile.nameUz ?? '', nameRu: profile.nameRu ?? '', nameEn: profile.nameEn ?? '',
            type: profile.type ?? 'GENERAL', foundedYear: profile.foundedYear ?? '',
            description: profile.description ?? '', descriptionRu: profile.descriptionRu ?? '',
            logo: profile.logo ?? '', coverImage: profile.coverImage ?? '',
            // Address
            region: profile.region ?? '', district: profile.district ?? '',
            street: profile.street ?? '', apartment: profile.apartment ?? '',
            addressUz: profile.addressUz ?? '', addressRu: profile.addressRu ?? '',
            zipCode: profile.zipCode ?? '', googleMapsUrl: profile.googleMapsUrl ?? '',
            landmark: profile.landmark ?? '',
            latitude: profile.latitude ?? '', longitude: profile.longitude ?? '',
            // Contact
            website: profile.website ?? '',
            // Schedule
            isAlwaysOpen: profile.isAlwaysOpen ?? false,
            lunchBreakStart: profile.lunchBreakStart ?? '', lunchBreakEnd: profile.lunchBreakEnd ?? '',
            holidayNotes: profile.holidayNotes ?? '',
            // Facility
            hasEmergency: !!profile.hasEmergency, hasAmbulance: !!profile.hasAmbulance,
            parkingAvailable: !!profile.parkingAvailable, hasOnlineBooking: profile.hasOnlineBooking !== false,
            bedsCount: profile.bedsCount ?? '', floorsCount: profile.floorsCount ?? '',
            priceRange: profile.priceRange ?? '',
            // Legal
            registrationNumber: profile.registrationNumber ?? '',
            taxId: profile.taxId ?? '',
            licenseNumber: profile.licenseNumber ?? '',
            licenseUrl: profile.licenseUrl ?? '',
            licenseIssuedAt: isoToDate(profile.licenseIssuedAt),
            licenseExpiresAt: isoToDate(profile.licenseExpiresAt),
            licenseIssuedBy: profile.licenseIssuedBy ?? '',
            legalName: profile.legalName ?? '', legalAddress: profile.legalAddress ?? '',
            legalForm: profile.legalForm ?? '',
            // Bank
            bankName: profile.bankName ?? '', bankAccountNumber: profile.bankAccountNumber ?? '',
            mfo: profile.mfo ?? '', oked: profile.oked ?? '', vatNumber: profile.vatNumber ?? '',
            invoiceEmail: profile.invoiceEmail ?? '',
            // Fiscal codes (Payme receipts → Soliq)
            fiscalMxikCode: profile.fiscalMxikCode ?? '',
            fiscalPackageCode: profile.fiscalPackageCode ?? '',
            fiscalVatPercent: profile.fiscalVatPercent ?? '',
            // Admin person
            adminFirstName: profile.adminFirstName ?? '', adminLastName: profile.adminLastName ?? '',
            adminEmail: profile.adminEmail ?? '', adminPhone: profile.adminPhone ?? '',
            adminPosition: profile.adminPosition ?? '',
        });
        setPhones(profile.phones?.length ? profile.phones : ['']);
        setEmails(profile.emails?.length ? profile.emails : ['']);
        setSocial({
            telegram:  profile.socialMedia?.telegram  ?? '',
            instagram: profile.socialMedia?.instagram ?? '',
            facebook:  profile.socialMedia?.facebook  ?? '',
            youtube:   profile.socialMedia?.youtube   ?? '',
        });
        setCertificates(Array.isArray(profile.certificates) ? profile.certificates : []);
        setPaymentMethods(Array.isArray(profile.paymentMethods) ? profile.paymentMethods : []);
        setAmenities(Array.isArray(profile.amenities) ? profile.amenities : []);
        setInsuranceAccepted(Array.isArray(profile.insuranceAccepted) ? profile.insuranceAccepted : []);
    }, [profile]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        setSaveError('');
        const socialClean = Object.fromEntries(
            Object.entries(social).filter(([, v]) => v && v.trim())
        );
        try {
            await updateMut.mutateAsync({
                ...form,
                phones: phones.filter(Boolean),
                emails: emails.filter(Boolean),
                socialMedia: Object.keys(socialClean).length ? socialClean : null,
                certificates,
                paymentMethods,
                amenities,
                insuranceAccepted,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setSaveError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Saqlashda xatolik');
        }
    };

    if (isLoading) return <BanisaLoader message="Profil yuklanmoqda..." />;

    return (
        <div>
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Klinika Profili</h1>
                    <p className="ca-subtitle">{profile?.nameUz ?? 'Klinika ma\'lumotlari'}</p>
                </div>
                <button className="ca-btn-primary" onClick={handleSave} disabled={updateMut.isPending}>
                    {updateMut.isPending ? <><Loader2 size={15} className="ca-spin" /> Saqlanmoqda...</> : <><Save size={15} /> Saqlash</>}
                </button>
            </div>

            <div className="ca-tabs">
                {TABS.map(t => (
                    <button key={t.key} className={`ca-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {saveError && <div className="ca-banner-error" style={{ marginBottom: 16 }}><XCircle size={16} /> {saveError}</div>}

            {/* ── BASIC ── */}
            {tab === 'basic' && (
                <>
                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><Building2 size={16} /> Asosiy ma'lumotlar</span></div>
                        <div className="ca-section-body">
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Klinika nomi (O'zbek) *</label>
                                    <input value={form.nameUz ?? ''} onChange={e => set('nameUz', e.target.value)} placeholder="Sog'liqni Saqlash Markazi" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Klinika nomi (Rus)</label>
                                    <input value={form.nameRu ?? ''} onChange={e => set('nameRu', e.target.value)} placeholder="Центр Здоровья" />
                                </div>
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Klinika nomi (Ingliz)</label>
                                    <input value={form.nameEn ?? ''} onChange={e => set('nameEn', e.target.value)} placeholder="Health Center" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Klinika turi</label>
                                    <select value={form.type ?? 'GENERAL'} onChange={e => set('type', e.target.value)}>
                                        {CLINIC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Tashkil etilgan yil</label>
                                    <input type="number" min="1900" max={new Date().getFullYear()} value={form.foundedYear ?? ''} onChange={e => set('foundedYear', e.target.value)} placeholder="2015" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Narx darajasi</label>
                                    <select value={form.priceRange ?? ''} onChange={e => set('priceRange', e.target.value)}>
                                        <option value="">— Tanlanmagan —</option>
                                        <option value="LOW">Arzon ($)</option>
                                        <option value="MEDIUM">O'rta ($$)</option>
                                        <option value="HIGH">Yuqori ($$$)</option>
                                        <option value="PREMIUM">Premium ($$$$)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="ca-form-group ca-form-row single">
                                <label className="ca-label">Tavsif (O'zbek)</label>
                                <textarea rows={4} value={form.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Klinika haqida qisqacha..." />
                            </div>
                            <div className="ca-form-group ca-form-row single">
                                <label className="ca-label">Tavsif (Rus)</label>
                                <textarea rows={4} value={form.descriptionRu ?? ''} onChange={e => set('descriptionRu', e.target.value)} placeholder="Краткое описание..." />
                            </div>
                        </div>
                    </div>
                    <div className="ca-section-card">
                        <div className="ca-section-head">
                            <span className="ca-section-title"><ImageIcon size={16} /> Rasmlar</span>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Foydalanuvchilarga ko'rinadigan rasmlar</span>
                        </div>
                        <div className="ca-section-body">
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <FileUploadField label="Logotip" value={form.logo} onChange={v => set('logo', v)} />
                                </div>
                                <div className="ca-form-group">
                                    <FileUploadField label="Asosiy rasm (cover)" value={form.coverImage} onChange={v => set('coverImage', v)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── ADDRESS ── */}
            {tab === 'address' && (
                <div className="ca-section-card">
                    <div className="ca-section-head"><span className="ca-section-title"><MapPin size={16} /> Manzil</span></div>
                    <div className="ca-section-body">
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Viloyat / Shahar</label>
                                <input value={form.region ?? ''} onChange={e => set('region', e.target.value)} placeholder="Toshkent shahri" />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Tuman</label>
                                <input value={form.district ?? ''} onChange={e => set('district', e.target.value)} placeholder="Yunusobod tumani" />
                            </div>
                        </div>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Ko'cha, uy *</label>
                                <input value={form.street ?? ''} onChange={e => set('street', e.target.value)} placeholder="Amir Temur ko'chasi 1" />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Xonadon / Ofis</label>
                                <input value={form.apartment ?? ''} onChange={e => set('apartment', e.target.value)} placeholder="12" />
                            </div>
                        </div>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Manzil (O'zbek, to'liq)</label>
                                <input value={form.addressUz ?? ''} onChange={e => set('addressUz', e.target.value)} placeholder="Toshkent, Amir Temur 1" />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Manzil (Rus, to'liq)</label>
                                <input value={form.addressRu ?? ''} onChange={e => set('addressRu', e.target.value)} placeholder="Ташкент, Амир Темур 1" />
                            </div>
                        </div>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Pochta indeksi</label>
                                <input value={form.zipCode ?? ''} onChange={e => set('zipCode', e.target.value)} placeholder="100000" />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Mo'ljal</label>
                                <input value={form.landmark ?? ''} onChange={e => set('landmark', e.target.value)} placeholder="Metro yonida" />
                            </div>
                        </div>
                        <div className="ca-form-group ca-form-row single">
                            <label className="ca-label">
                                <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                Klinika joylashuvi xaritada
                            </label>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                Xaritada bino joyiga pin qo'ying — bemorlar shu nuqtaga qarab eng yaqin klinikangizni topadi.
                            </div>
                            <LocationPicker
                                value={{ lat: form.latitude, lng: form.longitude }}
                                onChange={({ lat, lng }) => {
                                    set('latitude', lat);
                                    set('longitude', lng);
                                }}
                            />
                        </div>

                        <details style={{ marginTop: 8 }}>
                            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
                                Koordinatani qo'lda kiritish
                            </summary>
                            <div className="ca-form-row" style={{ marginTop: 8 }}>
                                <div className="ca-form-group">
                                    <label className="ca-label">Kenglik (latitude)</label>
                                    <input type="number" step="0.000001" value={form.latitude ?? ''} onChange={e => set('latitude', e.target.value)} placeholder="41.2995" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Uzunlik (longitude)</label>
                                    <input type="number" step="0.000001" value={form.longitude ?? ''} onChange={e => set('longitude', e.target.value)} placeholder="69.2401" />
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            )}

            {/* ── CONTACT ── */}
            {tab === 'contact' && (
                <>
                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><Phone size={16} /> Telefon raqamlar</span></div>
                        <div className="ca-section-body">
                            {phones.map((ph, i) => (
                                <div key={i} className="ca-form-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input style={{ flex: 1 }} value={ph} onChange={e => setPhones(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder="+998 90 123 45 67" />
                                    {phones.length > 1 && <button type="button" className="ca-icon-btn danger" onClick={() => setPhones(prev => prev.filter((_, j) => j !== i))}>×</button>}
                                </div>
                            ))}
                            <button type="button" className="ca-btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => setPhones(prev => [...prev, ''])}>+ Telefon qo'shish</button>
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><Mail size={16} /> Email va veb-sayt</span></div>
                        <div className="ca-section-body">
                            {emails.map((em, i) => (
                                <div key={i} className="ca-form-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input style={{ flex: 1 }} type="email" value={em} onChange={e => setEmails(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder="info@klinika.uz" />
                                    {emails.length > 1 && <button type="button" className="ca-icon-btn danger" onClick={() => setEmails(prev => prev.filter((_, j) => j !== i))}>×</button>}
                                </div>
                            ))}
                            <button type="button" className="ca-btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => setEmails(prev => [...prev, ''])}>+ Email qo'shish</button>
                            <div className="ca-form-group" style={{ marginTop: 16 }}>
                                <label className="ca-label">Veb-sayt</label>
                                <input type="url" value={form.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="https://klinika.uz" />
                            </div>
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><Share2 size={16} /> Ijtimoiy tarmoqlar</span></div>
                        <div className="ca-section-body">
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Telegram</label>
                                    <input value={social.telegram} onChange={e => setSocial(p => ({ ...p, telegram: e.target.value }))} placeholder="https://t.me/klinika yoki @klinika" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Instagram</label>
                                    <input value={social.instagram} onChange={e => setSocial(p => ({ ...p, instagram: e.target.value }))} placeholder="https://instagram.com/klinika" />
                                </div>
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Facebook</label>
                                    <input value={social.facebook} onChange={e => setSocial(p => ({ ...p, facebook: e.target.value }))} placeholder="https://facebook.com/klinika" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">YouTube</label>
                                    <input value={social.youtube} onChange={e => setSocial(p => ({ ...p, youtube: e.target.value }))} placeholder="https://youtube.com/@klinika" />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── SCHEDULE ── */}
            {tab === 'schedule' && <ScheduleTab form={form} set={set} />}

            {/* ── FACILITY ── */}
            {tab === 'facility' && (
                <div className="ca-section-card">
                    <div className="ca-section-head"><span className="ca-section-title"><Building size={16} /> Muassasa imkoniyatlari</span></div>
                    <div className="ca-section-body">
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Yotoq joylar soni</label>
                                <input type="number" min="0" value={form.bedsCount ?? ''} onChange={e => set('bedsCount', e.target.value)} placeholder="50" />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Qavatlar soni</label>
                                <input type="number" min="0" value={form.floorsCount ?? ''} onChange={e => set('floorsCount', e.target.value)} placeholder="3" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600 }}>
                                <ToggleSwitch checked={!!form.hasEmergency} onChange={v => set('hasEmergency', v)} />
                                Tez yordam bo'limi bor
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600 }}>
                                <ToggleSwitch checked={!!form.hasAmbulance} onChange={v => set('hasAmbulance', v)} />
                                Ambulans xizmati bor
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600 }}>
                                <ToggleSwitch checked={!!form.parkingAvailable} onChange={v => set('parkingAvailable', v)} />
                                Avtoturargoh bor
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600 }}>
                                <ToggleSwitch checked={form.hasOnlineBooking !== false} onChange={v => set('hasOnlineBooking', v)} />
                                Onlayn bron qabul qilish yoqilgan
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LEGAL ── */}
            {tab === 'legal' && (
                <>
                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><FileText size={16} /> Litsenziya</span></div>
                        <div className="ca-section-body">
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Litsenziya raqami</label>
                                    <input value={form.licenseNumber ?? ''} onChange={e => set('licenseNumber', e.target.value)} placeholder="LIC-2024-001" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Kim tomonidan berilgan</label>
                                    <input value={form.licenseIssuedBy ?? ''} onChange={e => set('licenseIssuedBy', e.target.value)} placeholder="Sog'liqni saqlash vazirligi" />
                                </div>
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Berilgan sana</label>
                                    <input type="date" value={form.licenseIssuedAt ?? ''} onChange={e => set('licenseIssuedAt', e.target.value)} />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Amal qilish muddati</label>
                                    <input type="date" value={form.licenseExpiresAt ?? ''} onChange={e => set('licenseExpiresAt', e.target.value)} />
                                </div>
                            </div>
                            <FileUploadField label="Litsenziya fayli (PDF)" value={form.licenseUrl} onChange={v => set('licenseUrl', v)} accept="application/pdf" endpoint="/upload/clinic-pdf" kind="pdf" />
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><Award size={16} /> Sertifikatlar</span></div>
                        <div className="ca-section-body">
                            {certificates.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Hozircha sertifikat qo'shilmagan.</p>}
                            {certificates.map((c, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                    <FileText size={16} />
                                    <input style={{ flex: 1 }} value={c.name || ''} placeholder="Sertifikat nomi" onChange={e => setCertificates(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                                    {c.url && <a href={c.url.startsWith('/') ? `https://banisa.uz${c.url}` : c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0e7d80' }}>Ochish</a>}
                                    <button type="button" className="ca-icon-btn danger" onClick={() => setCertificates(prev => prev.filter((_, j) => j !== i))}>×</button>
                                </div>
                            ))}
                            <CertificateUploader onUploaded={url => setCertificates(prev => [...prev, { url, name: '' }])} />
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><Building2 size={16} /> Huquqiy ma'lumotlar</span></div>
                        <div className="ca-section-body">
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Yuridik nom</label>
                                    <input value={form.legalName ?? ''} onChange={e => set('legalName', e.target.value)} placeholder={`"Sog'liq" MChJ`} />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Tashkiliy-huquqiy shakl</label>
                                    <select value={form.legalForm ?? ''} onChange={e => set('legalForm', e.target.value)}>
                                        {LEGAL_FORMS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="ca-form-group ca-form-row single">
                                <label className="ca-label">Yuridik manzil</label>
                                <input value={form.legalAddress ?? ''} onChange={e => set('legalAddress', e.target.value)} placeholder="Toshkent sh., Yunusobod, Amir Temur 1" />
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">INN (Soliq raqami)</label>
                                    <input value={form.taxId ?? ''} onChange={e => set('taxId', e.target.value)} placeholder="123456789" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Ro'yxatga olish raqami</label>
                                    <input value={form.registrationNumber ?? ''} onChange={e => set('registrationNumber', e.target.value)} placeholder="REG-..." />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── BANK ── */}
            {tab === 'bank' && (
                <>
                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><Landmark size={16} /> Bank rekvizitlari</span></div>
                        <div className="ca-section-body">
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">Bank nomi</label>
                                    <input value={form.bankName ?? ''} onChange={e => set('bankName', e.target.value)} placeholder='"Hamkorbank" ATB' />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Hisob raqami</label>
                                    <input value={form.bankAccountNumber ?? ''} onChange={e => set('bankAccountNumber', e.target.value)} placeholder="20208000123456789012" />
                                </div>
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">MFO</label>
                                    <input value={form.mfo ?? ''} onChange={e => set('mfo', e.target.value)} placeholder="00425" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">OKED</label>
                                    <input value={form.oked ?? ''} onChange={e => set('oked', e.target.value)} placeholder="86101" />
                                </div>
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">QQS (VAT) raqami</label>
                                    <input value={form.vatNumber ?? ''} onChange={e => set('vatNumber', e.target.value)} placeholder="..." />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Hisob-faktura email</label>
                                    <input type="email" value={form.invoiceEmail ?? ''} onChange={e => set('invoiceEmail', e.target.value)} placeholder="hisob@klinika.uz" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head"><span className="ca-section-title"><CreditCard size={16} /> Qabul qilinadigan to'lov usullari</span></div>
                        <div className="ca-section-body">
                            <CheckboxList value={paymentMethods} options={PAYMENT_METHOD_OPTIONS} onChange={setPaymentMethods} />
                        </div>
                    </div>

                    {/* Fiskal kodlar (Soliq) — Payme chekiga ketadigan ma'lumotlar */}
                    <div className="ca-section-card">
                        <div className="ca-section-head">
                            <span className="ca-section-title"><CreditCard size={16} /> Fiskal kodlar (Soliq cheki)</span>
                        </div>
                        <div className="ca-section-body">
                            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>
                                Payme chekiga shu kodlar yoziladi va Soliq Komiteti hisobotiga tushadi.
                                Kerakli MXIK kodi va o'lchov birligi <a href="https://tasnif.soliq.uz" target="_blank" rel="noopener noreferrer" style={{ color: '#06b6d4' }}>tasnif.soliq.uz</a> dan tekshiriladi.
                                Bo'sh qoldirilsa, tibbiy xizmatlar uchun standart qiymatlar ishlatiladi (MXIK <code style={{ background:'#f1f5f9', padding:'1px 4px', borderRadius:3 }}>10902004002000999</code>, o'lchov <code style={{ background:'#f1f5f9', padding:'1px 4px', borderRadius:3 }}>1322039</code>, QQS 12%).
                            </p>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">MXIK kodi</label>
                                    <input
                                        value={form.fiscalMxikCode ?? ''}
                                        onChange={e => set('fiscalMxikCode', e.target.value.replace(/\D/g, ''))}
                                        placeholder="10902004002000999"
                                        maxLength={32}
                                    />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">O'lchov birligi (package_code)</label>
                                    <input
                                        value={form.fiscalPackageCode ?? ''}
                                        onChange={e => set('fiscalPackageCode', e.target.value.replace(/\D/g, ''))}
                                        placeholder="1322039"
                                        maxLength={32}
                                    />
                                </div>
                            </div>
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">QQS foizi (vat_percent)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={form.fiscalVatPercent ?? ''}
                                        onChange={e => set('fiscalVatPercent', e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="12"
                                    />
                                </div>
                                <div className="ca-form-group" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── ADMIN PERSON ── */}
            {tab === 'admin' && (
                <div className="ca-section-card">
                    <div className="ca-section-head"><span className="ca-section-title"><Edit3 size={16} /> Mas'ul shaxs</span></div>
                    <div className="ca-section-body">
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Ism</label>
                                <input value={form.adminFirstName ?? ''} onChange={e => set('adminFirstName', e.target.value)} />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Familiya</label>
                                <input value={form.adminLastName ?? ''} onChange={e => set('adminLastName', e.target.value)} />
                            </div>
                        </div>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Lavozim</label>
                                <input value={form.adminPosition ?? ''} onChange={e => set('adminPosition', e.target.value)} placeholder="Bosh shifokor" />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Telefon</label>
                                <input value={form.adminPhone ?? ''} onChange={e => set('adminPhone', e.target.value)} placeholder="+998 90 123 45 67" />
                            </div>
                        </div>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Email</label>
                                <input type="email" value={form.adminEmail ?? ''} onChange={e => set('adminEmail', e.target.value)} />
                            </div>
                            <div className="ca-form-group" />
                        </div>
                    </div>
                </div>
            )}

            {/* ── SETTINGS / META ── */}
            {tab === 'settings' && (
                <div className="ca-section-card">
                    <div className="ca-section-head"><span className="ca-section-title"><Settings size={16} /> Klinika holati</span></div>
                    <div className="ca-section-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { label: 'Reyting', value: profile?.averageRating?.toFixed(1) ?? '—' },
                                { label: 'Sharhlar soni', value: profile?.reviewCount ?? 0 },
                                { label: 'Status', value: profile?.status ?? '—' },
                                { label: "Ro'yxatdan o'tgan", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('uz-UZ') : '—' },
                            ].map((item, i) => (
                                <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{item.label}</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <SaveBanner visible={saved} />
        </div>
    );
}

function CertificateUploader({ onUploaded }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();
    const handle = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const fd = new FormData(); fd.append('file', file);
        setUploading(true);
        try {
            const { data } = await api.post('/upload/clinic-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onUploaded(data.data.url);
        } catch (err) {
            alert('Yuklash xatoligi: ' + (err?.response?.data?.message || err?.message));
        } finally { setUploading(false); }
    };
    return (
        <>
            <button type="button" className="ca-btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} disabled={uploading} onClick={() => fileRef.current.click()}>
                {uploading ? <><SpinLoader size={14} className="ca-spin" /> Yuklanmoqda...</> : <><Upload size={14} /> Sertifikat qo'shish (PDF)</>}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handle} />
        </>
    );
}

function SaveBanner({ visible }) {
    if (!visible) return null;
    return (
        <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: '#22c55e', color: '#fff', borderRadius: 10,
            padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10,
            fontWeight: 600, fontSize: 14, zIndex: 2000,
            boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
        }}>
            <CheckCircle2 size={18} /> Ma'lumotlar saqlandi
        </div>
    );
}
