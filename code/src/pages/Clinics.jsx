import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Plus, Search, X, Check, Ban, Eye, Edit,
    Loader2, ArrowLeft, ArrowRight,
    MapPin, Phone, Mail, Clock, Shield, FileText, Users, Star,
    AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2, ShieldCheck,
    List, LayoutGrid, UserCog
} from 'lucide-react';
import { clinicsApi } from '../services/api';
import axiosInstance from '../shared/api/axios';
import './Clinics.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const UZBEKISTAN_REGIONS = [
    'Toshkent shahri', 'Toshkent viloyati', 'Samarqand', 'Buxoro',
    'Andijon', 'Farg\'ona', 'Namangan', 'Qashqadaryo', 'Surxondaryo',
    'Xorazm', 'Navoiy', 'Jizzax', 'Sirdaryo', 'Qoraqalpog\'iston'
];

const CLINIC_TYPES = [
    { value: 'GENERAL', label: 'Umumiy Klinika', icon: '🏥' },
    { value: 'SPECIALIZED', label: 'Ixtisoslashgan', icon: '🔬' },
    { value: 'DIAGNOSTIC', label: 'Diagnostika Markazi', icon: '📊' },
    { value: 'DENTAL', label: 'Stomatologiya', icon: '🦷' },
    { value: 'MATERNITY', label: 'Tug\'ruqxona', icon: '👶' },
    { value: 'REHABILITATION', label: 'Reabilitatsiya', icon: '♿' },
    { value: 'PHARMACY', label: 'Dorixona', icon: '💊' },
    { value: 'OTHER', label: 'Boshqa', icon: '🏛️' },
];

const DAYS = [
    { key: 'monday', label: 'Dushanba' },
    { key: 'tuesday', label: 'Seshanba' },
    { key: 'wednesday', label: 'Chorshanba' },
    { key: 'thursday', label: 'Payshanba' },
    { key: 'friday', label: 'Juma' },
    { key: 'saturday', label: 'Shanba' },
    { key: 'sunday', label: 'Yakshanba' },
];

const WIZARD_STEPS = [
    { title: 'Asosiy', desc: 'Klinika nomi va turi', icon: <Building2 size={16} /> },
    { title: 'Joylashuv', desc: 'Manzil va aloqa', icon: <MapPin size={16} /> },
    { title: 'Jadval', desc: 'Ish vaqti', icon: <Clock size={16} /> },
    { title: 'Infratuzilma', desc: 'Qulayliklar', icon: <Shield size={16} /> },
    { title: 'To\'lov', desc: 'Narx va sug\'urta', icon: <Star size={16} /> },
    { title: 'Hujjatlar', desc: 'Litsenziya', icon: <FileText size={16} /> },
    { title: 'Admin', desc: 'Mas\'ul shaxs', icon: <Users size={16} /> },
    { title: 'Tekshirish', desc: 'Yakunlash', icon: <CheckCircle size={16} /> },
];

const EMPTY_FORM = {
    nameUz: '', nameRu: '', nameEn: '',
    type: 'GENERAL',
    description: '',
    logo: '', coverImage: '',
    region: '', district: '', street: '', apartment: '', landmark: '',
    latitude: '', longitude: '',
    phones: [''],
    emails: [''],
    website: '', socialMedia: { instagram: '', telegram: '', facebook: '' },
    workingHours: DAYS.map(d => ({ day: d.key, isOpen: d.key !== 'sunday', openTime: '08:00', closeTime: '18:00' })),
    hasEmergency: false, hasAmbulance: false, hasOnlineBooking: true,
    bedsCount: '', floorsCount: '', parkingAvailable: false,
    amenities: [],
    paymentMethods: [], insuranceAccepted: [], priceRange: '',
    registrationNumber: '', taxId: '',
    licenseNumber: '', licenseIssuedAt: '', licenseExpiresAt: '', licenseIssuedBy: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '', adminPosition: '',
    notes: '',
};

const STATUS_CONFIG = {
    PENDING: { label: 'Kutilmoqda', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: <Clock size={14} /> },
    APPROVED: { label: 'Tasdiqlangan', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: <CheckCircle size={14} /> },
    REJECTED: { label: 'Rad etilgan', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: <XCircle size={14} /> },
    BLOCKED: { label: 'Bloklangan', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', icon: <Ban size={14} /> },
};

const REG_API = '/auth/clinic-register';

const REG_STATUS_CONFIG = {
    ALL: { label: 'Barchasi', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    PENDING: { label: 'Yangi', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    IN_REVIEW: { label: "Ko'rib chiqilmoqda", color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    APPROVED: { label: 'Tasdiqlangan', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    REJECTED: { label: 'Rad etilgan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const CLINIC_TYPE_LABELS = {
    diagnostika_markazi: '🔬 Diagnostika markazi',
    poliklinika: '🏥 Poliklinika',
    kasalxona: '🏨 Kasalxona',
    ixtisoslashgan_markaz: '🎯 Ixtisoslashgan markaz',
    tish_klinikasi: '🦷 Tish klinikasi',
    sanatoriya: '🏖️ Sanatoriya',
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Clinics = () => {
    // ── Tab state ──────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState(0); // 0=all, 1=admin_created, 2=registrations

    // ── Clinics state (Tabs 0 & 1) ─────────────────────────────────────────────
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [viewMode, setViewMode] = useState('table');
    const [selectedClinics, setSelectedClinics] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formStep, setFormStep] = useState(1);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [detailClinic, setDetailClinic] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // ── Registrations state (Tab 2) ────────────────────────────────────────────
    const [registrations, setRegistrations] = useState([]);
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState(null);
    const [regStatusFilter, setRegStatusFilter] = useState('ALL');
    const [regSearch, setRegSearch] = useState('');
    const [pendingCount, setPendingCount] = useState(0);
    const [selectedReg, setSelectedReg] = useState(null);
    const [regDetailData, setRegDetailData] = useState(null);
    const [regDetailOpen, setRegDetailOpen] = useState(false);
    const [regDetailLoading, setRegDetailLoading] = useState(false);
    const [regRejectOpen, setRegRejectOpen] = useState(false);
    const [rejectRegReason, setRejectRegReason] = useState('');
    const [regActionLoading, setRegActionLoading] = useState(null);

    // ── Fetch clinics (Tabs 0 & 1) ─────────────────────────────────────────────
    const fetchClinics = useCallback(async (page = 1) => {
        if (activeTab === 2) return;
        setLoading(true);
        setError(null);
        try {
            const params = {
                page, limit: meta.limit,
                ...(searchQuery.length >= 2 && { search: searchQuery }),
                ...(statusFilter && { status: statusFilter }),
                ...(regionFilter && { region: regionFilter }),
                ...(typeFilter && { type: typeFilter }),
                ...(activeTab === 1 && { source: 'admin_created' }),
            };
            const result = await clinicsApi.list(params);
            setClinics(result.data || []);
            setMeta(result.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter, regionFilter, typeFilter, meta.limit, activeTab]);

    useEffect(() => {
        if (activeTab < 2) {
            const t = setTimeout(() => fetchClinics(1), 400);
            return () => clearTimeout(t);
        }
    }, [fetchClinics, activeTab]);

    // ── Fetch registrations (Tab 2) ────────────────────────────────────────────
    const fetchRegistrations = useCallback(async () => {
        setRegLoading(true);
        setRegError(null);
        try {
            const q = regStatusFilter && regStatusFilter !== 'ALL' ? `?status=${regStatusFilter}` : '';
            const { data } = await axiosInstance.get(`${REG_API}/admin${q}`);
            const regs = data?.data || [];
            setRegistrations(regs);
            setPendingCount(regs.filter(r => r.status === 'PENDING').length);
        } catch {
            setRegError("Ma'lumot yuklashda xatolik. Qayta urinib ko'ring.");
        } finally {
            setRegLoading(false);
        }
    }, [regStatusFilter]);

    useEffect(() => {
        if (activeTab === 2) fetchRegistrations();
    }, [activeTab, fetchRegistrations]);

    // Fetch pending count on mount for badge
    useEffect(() => {
        axiosInstance.get(`${REG_API}/admin?status=PENDING`)
            .then(({ data }) => setPendingCount((data?.data || []).length))
            .catch(() => { });
    }, []);

    // ── Registration actions ───────────────────────────────────────────────────
    const handleRegReview = async (id) => {
        setRegActionLoading(id + '_review');
        try {
            await axiosInstance.patch(`${REG_API}/admin/${id}/review`);
            fetchRegistrations();
        } catch (err) { alert(err.response?.data?.message || 'Xatolik yuz berdi'); }
        finally { setRegActionLoading(null); }
    };

    const handleRegApprove = async (id) => {
        setRegActionLoading(id + '_approve');
        try {
            await axiosInstance.patch(`${REG_API}/admin/${id}/approve`);
            fetchRegistrations();
            setRegDetailOpen(false);
            setPendingCount(p => Math.max(0, p - 1));
        } catch (err) { alert(err.response?.data?.message || 'Xatolik yuz berdi'); }
        finally { setRegActionLoading(null); }
    };

    const handleRegReject = async () => {
        if (!rejectRegReason.trim()) return;
        setRegActionLoading('reject');
        try {
            await axiosInstance.patch(`${REG_API}/admin/${selectedReg}/reject`, { reason: rejectRegReason });
            fetchRegistrations();
            setRegRejectOpen(false);
            setRegDetailOpen(false);
            setRejectRegReason('');
            setSelectedReg(null);
        } catch (err) { alert(err.response?.data?.message || 'Xatolik yuz berdi'); }
        finally { setRegActionLoading(null); }
    };

    const openRegDetail = async (reg) => {
        setSelectedReg(reg.id);
        setRegDetailData(reg);
        setRegDetailOpen(true);
        setRegDetailLoading(true);
        try {
            const { data } = await axiosInstance.get(`${REG_API}/admin/${reg.id}`);
            setRegDetailData(data?.data || reg);
        } catch { /* keep existing data */ }
        finally { setRegDetailLoading(false); }
    };

    const filteredRegs = registrations.filter(r =>
        r.nameUz?.toLowerCase().includes(regSearch.toLowerCase()) ||
        r.adminEmail?.toLowerCase().includes(regSearch.toLowerCase()) ||
        r.regionId?.toLowerCase().includes(regSearch.toLowerCase())
    );

    // ── Clinic form helpers ────────────────────────────────────────────────────
    const handleChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const openCreate = () => {
        setEditingId(null);
        setFormData({ ...EMPTY_FORM });
        setFormStep(1);
        setShowForm(true);
    };

    const openEdit = async (clinic) => {
        setEditingId(clinic.id);
        const full = await clinicsApi.getById(clinic.id);
        setFormData({
            ...EMPTY_FORM,
            ...full,
            phones: full.phones?.length ? full.phones : [''],
            emails: full.emails?.length ? full.emails : [''],
            workingHours: full.workingHours?.length ? full.workingHours : EMPTY_FORM.workingHours,
            socialMedia: full.socialMedia || { instagram: '', telegram: '', facebook: '' },
        });
        setFormStep(1);
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...formData,
                phones: formData.phones.filter(Boolean),
                emails: formData.emails.filter(Boolean),
                bedsCount: formData.bedsCount ? Number(formData.bedsCount) : undefined,
                floorsCount: formData.floorsCount ? Number(formData.floorsCount) : undefined,
                latitude: formData.latitude ? Number(formData.latitude) : undefined,
                longitude: formData.longitude ? Number(formData.longitude) : undefined,
            };
            if (editingId) {
                await clinicsApi.update(editingId, payload);
            } else {
                await clinicsApi.create(payload);
            }
            setShowForm(false);
            fetchClinics(meta.page);
        } catch (err) {
            alert(err.message || 'Saqlashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (status) => {
        try {
            await clinicsApi.updateStatus(showStatusModal.id, status, rejectionReason);
            setShowStatusModal(null);
            setRejectionReason('');
            fetchClinics(meta.page);
            if (detailClinic?.id === showStatusModal.id) setDetailClinic({ ...detailClinic, status });
        } catch (err) {
            alert(err.message);
        }
    };

    const handleToggleBlock = async (clinic) => {
        const isBlocked = clinic.status === 'BLOCKED';
        const newStatus = isBlocked ? 'APPROVED' : 'BLOCKED';
        if (!window.confirm(`Klinikani ${isBlocked ? 'faollashtirmoqchimisiz' : 'bloklamoqchimisiz'}?`)) return;
        try {
            await clinicsApi.updateStatus(clinic.id, newStatus, '');
            fetchClinics(meta.page);
            if (detailClinic?.id === clinic.id) setDetailClinic({ ...detailClinic, status: newStatus });
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm('Klinikani o\'chirmoqchimisiz?')) return;
        try {
            await clinicsApi.delete(id);
            fetchClinics(meta.page);
            if (detailClinic?.id === id) setDetailClinic(null);
            if (selectedClinics.includes(id)) setSelectedClinics(prev => prev.filter(x => x !== id));
        } catch (err) { alert(err.message); }
    };

    const toggleSelect = (id) => {
        setSelectedClinics(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── Form step render ───────────────────────────────────────────────────────
    const renderStep = () => {
        switch (formStep) {
            case 1: return (
                <div className="animated fade-in">
                    <div className="form-group">
                        <label className="form-label">Klinika nomi (UZ) *</label>
                        <input className="form-input" value={formData.nameUz} onChange={e => handleChange('nameUz', e.target.value)} placeholder="Masalan: MedLife Klinikasi" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Nomi (RU)</label>
                            <input className="form-input" value={formData.nameRu} onChange={e => handleChange('nameRu', e.target.value)} placeholder="Клиника МедЛайф" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Turi *</label>
                            <select className="form-select" value={formData.type} onChange={e => handleChange('type', e.target.value)}>
                                {CLINIC_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tavsif</label>
                        <textarea className="form-textarea" rows={3} value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder="Klinika haqida qisqacha ma'lumot..." />
                    </div>
                </div>
            );
            case 2: return (
                <div className="animated fade-in">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Viloyat *</label>
                            <select className="form-select" value={formData.region} onChange={e => handleChange('region', e.target.value)}>
                                <option value="">Tanlang...</option>
                                {UZBEKISTAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tuman *</label>
                            <input className="form-input" value={formData.district} onChange={e => handleChange('district', e.target.value)} placeholder="Yunusobod" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ko'cha, manzil *</label>
                        <input className="form-input" value={formData.street} onChange={e => handleChange('street', e.target.value)} placeholder="Amir Temur ko'chasi, 12" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Telefon raqamlar *</label>
                        {formData.phones.map((ph, i) => (
                            <div key={i} className="array-input-row">
                                <input className="form-input" value={ph} onChange={e => { const arr = [...formData.phones]; arr[i] = e.target.value; handleChange('phones', arr); }} placeholder="+998 90 123 4567" />
                                {formData.phones.length > 1 && (
                                    <button className="btn-remove" onClick={() => handleChange('phones', formData.phones.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))}
                        <button className="btn-add" onClick={() => handleChange('phones', [...formData.phones, ''])}><Plus size={14} /> Telefon qo'shish</button>
                    </div>
                </div>
            );
            case 3: return (
                <div className="animated fade-in">
                    <div className="working-hours-list">
                        {DAYS.map((day, i) => {
                            const wh = formData.workingHours[i] || { day: day.key, isOpen: false, openTime: '08:00', closeTime: '18:00' };
                            return (
                                <div key={day.key} className={`day-row ${wh.isOpen ? 'open' : ''}`}>
                                    <div className="day-toggle">
                                        <label className="switch">
                                            <input type="checkbox" checked={wh.isOpen} onChange={e => { const arr = [...formData.workingHours]; arr[i] = { ...wh, isOpen: e.target.checked }; handleChange('workingHours', arr); }} />
                                            <span className="slider" />
                                        </label>
                                        <span className="day-name">{day.label}</span>
                                    </div>
                                    {wh.isOpen ? (
                                        <div className="time-range">
                                            <input type="time" value={wh.openTime} onChange={e => { const arr = [...formData.workingHours]; arr[i] = { ...wh, openTime: e.target.value }; handleChange('workingHours', arr); }} />
                                            <span>—</span>
                                            <input type="time" value={wh.closeTime} onChange={e => { const arr = [...formData.workingHours]; arr[i] = { ...wh, closeTime: e.target.value }; handleChange('workingHours', arr); }} />
                                        </div>
                                    ) : <span className="closed-label">Dam olish kuni</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
            case 4: return (
                <div className="animated fade-in">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Karavotlar soni</label>
                            <input className="form-input" type="number" value={formData.bedsCount} onChange={e => handleChange('bedsCount', e.target.value)} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Qavatlar soni</label>
                            <input className="form-input" type="number" value={formData.floorsCount} onChange={e => handleChange('floorsCount', e.target.value)} placeholder="1" />
                        </div>
                    </div>
                    <div className="checkbox-group">
                        <label className="checkbox-item"><input type="checkbox" checked={formData.hasEmergency} onChange={e => handleChange('hasEmergency', e.target.checked)} />🚑 Shoshilinch yordam</label>
                        <label className="checkbox-item"><input type="checkbox" checked={formData.hasAmbulance} onChange={e => handleChange('hasAmbulance', e.target.checked)} />🚗 Tez yordam</label>
                        <label className="checkbox-item"><input type="checkbox" checked={formData.parkingAvailable} onChange={e => handleChange('parkingAvailable', e.target.checked)} />🅿️ Avtoturargoh</label>
                    </div>
                </div>
            );
            case 5: return (
                <div className="animated fade-in">
                    <div className="form-group">
                        <label className="form-label">Narx oralig'i</label>
                        <select className="form-select" value={formData.priceRange} onChange={e => handleChange('priceRange', e.target.value)}>
                            <option value="">Tanlang...</option>
                            <option value="budget">Arzon (100K - 300K UZS)</option>
                            <option value="mid">O'rta (300K - 700K UZS)</option>
                            <option value="premium">Premium (700K+ UZS)</option>
                        </select>
                    </div>
                </div>
            );
            case 6: return (
                <div className="animated fade-in">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Ro'yxatdan o'tish raqami *</label>
                            <input className="form-input" value={formData.registrationNumber} onChange={e => handleChange('registrationNumber', e.target.value)} placeholder="12345678" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">STIR (INN) *</label>
                            <input className="form-input" value={formData.taxId} onChange={e => handleChange('taxId', e.target.value)} placeholder="123456789" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Litsenziya raqami *</label>
                        <input className="form-input" value={formData.licenseNumber} onChange={e => handleChange('licenseNumber', e.target.value)} placeholder="LIC-2024-001" />
                    </div>
                </div>
            );
            case 7: return (
                <div className="animated fade-in">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Ism *</label>
                            <input className="form-input" value={formData.adminFirstName} onChange={e => handleChange('adminFirstName', e.target.value)} placeholder="Alisher" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Familiya *</label>
                            <input className="form-input" value={formData.adminLastName} onChange={e => handleChange('adminLastName', e.target.value)} placeholder="Nazarov" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input className="form-input" type="email" value={formData.adminEmail} onChange={e => handleChange('adminEmail', e.target.value)} placeholder="admin@klinika.uz" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefon *</label>
                            <input className="form-input" value={formData.adminPhone} onChange={e => handleChange('adminPhone', e.target.value)} placeholder="+998 90 123 4567" />
                        </div>
                    </div>
                </div>
            );
            case 8: return (
                <div className="animated fade-in">
                    <div className="info-grid" style={{ marginBottom: 0 }}>
                        <div className="info-item full-width">
                            <span className="info-label">Klinika nomi</span>
                            <span className="info-value">{formData.nameUz || '—'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Turi</span>
                            <span className="info-value">{CLINIC_TYPES.find(t => t.value === formData.type)?.label}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Viloyat</span>
                            <span className="info-value">{formData.region || '—'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Telefon</span>
                            <span className="info-value">{formData.phones.filter(Boolean).join(', ') || '—'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Litsenziya</span>
                            <span className="info-value">{formData.licenseNumber || '—'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Admin</span>
                            <span className="info-value">{[formData.adminFirstName, formData.adminLastName].filter(Boolean).join(' ') || '—'}</span>
                        </div>
                    </div>
                </div>
            );
            default: return null;
        }
    };

    // ── Detail drawer content ──────────────────────────────────────────────────
    const renderDetailModal = () => {
        if (!detailClinic) return null;
        const typeInfo = CLINIC_TYPES.find(t => t.value === detailClinic.type);
        const statusInfo = STATUS_CONFIG[detailClinic.status] || STATUS_CONFIG.PENDING;
        return (
            <>
                <div className="tags-row">
                    <span className="tag primary">{typeInfo?.icon} {typeInfo?.label}</span>
                    <span className={`status-badge ${detailClinic.status.toLowerCase()}`}>{statusInfo.icon} {statusInfo.label}</span>
                    {detailClinic.hasOnlineBooking && <span className="tag active">✅ Onlayn navbat</span>}
                    {detailClinic.hasEmergency && <span className="tag">🚑 Shoshilinch</span>}
                </div>
                <div className="info-grid">
                    <div className="info-item"><span className="info-label">Viloyat</span><span className="info-value">{detailClinic.region}</span></div>
                    <div className="info-item"><span className="info-label">Tuman</span><span className="info-value">{detailClinic.district}</span></div>
                    <div className="info-item full-width"><span className="info-label">Manzil</span><span className="info-value">{detailClinic.street}</span></div>
                    <div className="info-item">
                        <span className="info-label">Reyting</span>
                        <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Star size={14} fill="#fbbf24" color="#fbbf24" />
                            {detailClinic.averageRating?.toFixed(1) || '0.0'}
                            <small style={{ color: '#9ca3af' }}>({detailClinic.reviewCount} sharh)</small>
                        </span>
                    </div>
                    <div className="info-item"><span className="info-label">Qo'shilgan sana</span><span className="info-value">{new Date(detailClinic.createdAt).toLocaleDateString('uz-UZ')}</span></div>
                </div>
                <div className="section">
                    <div className="section-title">Aloqa</div>
                    <div className="section-content">
                        <div className="contact-list">
                            {detailClinic.phones?.map((p, i) => <div key={i} className="contact-item"><Phone size={16} /> {p}</div>)}
                            {detailClinic.emails?.map((e, i) => <div key={i} className="contact-item"><Mail size={16} /> {e}</div>)}
                        </div>
                    </div>
                </div>
                {detailClinic.description && (
                    <div className="section">
                        <div className="section-title">Tavsif</div>
                        <div className="section-content">{detailClinic.description}</div>
                    </div>
                )}
                <div className="section">
                    <div className="section-title">Litsenziya</div>
                    <div className="section-content">
                        <div className="contact-list">
                            <div className="contact-item"><FileText size={16} /> {detailClinic.licenseNumber}</div>
                            <div className="contact-item"><ShieldCheck size={16} /> {detailClinic.registrationNumber}</div>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    // ── Registration detail fields ─────────────────────────────────────────────
    const regDetailFields = regDetailData ? [
        { label: 'Klinika nomi', value: regDetailData.nameUz },
        { label: 'Klinika turi', value: CLINIC_TYPE_LABELS[regDetailData.clinicType] || regDetailData.clinicType },
        { label: 'Viloyat', value: regDetailData.regionId },
        { label: 'Tuman', value: regDetailData.districtId },
        { label: "Ko'cha", value: regDetailData.streetAddress },
        { label: "To'liq manzil", value: regDetailData.addressUz },
        { label: 'Asosiy telefon', value: regDetailData.primaryPhone },
        { label: 'Email', value: regDetailData.email },
        { label: 'Admin', value: `${regDetailData.lastName || ''} ${regDetailData.firstName || ''}`.trim() },
        { label: 'Admin email', value: regDetailData.adminEmail },
        { label: 'INN', value: regDetailData.inn },
        { label: 'Litsenziya raqami', value: regDetailData.licenseNumber },
        { label: 'Litsenziya muddati', value: regDetailData.licenseExpiry },
        { label: 'Bank', value: regDetailData.bankName },
        { label: 'Hisob raqami', value: regDetailData.bankAccountNumber },
    ] : [];

    // ── Main render ────────────────────────────────────────────────────────────
    return (
        <div className="services-container">

            {/* ── Header ── */}
            <div className="services-header">
                <div>
                    <h1><Building2 size={26} /> Klinikalar</h1>
                    <p>
                        {activeTab < 2
                            ? `${meta.total} ta klinika ro'yxatda`
                            : `${registrations.length} ta ariza`}
                    </p>
                </div>
                <button className="btn-add-service" onClick={openCreate}>
                    <Plus size={18} /> Yangi klinika
                </button>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="clinics-tabs-nav">
                <button className={`cl-tab-btn ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>
                    Barcha klinikalar
                </button>
                <button className={`cl-tab-btn ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
                    <UserCog size={15} /> Admin kiritgan
                </button>
                <button className={`cl-tab-btn ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
                    Arizalar
                    {pendingCount > 0 && <span className="cl-tab-badge">{pendingCount}</span>}
                </button>
            </div>

            {/* ── TABS 0 & 1: Clinics Toolbar ── */}
            {activeTab < 2 && (
                <div className="catalog-toolbar" style={{ marginBottom: '20px', background: 'white', borderRadius: '16px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
                    <div className="search-wrapper" style={{ flex: 1, maxWidth: '300px' }}>
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Klinika nomini qidiring..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="filter-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', fontSize: '14px', cursor: 'pointer' }}>
                            <option value="">Barcha statuslar</option>
                            <option value="PENDING">⏳ Kutilmoqda</option>
                            <option value="APPROVED">✅ Tasdiqlangan</option>
                            <option value="REJECTED">❌ Rad etilgan</option>
                            <option value="BLOCKED">🚫 Bloklangan</option>
                        </select>
                        <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', fontSize: '14px', cursor: 'pointer', minWidth: '140px' }}>
                            <option value="">Barcha viloyatlar</option>
                            {UZBEKISTAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', fontSize: '14px', cursor: 'pointer' }}>
                            <option value="">Barcha turlar</option>
                            {CLINIC_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                        </select>
                        <button className="btn-icon" title="Yangilash" onClick={() => fetchClinics(1)}><RefreshCw size={18} /></button>
                        <div className="view-toggle">
                            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}><List size={20} /></button>
                            <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}><LayoutGrid size={20} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 2: Registrations Toolbar ── */}
            {activeTab === 2 && (
                <div className="catalog-toolbar" style={{ marginBottom: '16px', background: 'white', borderRadius: '16px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
                    <div className="search-wrapper" style={{ flex: 1, maxWidth: '320px' }}>
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Klinika, email yoki viloyat..." value={regSearch} onChange={e => setRegSearch(e.target.value)} />
                    </div>
                    <div className="filter-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="reg-status-chips">
                            {Object.entries(REG_STATUS_CONFIG).map(([key, cfg]) => {
                                const count = key === 'ALL' ? registrations.length : registrations.filter(r => r.status === key).length;
                                return (
                                    <button
                                        key={key}
                                        className={`reg-status-chip ${regStatusFilter === key ? 'active' : ''}`}
                                        style={{ color: cfg.color, background: regStatusFilter === key ? cfg.bg : 'transparent' }}
                                        onClick={() => setRegStatusFilter(key)}
                                    >
                                        {cfg.label}
                                        <span className="reg-count-badge">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button className="btn-icon" title="Yangilash" onClick={fetchRegistrations}><RefreshCw size={18} /></button>
                    </div>
                </div>
            )}

            {/* ── Bulk Actions ── */}
            {activeTab < 2 && selectedClinics.length > 0 && (
                <div className="bulk-actions-bar">
                    <span>{selectedClinics.length} ta klinika tanlandi</span>
                    <button className="btn-bulk-cancel" onClick={() => setSelectedClinics([])}>Bekor qilish</button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                TAB 0 & 1: CLINICS TABLE / CARDS
            ════════════════════════════════════════════════════════ */}
            {activeTab < 2 && (
                <main className="catalog-content" style={{ borderRadius: '16px', border: '1px solid #e5e7eb', background: 'white' }}>
                    {loading ? (
                        <div className="loading-state"><Loader2 size={36} className="spin" /><p>Yuklanmoqda...</p></div>
                    ) : error ? (
                        <div className="error-banner"><AlertCircle size={18} /> {error}<button onClick={() => fetchClinics(1)}>Qayta urinish</button></div>
                    ) : clinics.length === 0 ? (
                        <div className="empty-state">
                            <span>{activeTab === 1 ? '👤' : '🏥'}</span>
                            <h3>{activeTab === 1 ? 'Admin kiritgan klinikalar topilmadi' : 'Klinikalar topilmadi'}</h3>
                            <p>Yangi klinika qo'shish uchun "Yangi klinika" tugmasini bosing</p>
                            <button className="btn-add-service" onClick={openCreate}><Plus size={18} /> Yangi klinika</button>
                        </div>
                    ) : (
                        <div className="catalog-view">
                            {viewMode === 'table' ? (
                                <table className="master-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}>
                                                <input type="checkbox" onChange={(e) => setSelectedClinics(e.target.checked ? clinics.map(c => c.id) : [])} checked={selectedClinics.length === clinics.length && clinics.length > 0} />
                                            </th>
                                            <th>Klinika nomi</th>
                                            <th>Turi</th>
                                            <th>Manzil</th>
                                            <th>Reyting</th>
                                            <th>Holati</th>
                                            <th>Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clinics.map(clinic => {
                                            const typeInfo = CLINIC_TYPES.find(t => t.value === clinic.type);
                                            const statusInfo = STATUS_CONFIG[clinic.status] || STATUS_CONFIG.PENDING;
                                            return (
                                                <tr key={clinic.id} onClick={() => setDetailClinic(clinic)}>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <input type="checkbox" checked={selectedClinics.includes(clinic.id)} onChange={() => toggleSelect(clinic.id)} />
                                                    </td>
                                                    <td>
                                                        <div className="service-name-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: 36, height: 36, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', fontSize: '18px' }}>
                                                                {clinic.logo ? <img src={clinic.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : typeInfo?.icon || '🏥'}
                                                            </div>
                                                            <div>
                                                                <div className="main-name">{clinic.nameUz}</div>
                                                                {activeTab === 1 && <span className="source-badge">👤 Admin</span>}
                                                                {clinic.phones?.[0] && <div className="meta" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}><Phone size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />{clinic.phones[0]}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="cat-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', background: '#f3f4f6', fontSize: '13px' }}>
                                                            {typeInfo?.icon || '🏥'} {typeInfo?.label || '—'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                                                            <MapPin size={14} color="#6b7280" /> {clinic.region}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500 }}>
                                                            <Star size={14} fill="#fbbf24" color="#fbbf24" /> {clinic.averageRating?.toFixed(1) || '0.0'}
                                                        </div>
                                                    </td>
                                                    <td><span className={`status-badge ${clinic.status.toLowerCase()}`}>{statusInfo.label}</span></td>
                                                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                                        <button className="btn-icon" title="Ko'rish" onClick={(e) => { e.stopPropagation(); setDetailClinic(clinic); }}><Eye size={16} /></button>
                                                        <button className="btn-icon" title="Tahrirlash" onClick={(e) => { e.stopPropagation(); openEdit(clinic); }}><Edit size={16} /></button>
                                                        {clinic.status === 'PENDING' && (
                                                            <button className="btn-icon" style={{ color: '#10b981' }} title="Tasdiqlash" onClick={(e) => { e.stopPropagation(); setShowStatusModal(clinic); }}><Check size={16} /></button>
                                                        )}
                                                        <button className="btn-icon danger" title="O'chirish" onClick={(e) => handleDelete(clinic.id, e)}><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="cards-grid">
                                    {clinics.map(clinic => {
                                        const typeInfo = CLINIC_TYPES.find(t => t.value === clinic.type);
                                        const statusInfo = STATUS_CONFIG[clinic.status] || STATUS_CONFIG.PENDING;
                                        return (
                                            <div key={clinic.id} className="service-card" onClick={() => setDetailClinic(clinic)}>
                                                <div className="card-top">
                                                    <div className="card-icon">{typeInfo?.icon || '🏥'}</div>
                                                    <span className={`status-dot ${clinic.status === 'APPROVED' ? 'active' : ''}`} />
                                                </div>
                                                <h3>{clinic.nameUz}</h3>
                                                {activeTab === 1 && <span className="source-badge">👤 Admin kiritgan</span>}
                                                <p className="card-sub">{typeInfo?.label}</p>
                                                <span className="cat-badge"><MapPin size={14} /> {clinic.region}</span>
                                                <div className="card-meta"><span><Phone size={14} /> {clinic.phones?.[0] || '—'}</span></div>
                                                <div className="card-meta"><span><Star size={14} fill="#fbbf24" color="#fbbf24" /> {clinic.averageRating?.toFixed(1) || '0.0'} ({clinic.reviewCount || 0})</span></div>
                                                <span className={`status-badge ${clinic.status.toLowerCase()}`}>{statusInfo.label}</span>
                                                <div className="card-actions">
                                                    <button className="btn-view" onClick={(e) => { e.stopPropagation(); setDetailClinic(clinic); }}>Batafsil</button>
                                                    <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEdit(clinic); }}>Tahrirlash</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {meta.totalPages > 1 && (
                                <div className="pagination">
                                    <button disabled={meta.page <= 1} onClick={() => fetchClinics(meta.page - 1)}><ArrowLeft size={16} /> Oldingi</button>
                                    <span>{meta.page} / {meta.totalPages} ({meta.total} ta)</span>
                                    <button disabled={meta.page >= meta.totalPages} onClick={() => fetchClinics(meta.page + 1)}>Keyingi <ArrowRight size={16} /></button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            )}

            {/* ═══════════════════════════════════════════════════════
                TAB 2: REGISTRATION REQUESTS
            ════════════════════════════════════════════════════════ */}
            {activeTab === 2 && (
                <main className="catalog-content" style={{ borderRadius: '16px', border: '1px solid #e5e7eb', background: 'white' }}>
                    {regLoading ? (
                        <div className="loading-state"><Loader2 size={36} className="spin" /><p>Yuklanmoqda...</p></div>
                    ) : regError ? (
                        <div className="error-banner"><AlertCircle size={18} /> {regError}<button onClick={fetchRegistrations}>Qayta urinish</button></div>
                    ) : filteredRegs.length === 0 ? (
                        <div className="reg-empty">
                            <div className="reg-empty-icon">📋</div>
                            <h3>{regSearch ? 'Qidiruv natijalari topilmadi' : 'Arizalar topilmadi'}</h3>
                            <p>Yangi arizalar bu yerda ko'rinadi</p>
                        </div>
                    ) : (
                        filteredRegs.map(reg => {
                            const sCfg = REG_STATUS_CONFIG[reg.status] || REG_STATUS_CONFIG.PENDING;
                            const isActing = (key) => regActionLoading === reg.id + '_' + key;
                            return (
                                <div key={reg.id} className="reg-row">
                                    <div className="reg-icon"><Building2 size={18} /></div>
                                    <div className="reg-info">
                                        <div className="reg-name">
                                            {reg.nameUz}
                                            <span className="reg-status-badge" style={{ color: sCfg.color, background: sCfg.bg, marginLeft: 8 }}>
                                                {sCfg.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                                            {CLINIC_TYPE_LABELS[reg.clinicType] || reg.clinicType}
                                        </div>
                                        <div className="reg-meta">
                                            {reg.adminEmail && <span>📧 {reg.adminEmail}</span>}
                                            {reg.regionId && <span>📍 {reg.regionId}</span>}
                                            <span>📅 {new Date(reg.createdAt).toLocaleDateString('uz-UZ')}</span>
                                        </div>
                                    </div>
                                    <div className="reg-actions">
                                        <button className="reg-btn reg-btn-view" onClick={() => openRegDetail(reg)}>
                                            <Eye size={14} /> Ko'rish
                                        </button>
                                        {reg.status === 'PENDING' && (
                                            <button className="reg-btn reg-btn-review" onClick={() => handleRegReview(reg.id)} disabled={isActing('review')}>
                                                {isActing('review') ? <Loader2 size={14} className="spin" /> : <Clock size={14} />}
                                                Ko'rib chiq
                                            </button>
                                        )}
                                        {(reg.status === 'PENDING' || reg.status === 'IN_REVIEW') && (
                                            <>
                                                <button className="reg-btn reg-btn-approve" onClick={() => handleRegApprove(reg.id)} disabled={isActing('approve')}>
                                                    {isActing('approve') ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                                                    Tasdiqlash
                                                </button>
                                                <button className="reg-btn reg-btn-reject" onClick={() => { setSelectedReg(reg.id); setRegRejectOpen(true); }}>
                                                    <XCircle size={14} /> Rad etish
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </main>
            )}

            {/* ═══════════════════════════════════════════════════════
                DETAIL DRAWER (Clinics)
            ════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {detailClinic && (
                    <>
                        <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailClinic(null)} />
                        <motion.div className="service-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}>
                            <div className="drawer-header">
                                <h2>{detailClinic.nameUz}</h2>
                                <button className="btn-close" onClick={() => setDetailClinic(null)}><X size={24} /></button>
                            </div>
                            <div className="drawer-body">{renderDetailModal()}</div>
                            <div className="drawer-footer">
                                <button className="btn-edit-full" onClick={(e) => { openEdit(detailClinic, e); setDetailClinic(null); }}><Edit size={18} /> Tahrirlash</button>
                                <button className="btn-edit-full" style={{ background: detailClinic.status === 'BLOCKED' ? '#10b981' : '#f59e0b', color: '#fff', border: 'none' }} onClick={() => handleToggleBlock(detailClinic)}>
                                    <Ban size={18} /> {detailClinic.status === 'BLOCKED' ? 'Faollashtirish' : 'Bloklash'}
                                </button>
                                <button className="btn-delete" onClick={(e) => { handleDelete(detailClinic.id, e); setDetailClinic(null); }}><Trash2 size={18} /> O'chirish</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════
                REGISTRATION DETAIL MODAL
            ════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {regDetailOpen && (
                    <div className="modal-overlay" onClick={() => setRegDetailOpen(false)}>
                        <motion.div className="detail-modal" style={{ maxWidth: 680, overflowY: 'auto', maxHeight: '85vh' }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Ariza Tafsilotlari</h3>
                                <button className="btn-close" onClick={() => setRegDetailOpen(false)}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                {regDetailLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={32} className="spin" style={{ color: '#6366f1' }} /></div>
                                ) : regDetailData ? (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                            <div className="reg-icon" style={{ width: 44, height: 44 }}><Building2 size={20} /></div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 17 }}>{regDetailData.nameUz}</div>
                                                {regDetailData.status && (() => {
                                                    const sCfg = REG_STATUS_CONFIG[regDetailData.status] || REG_STATUS_CONFIG.PENDING;
                                                    return <span className="reg-status-badge" style={{ color: sCfg.color, background: sCfg.bg }}>{sCfg.label}</span>;
                                                })()}
                                            </div>
                                        </div>
                                        {regDetailData.rejectionReason && (
                                            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16 }}>
                                                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4, fontSize: 13 }}>❌ Rad etish sababi:</div>
                                                <div style={{ color: '#7f1d1d', fontSize: 14 }}>{regDetailData.rejectionReason}</div>
                                            </div>
                                        )}
                                        <div className="reg-detail-grid">
                                            {regDetailFields.map(({ label, value }) => (
                                                <div key={label} className="reg-detail-item">
                                                    <div className="reg-detail-label">{label}</div>
                                                    <div className="reg-detail-value">{value || '—'}</div>
                                                </div>
                                            ))}
                                            {regDetailData.descriptionUz && (
                                                <div className="reg-detail-item full">
                                                    <div className="reg-detail-label">Tavsif</div>
                                                    <div className="reg-detail-value">{regDetailData.descriptionUz}</div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : <p style={{ color: '#6b7280' }}>Ma'lumot topilmadi</p>}
                            </div>
                            <div className="drawer-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button className="reg-btn reg-btn-view" onClick={() => setRegDetailOpen(false)}>Yopish</button>
                                {regDetailData && (regDetailData.status === 'PENDING' || regDetailData.status === 'IN_REVIEW') && (
                                    <>
                                        <button className="reg-btn reg-btn-reject" onClick={() => { setSelectedReg(regDetailData.id); setRegRejectOpen(true); }}>
                                            <XCircle size={14} /> Rad etish
                                        </button>
                                        <button className="reg-btn reg-btn-approve" onClick={() => handleRegApprove(regDetailData.id)} disabled={regActionLoading === regDetailData.id + '_approve'}>
                                            {regActionLoading === regDetailData.id + '_approve' ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                                            Tasdiqlash
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════
                REGISTRATION REJECT MODAL
            ════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {regRejectOpen && (
                    <div className="modal-overlay" onClick={() => setRegRejectOpen(false)}>
                        <motion.div className="detail-modal" style={{ maxWidth: 480 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Arizani Rad Etish</h3>
                                <button className="btn-close" onClick={() => setRegRejectOpen(false)}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
                                    Rad etish sababini kiriting. Bu sabab klinikaga yuboriladi.
                                </p>
                                <textarea
                                    value={rejectRegReason}
                                    onChange={e => setRejectRegReason(e.target.value)}
                                    className="form-textarea"
                                    rows={4}
                                    placeholder="Masalan: Taqdim etilgan hujjatlar to'liq emas..."
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>
                            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button className="reg-btn reg-btn-view" onClick={() => { setRegRejectOpen(false); setRejectRegReason(''); }}>Bekor qilish</button>
                                <button className="reg-btn reg-btn-reject" disabled={!rejectRegReason.trim() || regActionLoading === 'reject'} onClick={handleRegReject}>
                                    {regActionLoading === 'reject' ? <><Loader2 size={14} className="spin" /> Yuborilmoqda...</> : <><XCircle size={14} /> Rad Etish</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════
                CLINIC CREATE / EDIT FORM MODAL
            ════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showForm && (
                    <div className="form-modal-overlay">
                        <motion.div className="form-modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
                            <div className="form-modal-header">
                                <h2>{editingId ? 'Klinikani Tahrirlash' : 'Yangi Klinika'}</h2>
                                <button className="btn-close" onClick={() => setShowForm(false)}><X size={22} /></button>
                            </div>
                            <div className="form-modal-body">
                                <div className="wizard-container">
                                    <div className="wizard-sidebar">
                                        {WIZARD_STEPS.map((s, i) => (
                                            <div key={i} className={`wizard-step-item ${formStep === i + 1 ? 'active' : ''} ${formStep > i + 1 ? 'done' : ''}`} onClick={() => setFormStep(i + 1)}>
                                                <div className="step-number">{formStep > i + 1 ? <Check size={14} /> : i + 1}</div>
                                                <div className="step-meta">
                                                    <div className="step-title">{s.title}</div>
                                                    <div className="step-desc">{s.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="wizard-main">
                                        <div className="wizard-progress">
                                            <div className="wizard-progress-bar" style={{ width: `${(formStep / 8) * 100}%` }} />
                                        </div>
                                        <div className="wizard-content">{renderStep()}</div>
                                        <div className="wizard-footer">
                                            <button className="btn btn-secondary" onClick={() => formStep > 1 ? setFormStep(s => s - 1) : setShowForm(false)}>
                                                {formStep === 1 ? 'Bekor qilish' : <><ArrowLeft size={16} /> Orqaga</>}
                                            </button>
                                            {formStep < 8 ? (
                                                <button className="btn btn-primary" onClick={() => setFormStep(s => s + 1)}>
                                                    Keyingisi <ArrowRight size={18} />
                                                </button>
                                            ) : (
                                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                                    {saving ? <><Loader2 size={16} className="spin" /> Saqlanmoqda...</> : '✅ Saqlash'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════
                CLINIC STATUS MODAL
            ════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showStatusModal && (
                    <div className="modal-overlay" onClick={() => setShowStatusModal(null)}>
                        <motion.div className="detail-modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Status o'zgartirish</h3>
                                <button className="btn-close" onClick={() => setShowStatusModal(null)}><X size={20} /></button>
                            </div>
                            <div className="status-modal-content">
                                <div className="status-options">
                                    <div className="status-option" onClick={() => handleStatusChange('APPROVED')}>
                                        <div className="status-option-icon approve"><CheckCircle size={20} /></div>
                                        <div className="status-option-info">
                                            <div className="status-option-title">Tasdiqlash</div>
                                            <div className="status-option-desc">Klinika tasdiqlangan statusini o'rnatish</div>
                                        </div>
                                    </div>
                                    <div className="status-option" onClick={() => handleStatusChange('REJECTED')}>
                                        <div className="status-option-icon reject"><XCircle size={20} /></div>
                                        <div className="status-option-info">
                                            <div className="status-option-title">Rad etish</div>
                                            <div className="status-option-desc">Klinikani rad etish va sabab ko'rsatish</div>
                                        </div>
                                    </div>
                                    <div className="status-option" onClick={() => handleStatusChange('BLOCKED')}>
                                        <div className="status-option-icon block"><Ban size={20} /></div>
                                        <div className="status-option-info">
                                            <div className="status-option-title">Bloklash</div>
                                            <div className="status-option-desc">Klinikani vaqtinchalik bloklash</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rad etish sababi (ixtiyoriy)</label>
                                    <textarea className="form-textarea" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Rad etish sababini kiriting..." />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Clinics;
