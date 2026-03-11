import { useState, useEffect } from 'react';
import {
    Building2, Phone, Mail, Globe, MapPin,
    FileText, Save, Loader2, CheckCircle2, Edit3,
    Clock, Settings,
} from 'lucide-react';
import { useClinicProfile, useUpdateProfile } from '../hooks/useClinicData';
import './clinic-admin.css';

const TABS = [
    { key: 'basic', label: 'Asosiy', icon: <Building2 size={15} /> },
    { key: 'contact', label: 'Aloqa', icon: <Phone size={15} /> },
    { key: 'license', label: 'Litsenziya', icon: <FileText size={15} /> },
    { key: 'settings', label: 'Sozlamalar', icon: <Settings size={15} /> },
];

const CLINIC_TYPES = [
    { value: 'GENERAL', label: 'Umumiy klinika' },
    { value: 'SPECIALIZED', label: 'Ixtisoslashgan' },
    { value: 'DIAGNOSTIC', label: 'Diagnostika markazi' },
    { value: 'DENTAL', label: 'Tish klinikasi' },
    { value: 'MATERNITY', label: 'Tug\'ruqxona' },
    { value: 'REHABILITATION', label: 'Reabilitatsiya' },
    { value: 'PHARMACY', label: 'Dorixona' },
];

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
            <CheckCircle2 size={18} /> Ma&#39;lumotlar saqlandi
        </div>
    );
}

export default function ClinicProfile() {
    const [tab, setTab] = useState('basic');
    const [form, setForm] = useState({});
    const [saved, setSaved] = useState(false);
    const [phones, setPhones] = useState(['']);
    const [emails, setEmails] = useState(['']);

    const { data: profile, isLoading } = useClinicProfile();
    const updateMut = useUpdateProfile();

    useEffect(() => {
        if (!profile) return;
        setForm({
            nameUz: profile.nameUz ?? '',
            nameRu: profile.nameRu ?? '',
            nameEn: profile.nameEn ?? '',
            type: profile.type ?? 'GENERAL',
            description: profile.description ?? '',
            region: profile.region ?? '',
            district: profile.district ?? '',
            street: profile.street ?? '',
            landmark: profile.landmark ?? '',
            website: profile.website ?? '',
            taxId: profile.taxId ?? '',
            licenseNumber: profile.licenseNumber ?? '',
            adminFirstName: profile.adminFirstName ?? '',
            adminLastName: profile.adminLastName ?? '',
            adminEmail: profile.adminEmail ?? '',
            adminPhone: profile.adminPhone ?? '',
        });
        setPhones(profile.phones?.length ? profile.phones : ['']);
        setEmails(profile.emails?.length ? profile.emails : ['']);
    }, [profile]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        await updateMut.mutateAsync({
            ...form,
            phones: phones.filter(Boolean),
            emails: emails.filter(Boolean),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (isLoading) return (
        <div className="ca-loading"><Loader2 size={32} className="ca-spin" /><span>Yuklanmoqda...</span></div>
    );

    return (
        <div>
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Klinika Profili</h1>
                    <p className="ca-subtitle">{profile?.nameUz ?? 'Klinika ma&#39;lumotlari'}</p>
                </div>
                <button
                    className="ca-btn-primary"
                    onClick={handleSave}
                    disabled={updateMut.isPending}
                >
                    {updateMut.isPending
                        ? <><Loader2 size={15} className="ca-spin" /> Saqlanmoqda...</>
                        : <><Save size={15} /> Saqlash</>
                    }
                </button>
            </div>

            {/* Tabs */}
            <div className="ca-tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`ca-tab${tab === t.key ? ' active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ── BASIC ── */}
            {tab === 'basic' && (
                <div className="ca-section-card">
                    <div className="ca-section-head">
                        <span className="ca-section-title"><Building2 size={16} /> Asosiy ma&#39;lumotlar</span>
                    </div>
                    <div className="ca-section-body">
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Klinika nomi (O&#39;zbek) *</label>
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
                        <div className="ca-form-group ca-form-row single">
                            <label className="ca-label">Tavsif</label>
                            <textarea rows={4} value={form.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Klinika haqida qisqacha ma'lumot..." />
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONTACT ── */}
            {tab === 'contact' && (
                <>
                    <div className="ca-section-card">
                        <div className="ca-section-head">
                            <span className="ca-section-title"><MapPin size={16} /> Manzil</span>
                        </div>
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
                                    <label className="ca-label">Ko&#39;cha, uy *</label>
                                    <input value={form.street ?? ''} onChange={e => set('street', e.target.value)} placeholder="Amir Temur ko'chasi 1" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Mo&#39;ljal</label>
                                    <input value={form.landmark ?? ''} onChange={e => set('landmark', e.target.value)} placeholder="Metro yonida" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head">
                            <span className="ca-section-title"><Phone size={16} /> Telefon raqamlar</span>
                        </div>
                        <div className="ca-section-body">
                            {phones.map((ph, i) => (
                                <div key={i} className="ca-form-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        style={{ flex: 1 }}
                                        value={ph}
                                        onChange={e => setPhones(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                                        placeholder="+998 90 123 45 67"
                                    />
                                    {phones.length > 1 && (
                                        <button
                                            type="button"
                                            className="ca-icon-btn danger"
                                            onClick={() => setPhones(prev => prev.filter((_, j) => j !== i))}
                                        >×</button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                className="ca-btn-secondary"
                                style={{ fontSize: 13, padding: '8px 14px' }}
                                onClick={() => setPhones(prev => [...prev, ''])}
                            >
                                + Telefon qo&#39;shish
                            </button>
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head">
                            <span className="ca-section-title"><Mail size={16} /> Email va veb-sayt</span>
                        </div>
                        <div className="ca-section-body">
                            {emails.map((em, i) => (
                                <div key={i} className="ca-form-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        style={{ flex: 1 }}
                                        type="email"
                                        value={em}
                                        onChange={e => setEmails(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                                        placeholder="info@klinika.uz"
                                    />
                                    {emails.length > 1 && (
                                        <button
                                            type="button"
                                            className="ca-icon-btn danger"
                                            onClick={() => setEmails(prev => prev.filter((_, j) => j !== i))}
                                        >×</button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                className="ca-btn-secondary"
                                style={{ fontSize: 13, padding: '8px 14px' }}
                                onClick={() => setEmails(prev => [...prev, ''])}
                            >
                                + Email qo&#39;shish
                            </button>
                            <div className="ca-form-group" style={{ marginTop: 16 }}>
                                <label className="ca-label">Veb-sayt</label>
                                <input
                                    type="url"
                                    value={form.website ?? ''}
                                    onChange={e => set('website', e.target.value)}
                                    placeholder="https://klinika.uz"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── LICENSE ── */}
            {tab === 'license' && (
                <>
                    <div className="ca-section-card">
                        <div className="ca-section-head">
                            <span className="ca-section-title"><FileText size={16} /> Litsenziya va soliq</span>
                        </div>
                        <div className="ca-section-body">
                            <div className="ca-form-row">
                                <div className="ca-form-group">
                                    <label className="ca-label">INN (Soliq raqami)</label>
                                    <input value={form.taxId ?? ''} onChange={e => set('taxId', e.target.value)} placeholder="123456789" />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Litsenziya raqami</label>
                                    <input value={form.licenseNumber ?? ''} onChange={e => set('licenseNumber', e.target.value)} placeholder="LIC-2024-001" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ca-section-card">
                        <div className="ca-section-head">
                            <span className="ca-section-title"><Edit3 size={16} /> Mas&#39;ul shaxs</span>
                        </div>
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
                                    <label className="ca-label">Telefon</label>
                                    <input value={form.adminPhone ?? ''} onChange={e => set('adminPhone', e.target.value)} />
                                </div>
                                <div className="ca-form-group">
                                    <label className="ca-label">Email</label>
                                    <input type="email" value={form.adminEmail ?? ''} onChange={e => set('adminEmail', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── SETTINGS ── */}
            {tab === 'settings' && (
                <div className="ca-section-card">
                    <div className="ca-section-head">
                        <span className="ca-section-title"><Settings size={16} /> Ish sozlamalari</span>
                    </div>
                    <div className="ca-section-body">
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                            Ish vaqtlari va navbat sozlamalari uchun Xizmatlar sahifasidagi Sozlamalar tabiga o&#39;ting.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { label: 'Rating', value: profile?.averageRating?.toFixed(1) ?? '—' },
                                { label: 'Sharhlar soni', value: profile?.reviewCount ?? 0 },
                                { label: 'Status', value: profile?.status ?? '—' },
                                { label: 'Ro\'yxatdan o\'tgan', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('uz-UZ') : '—' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    padding: '14px 16px',
                                    borderRadius: 10,
                                    background: 'var(--hover-bg)',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                                        {item.value}
                                    </div>
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
