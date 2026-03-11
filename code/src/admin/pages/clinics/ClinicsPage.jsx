import React, { useState, useEffect } from 'react';
import { Plus, Building2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinics, useCreateClinic, useUpdateClinic } from './hooks/useClinics';
import ClinicsTabContent from './components/ClinicsTabContent';
import '../../../pages/Services.css';
import '../../../pages/Clinics.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'all', label: 'Barcha klinikalar', filters: {}, showSourceBadge: true, enableWorkflow: false },
    { id: 'admin', label: 'Admin kiritgan', filters: { source: 'ADMIN_CREATED' }, showSourceBadge: false, enableWorkflow: false },
    { id: 'registrations', label: 'Arizalar', filters: { source: 'SELF_REGISTERED' }, showSourceBadge: false, enableWorkflow: true },
];

const EMPTY_FORM = {
    nameUz: '', nameRu: '', nameEn: '', type: 'GENERAL',
    description: '', region: '', district: '', street: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '',
    registrationNumber: '', taxId: '', licenseNumber: '',
    phones: '', emails: '', website: '',
};

const UZBEKISTAN_REGIONS = [
    'Toshkent shahri', 'Toshkent viloyati', 'Samarqand', 'Buxoro',
    "Andijon", "Farg'ona", 'Namangan', 'Qashqadaryo', 'Surxondaryo',
    'Xorazm', 'Navoiy', 'Jizzax', 'Sirdaryo', "Qoraqalpog'iston",
];

const CLINIC_TYPES = [
    { value: 'GENERAL', label: 'Umumiy klinika' },
    { value: 'SPECIALIZED', label: 'Ixtisoslashgan' },
    { value: 'DIAGNOSTIC', label: 'Diagnostika markazi' },
    { value: 'DENTAL', label: 'Stomatologiya' },
    { value: 'MATERNITY', label: "Tug'ruqxona" },
    { value: 'REHABILITATION', label: 'Reabilitatsiya' },
    { value: 'PHARMACY', label: 'Dorixona' },
    { value: 'OTHER', label: 'Boshqa' },
];

// ─── Badge count hook ─────────────────────────────────────────────────────────

const useBadgeCounts = () => {
    const allQ = useClinics({ limit: 1 });
    const selfQ = useClinics({ source: 'SELF_REGISTERED', limit: 1 });
    const pendingQ = useClinics({ source: 'SELF_REGISTERED', status: 'PENDING', limit: 1 });
    const adminQ = useClinics({ source: 'ADMIN_CREATED', status: 'APPROVED', limit: 1 });

    return {
        all: allQ.data?.meta?.total ?? 0,
        admin: adminQ.data?.meta?.total ?? 0,
        self: selfQ.data?.meta?.total ?? 0,
        pending: pendingQ.data?.meta?.total ?? 0,
    };
};

// ─── Clinic Form Modal ────────────────────────────────────────────────────────

const ClinicFormModal = ({ open, editData, onClose, onSuccess }) => {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const createMut = useCreateClinic();
    const updateMut = useUpdateClinic();

    useEffect(() => {
        if (editData) {
            setFormData({
                ...EMPTY_FORM,
                ...editData,
                phones: Array.isArray(editData.phones) ? editData.phones.join(', ') : '',
                emails: Array.isArray(editData.emails) ? editData.emails.join(', ') : '',
            });
        } else {
            setFormData(EMPTY_FORM);
        }
    }, [editData, open]);

    const set = (key) => (e) => setFormData(p => ({ ...p, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            ...formData,
            phones: formData.phones ? formData.phones.split(',').map(s => s.trim()).filter(Boolean) : [],
            emails: formData.emails ? formData.emails.split(',').map(s => s.trim()).filter(Boolean) : [],
        };
        try {
            if (editData?.id) {
                await updateMut.mutateAsync({ id: editData.id, ...payload });
            } else {
                await createMut.mutateAsync(payload);
            }
            onSuccess?.();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onClose}>
                <motion.div
                    className="form-modal"
                    style={{ maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="form-modal-header">
                        <h2>{editData ? 'Klinikani tahrirlash' : 'Yangi klinika qo\'shish'}</h2>
                        <button className="btn-close" onClick={onClose}><X size={22} /></button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
                        <div className="form-section">
                            <h3>Asosiy ma'lumotlar</h3>
                            <div className="form-row">
                                <label>Klinika nomi (UZ) *</label>
                                <input className="form-input" required value={formData.nameUz} onChange={set('nameUz')} />
                            </div>
                            <div className="form-row">
                                <label>Klinika nomi (RU)</label>
                                <input className="form-input" value={formData.nameRu} onChange={set('nameRu')} />
                            </div>
                            <div className="form-row">
                                <label>Klinika turi *</label>
                                <select className="form-select" value={formData.type} onChange={set('type')}>
                                    {CLINIC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>Tavsif</label>
                                <textarea className="form-textarea" rows={3} value={formData.description} onChange={set('description')} />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Manzil</h3>
                            <div className="form-row">
                                <label>Viloyat *</label>
                                <select className="form-select" required value={formData.region} onChange={set('region')}>
                                    <option value="">Viloyatni tanlang</option>
                                    {UZBEKISTAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>Tuman *</label>
                                <input className="form-input" required value={formData.district} onChange={set('district')} />
                            </div>
                            <div className="form-row">
                                <label>Ko'cha / manzil *</label>
                                <input className="form-input" required value={formData.street} onChange={set('street')} />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Aloqa</h3>
                            <div className="form-row">
                                <label>Telefon(lar) (vergul bilan)</label>
                                <input className="form-input" placeholder="+998901234567, +998911234567" value={formData.phones} onChange={set('phones')} />
                            </div>
                            <div className="form-row">
                                <label>Email(lar)</label>
                                <input className="form-input" placeholder="info@klinika.uz" value={formData.emails} onChange={set('emails')} />
                            </div>
                            <div className="form-row">
                                <label>Veb-sayt</label>
                                <input className="form-input" placeholder="https://klinika.uz" value={formData.website} onChange={set('website')} />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Admin ma'lumotlari</h3>
                            <div className="form-row two-col">
                                <div>
                                    <label>Ism *</label>
                                    <input className="form-input" required value={formData.adminFirstName} onChange={set('adminFirstName')} />
                                </div>
                                <div>
                                    <label>Familiya *</label>
                                    <input className="form-input" required value={formData.adminLastName} onChange={set('adminLastName')} />
                                </div>
                            </div>
                            <div className="form-row">
                                <label>Admin email *</label>
                                <input className="form-input" type="email" required value={formData.adminEmail} onChange={set('adminEmail')} />
                            </div>
                            <div className="form-row">
                                <label>Admin telefon *</label>
                                <input className="form-input" required value={formData.adminPhone} onChange={set('adminPhone')} placeholder="+998901234567" />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Hujjatlar</h3>
                            <div className="form-row">
                                <label>INN (STIR)</label>
                                <input className="form-input" value={formData.taxId} onChange={set('taxId')} />
                            </div>
                            <div className="form-row">
                                <label>Litsenziya raqami</label>
                                <input className="form-input" value={formData.licenseNumber} onChange={set('licenseNumber')} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button type="button" className="btn-cancel" onClick={onClose}>
                                Bekor qilish
                            </button>
                            <button type="submit" className="btn-add-service" disabled={saving}>
                                {saving ? <><Loader2 size={16} className="spin" /> Saqlanmoqda...</> : `${editData ? 'Saqlash' : 'Qo\'shish'}`}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// ─── Main ClinicsPage ─────────────────────────────────────────────────────────

const ClinicsPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editClinic, setEditClinic] = useState(null);

    const counts = useBadgeCounts();

    const tabCounts = [counts.all, counts.admin, counts.self];

    const handleOpenCreate = () => { setEditClinic(null); setShowForm(true); };
    const handleOpenEdit = (clinic) => { setEditClinic(clinic); setShowForm(true); };

    return (
        <div className="services-container">
            {/* Header */}
            <div className="services-header">
                <div>
                    <h1><Building2 size={28} /> Klinikalar</h1>
                    <p>Barcha klinikalarni boshqarish</p>
                </div>
                <button className="btn-add-service" onClick={handleOpenCreate}>
                    <Plus size={20} /> Yangi klinika
                </button>
            </div>

            {/* Tab navigation */}
            <div className="clinics-tabs-nav" style={{ marginBottom: 24 }}>
                {TABS.map((tab, i) => (
                    <button
                        key={tab.id}
                        className={`cl-tab-btn ${activeTab === i ? 'active' : ''}`}
                        onClick={() => setActiveTab(i)}
                    >
                        {tab.label}
                        {tabCounts[i] > 0 && (
                            <span className="cl-tab-badge">
                                {tabCounts[i]}
                            </span>
                        )}
                        {tab.id === 'registrations' && counts.pending > 0 && (
                            <span className="cl-tab-badge" style={{ background: '#f59e0b' }}>
                                {counts.pending} yangi
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {TABS.map((tab, i) => (
                <div key={tab.id} style={{ display: activeTab === i ? 'block' : 'none' }}>
                    <ClinicsTabContent
                        tabFilters={tab.filters}
                        showSourceBadge={tab.showSourceBadge}
                        enableWorkflow={tab.enableWorkflow}
                        onOpenCreate={handleOpenCreate}
                        onOpenEdit={handleOpenEdit}
                    />
                </div>
            ))}

            {/* Create/Edit form modal */}
            <ClinicFormModal
                open={showForm}
                editData={editClinic}
                onClose={() => { setShowForm(false); setEditClinic(null); }}
            />
        </div>
    );
};

export default ClinicsPage;
