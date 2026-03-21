import { useState, useEffect, useMemo } from 'react';
import {
    Search, RefreshCw, Loader2, CircleCheckBig, Circle, X,
    Clock, Check, Building2, Bed, Utensils, Heart, Target,
    Upload, MapPin, Phone, Mail, Calendar, Users, Plus, Trash2,
    Image as ImageIcon, Percent, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useSanatoriumServices, useActivateSanatoriumService, useDeactivateSanatoriumService } from '../../hooks/useSanatoriumServices';
import api from '../../../shared/api/axios';

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');

function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

const SERVICE_TYPE_LABELS = {
    ACCOMMODATION: { label: 'Turar joy', icon: <Bed size={12} />, color: '#8b5cf6' },
    MEDICAL: { label: 'Tibbiy', icon: <Heart size={12} />, color: '#ef4444' },
    NUTRITION: { label: 'Ovqatlanish', icon: <Utensils size={12} />, color: '#f59e0b' },
    PROGRAM: { label: 'Dastur', icon: <Target size={12} />, color: '#3b82f6' },
};

const PRICE_PER_LABELS = {
    session: 'seans',
    night: 'kecha',
    day: 'kun',
    course: 'kurs',
    package: 'paket',
};

export default function SanatoriumServicesTab() {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [subcategoryFilter, setSubcategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [confirmDeactivate, setConfirmDeactivate] = useState(null);
    const [activateModal, setActivateModal] = useState(null);
    const [categories, setCategories] = useState([]);
    const [formStep, setFormStep] = useState(1);
    const [formData, setFormData] = useState({
        customNameUz: '',
        customNameRu: '',
        customDescription: '',
        clinicPrice: '',
        discountPercent: '',
        discountValidUntil: '',
        roomType: '',
        roomImages: [],
        roomAmenities: [],
        mealPlan: '',
        mealDescription: '',
        locationAddress: '',
        locationCoords: '',
        contactPhone: '',
        contactEmail: '',
        features: [],
        includes: [],
        excludes: [],
        availableFrom: '',
        availableTo: '',
        maxGuests: '',
    });
    const [newAmenity, setNewAmenity] = useState('');
    const [newFeature, setNewFeature] = useState('');
    const [newInclude, setNewInclude] = useState('');
    const [newExclude, setNewExclude] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        api.get('/categories').then(res => {
            setCategories(res.data.data || []);
        }).catch(console.error);
    }, []);

    const activeCategoryId = subcategoryFilter !== 'all' ? subcategoryFilter : (categoryFilter !== 'all' ? categoryFilter : undefined);

    const { data: services, isLoading, refetch } = useSanatoriumServices({
        search: debouncedSearch || undefined,
        categoryId: activeCategoryId,
    });

    const activateMut = useActivateSanatoriumService();
    const deactivateMut = useDeactivateSanatoriumService();

    const flat = useMemo(() => {
        const result = [];
        const flatten = (items) => items?.forEach(c => { result.push(c); flatten(c.children); });
        flatten(categories);
        return result;
    }, [categories]);

    const sanatoriumRoot = useMemo(() => flat.find(c => c.level === 0 && c.slug === 'sanatorium'), [flat]);
    const mainCategories = useMemo(() => sanatoriumRoot?.children || [], [sanatoriumRoot]);
    const subcategories = useMemo(() => {
        if (categoryFilter === 'all') return [];
        return mainCategories.find(c => c.id === categoryFilter)?.children || [];
    }, [mainCategories, categoryFilter]);

    useEffect(() => { setSubcategoryFilter('all'); }, [categoryFilter]);

    const filtered = useMemo(() => {
        if (!services) return [];
        let list = [...services];
        if (statusFilter === 'active') list = list.filter(s => s.clinicService?.isActive);
        else if (statusFilter === 'inactive') list = list.filter(s => !s.clinicService?.isActive);
        return list;
    }, [services, statusFilter]);

    const totalActive = services?.filter(s => s.clinicService?.isActive).length ?? 0;

    const handleActivate = (s) => {
        setActivateModal(s);
        setFormStep(1);
        setFormData({
            customNameUz: s.nameUz,
            customNameRu: s.nameRu || '',
            customDescription: s.shortDescription || '',
            clinicPrice: s.priceRecommended || '',
            discountPercent: '',
            discountValidUntil: '',
            roomType: '',
            roomImages: [],
            roomAmenities: [],
            mealPlan: '',
            mealDescription: '',
            locationAddress: '',
            locationCoords: '',
            contactPhone: '',
            contactEmail: '',
            features: [],
            includes: [],
            excludes: [],
            availableFrom: '',
            availableTo: '',
            maxGuests: '',
        });
    };

    const handleConfirmActivate = () => {
        if (!activateModal) return;
        const payload = {
            serviceId: activateModal.id,
            customNameUz: formData.customNameUz || undefined,
            customNameRu: formData.customNameRu || undefined,
            customDescription: formData.customDescription || undefined,
            clinicPrice: formData.clinicPrice ? parseInt(formData.clinicPrice) : undefined,
            discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : undefined,
            discountValidUntil: formData.discountValidUntil || undefined,
            roomType: formData.roomType || undefined,
            roomImages: formData.roomImages.length > 0 ? formData.roomImages : undefined,
            roomAmenities: formData.roomAmenities.length > 0 ? formData.roomAmenities : undefined,
            mealPlan: formData.mealPlan || undefined,
            mealDescription: formData.mealDescription || undefined,
            locationAddress: formData.locationAddress || undefined,
            locationCoords: formData.locationCoords || undefined,
            contactPhone: formData.contactPhone || undefined,
            contactEmail: formData.contactEmail || undefined,
            features: formData.features.length > 0 ? formData.features : undefined,
            includes: formData.includes.length > 0 ? formData.includes : undefined,
            excludes: formData.excludes.length > 0 ? formData.excludes : undefined,
            availableFrom: formData.availableFrom || undefined,
            availableTo: formData.availableTo || undefined,
            maxGuests: formData.maxGuests ? parseInt(formData.maxGuests) : undefined,
        };
        activateMut.mutate(payload, {
            onSuccess: () => { setActivateModal(null); refetch(); },
        });
    };

    const addItem = (field, value, setter) => {
        if (!value.trim()) return;
        setFormData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
        setter('');
    };

    const removeItem = (field, index) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    };

    const addImage = () => {
        if (!imageUrl.trim()) return;
        setFormData(prev => ({ ...prev, roomImages: [...prev.roomImages, imageUrl.trim()] }));
        setImageUrl('');
    };

    const handleDeactivate = () => {
        if (!confirmDeactivate) return;
        deactivateMut.mutate(confirmDeactivate, {
            onSuccess: () => { setConfirmDeactivate(null); refetch(); },
        });
    };

    return (
        <div>
            {/* Subtitle */}
            <p className="ca-subtitle" style={{ marginBottom: 16 }}>
                Jami <strong>{services?.length ?? 0}</strong> ta sanatoriya xizmati — <strong>{totalActive}</strong> ta faol
            </p>

            {/* Toolbar */}
            <div className="ca-toolbar" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div className="ca-search">
                    <Search size={16} className="ca-search-icon" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Xizmat nomi bo'yicha qidirish..."
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 13, minWidth: 180 }}
                >
                    <option value="all">📁 Barcha kategoriyalar</option>
                    {mainCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon || '📁'} {cat.nameUz}</option>
                    ))}
                </select>
                {categoryFilter !== 'all' && subcategories.length > 0 && (
                    <select
                        value={subcategoryFilter}
                        onChange={e => setSubcategoryFilter(e.target.value)}
                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 13, minWidth: 180 }}
                    >
                        <option value="all">• Barcha yo'nalishlar</option>
                        {subcategories.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.icon || '•'} {sub.nameUz}</option>
                        ))}
                    </select>
                )}
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 13 }}
                >
                    <option value="all">Barchasi</option>
                    <option value="active">Faol</option>
                    <option value="inactive">Aktivlashtirilmagan</option>
                </select>
                <button className="ca-icon-btn" onClick={() => refetch()} title="Yangilash">
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="ca-loading"><Loader2 size={32} className="ca-spin" /><span>Yuklanmoqda...</span></div>
            ) : filtered.length === 0 ? (
                <div className="ca-empty">
                    <div className="ca-empty-icon"><Bed size={36} /></div>
                    <h3>Sanatoriya xizmatlari topilmadi</h3>
                    <p>Qidiruv yoki filtrni o'zgartiring.</p>
                </div>
            ) : (
                <div className="ca-table-wrap">
                    <table className="ca-table">
                        <thead>
                            <tr>
                                <th>Xizmat nomi</th>
                                <th>Turi</th>
                                <th>Kategoriya</th>
                                <th>Narx oraliq</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => {
                                const isActive = !!s.clinicService?.isActive;
                                const typeInfo = SERVICE_TYPE_LABELS[s.serviceType] || { label: s.serviceType, color: '#888' };
                                return (
                                    <tr key={s.id}>
                                        <td>
                                            <div className="ca-name-cell">
                                                <span className="main" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {isActive
                                                        ? <CircleCheckBig size={15} color="#10b981" />
                                                        : <Circle size={15} color="var(--text-muted)" />}
                                                    {s.nameUz}
                                                </span>
                                                {s.nameRu && <span className="sub">{s.nameRu}</span>}
                                                <span className="sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {s.durationMinutes > 0 && <><Clock size={11} /> {s.durationMinutes} daq</>}
                                                    {s.durationDays && <> · {s.durationDays} kun</>}
                                                    {s.capacity && <> · {s.capacity} kishi</>}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="ca-badge" style={{ fontSize: 10, background: `${typeInfo.color}18`, color: typeInfo.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                {typeInfo.icon} {typeInfo.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="ca-badge" style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--text-main)', fontSize: 11 }}>
                                                {s.category?.nameUz || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ color: 'var(--color-primary)' }}>
                                                {fmt(s.priceMin)} – {fmt(s.priceMax)}
                                            </strong>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                {fmt(s.priceRecommended)} / {PRICE_PER_LABELS[s.pricePer] || s.pricePer}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`ca-badge ${isActive ? 'active' : 'inactive'}`}>
                                                {isActive ? 'Faol' : 'Nofaol'}
                                            </span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="ca-actions-cell">
                                                {!isActive ? (
                                                    <button
                                                        className="ca-btn-primary"
                                                        style={{ fontSize: 11, padding: '4px 12px' }}
                                                        onClick={() => handleActivate(s)}
                                                        disabled={activateMut.isPending}
                                                    >
                                                        Aktivlashtirish
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="ca-icon-btn danger"
                                                        title="O'chirish"
                                                        onClick={() => setConfirmDeactivate(s.id)}
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Activate modal - Comprehensive Form ── */}
            {activateModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    overflowY: 'auto', padding: '20px 0',
                }} onClick={() => !activateMut.isPending && setActivateModal(null)}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16, padding: 0,
                        maxWidth: 700, width: '95%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column', margin: 'auto',
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{
                            padding: '18px 22px', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>Sanatoriya xizmatini aktivlashtirish</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{activateModal.nameUz}</div>
                            </div>
                            <button className="ca-icon-btn" onClick={() => setActivateModal(null)} disabled={activateMut.isPending}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Form Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                            {/* Basic Info */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>📝 Asosiy ma'lumotlar</h4>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Xizmat nomi (O'zbekcha) *</label>
                                    <input type="text" value={formData.customNameUz} onChange={e => setFormData(p => ({ ...p, customNameUz: e.target.value }))} placeholder="Lux xona - To'liq pansion" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Xizmat nomi (Ruscha)</label>
                                    <input type="text" value={formData.customNameRu} onChange={e => setFormData(p => ({ ...p, customNameRu: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Tavsif</label>
                                    <textarea value={formData.customDescription} onChange={e => setFormData(p => ({ ...p, customDescription: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13, resize: 'vertical' }} />
                                </div>
                            </div>

                            {/* Pricing */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>💰 Narx va chegirma</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Klinika narxi (so'm) *</label>
                                        <input type="number" value={formData.clinicPrice} onChange={e => setFormData(p => ({ ...p, clinicPrice: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Tavsiya: {fmt(activateModal.priceRecommended)}</div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><Percent size={12} /> Chegirma (%)</label>
                                        <input type="number" value={formData.discountPercent} onChange={e => setFormData(p => ({ ...p, discountPercent: e.target.value }))} min="0" max="100" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                    </div>
                                </div>
                                {formData.discountPercent && parseInt(formData.discountPercent) > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><Calendar size={12} /> Chegirma muddati</label>
                                        <input type="date" value={formData.discountValidUntil} onChange={e => setFormData(p => ({ ...p, discountValidUntil: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                    </div>
                                )}
                            </div>

                            {/* Room Details */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>🛏️ Xona ma'lumotlari</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><Bed size={12} /> Xona turi</label>
                                        <select value={formData.roomType} onChange={e => setFormData(p => ({ ...p, roomType: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}>
                                            <option value="">Tanlang...</option>
                                            <option value="Standart">Standart</option>
                                            <option value="Komfort">Komfort</option>
                                            <option value="Lux">Lux</option>
                                            <option value="VIP">VIP</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><Users size={12} /> Maksimal mehmonlar</label>
                                        <input type="number" value={formData.maxGuests} onChange={e => setFormData(p => ({ ...p, maxGuests: e.target.value }))} min="1" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><ImageIcon size={12} /> Xona rasmlari URL</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                        <button onClick={addImage} className="ca-btn-primary" style={{ padding: '10px 16px' }}><Plus size={14} /></button>
                                    </div>
                                    {formData.roomImages.length > 0 && (
                                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {formData.roomImages.map((img, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--bg-main)', borderRadius: 6, fontSize: 11 }}>
                                                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.slice(0, 20)}...</span>
                                                    <button onClick={() => removeItem('roomImages', i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={11} color="#ef4444" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Xona qulayliklari</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" value={newAmenity} onChange={e => setNewAmenity(e.target.value)} onKeyPress={e => e.key === 'Enter' && addItem('roomAmenities', newAmenity, setNewAmenity)} placeholder="WiFi, TV, Konditsioner..." style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                        <button onClick={() => addItem('roomAmenities', newAmenity, setNewAmenity)} className="ca-btn-primary" style={{ padding: '10px 16px' }}><Plus size={14} /></button>
                                    </div>
                                    {formData.roomAmenities.length > 0 && (
                                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {formData.roomAmenities.map((a, i) => (
                                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(0,201,167,0.1)', borderRadius: 6, fontSize: 12 }}>
                                                    {a}
                                                    <button onClick={() => removeItem('roomAmenities', i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Meal Plan */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>🍽️ Ovqatlanish</h4>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><Utensils size={12} /> Ovqatlanish tartibi</label>
                                    <select value={formData.mealPlan} onChange={e => setFormData(p => ({ ...p, mealPlan: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}>
                                        <option value="">Tanlang...</option>
                                        <option value="3-razlama">3-razlama ovqatlanish</option>
                                        <option value="To'liq pansion">To'liq pansion</option>
                                        <option value="Yarim pansion">Yarim pansion</option>
                                        <option value="Faqat nonushta">Faqat nonushta</option>
                                    </select>
                                </div>
                                {formData.mealPlan && (
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Ovqatlanish haqida</label>
                                        <textarea value={formData.mealDescription} onChange={e => setFormData(p => ({ ...p, mealDescription: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13, resize: 'vertical' }} />
                                    </div>
                                )}
                            </div>

                            {/* Location & Contact */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>📍 Joylashuv va aloqa</h4>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><MapPin size={12} /> Manzil</label>
                                    <input type="text" value={formData.locationAddress} onChange={e => setFormData(p => ({ ...p, locationAddress: e.target.value }))} placeholder="Toshkent sh., Chilonzor t." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><Phone size={12} /> Telefon</label>
                                        <input type="tel" value={formData.contactPhone} onChange={e => setFormData(p => ({ ...p, contactPhone: e.target.value }))} placeholder="+998 90 123 45 67" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}><Mail size={12} /> Email</label>
                                        <input type="email" value={formData.contactEmail} onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))} placeholder="info@sanatorium.uz" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Features */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>✨ Qo'shimcha imkoniyatlar</h4>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Maxsus xususiyatlar</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyPress={e => e.key === 'Enter' && addItem('features', newFeature, setNewFeature)} placeholder="Bassein, Sauna..." style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                        <button onClick={() => addItem('features', newFeature, setNewFeature)} className="ca-btn-primary" style={{ padding: '10px 16px' }}><Plus size={14} /></button>
                                    </div>
                                    {formData.features.length > 0 && (
                                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {formData.features.map((f, i) => (
                                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(59,130,246,0.1)', borderRadius: 6, fontSize: 12 }}>
                                                    {f}
                                                    <button onClick={() => removeItem('features', i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Narxga kiradi</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" value={newInclude} onChange={e => setNewInclude(e.target.value)} onKeyPress={e => e.key === 'Enter' && addItem('includes', newInclude, setNewInclude)} placeholder="Davolanish, Ovqatlanish..." style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                        <button onClick={() => addItem('includes', newInclude, setNewInclude)} className="ca-btn-primary" style={{ padding: '10px 16px' }}><Plus size={14} /></button>
                                    </div>
                                    {formData.includes.length > 0 && (
                                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {formData.includes.map((inc, i) => (
                                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: 6, fontSize: 12 }}>
                                                    {inc}
                                                    <button onClick={() => removeItem('includes', i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Narxga kirmaydi</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" value={newExclude} onChange={e => setNewExclude(e.target.value)} onKeyPress={e => e.key === 'Enter' && addItem('excludes', newExclude, setNewExclude)} placeholder="Transport, Ekskursiya..." style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }} />
                                        <button onClick={() => addItem('excludes', newExclude, setNewExclude)} className="ca-btn-primary" style={{ padding: '10px 16px' }}><Plus size={14} /></button>
                                    </div>
                                    {formData.excludes.length > 0 && (
                                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {formData.excludes.map((exc, i) => (
                                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, fontSize: 12 }}>
                                                    {exc}
                                                    <button onClick={() => removeItem('excludes', i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 22px', borderTop: '1px solid var(--border-color)',
                            display: 'flex', gap: 10, justifyContent: 'flex-end',
                        }}>
                            <button className="ca-btn-secondary" onClick={() => setActivateModal(null)} disabled={activateMut.isPending}>
                                Bekor qilish
                            </button>
                            <button
                                className="ca-btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={handleConfirmActivate}
                                disabled={activateMut.isPending}
                            >
                                {activateMut.isPending ? <Loader2 size={14} className="ca-spin" /> : <Check size={14} />}
                                Aktivlashtirish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Deactivate confirm modal ── */}
            {confirmDeactivate && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16, padding: 28,
                        maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                    }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Xizmatni o'chirish</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
                            Ushbu sanatoriya xizmati klinikangiz ro'yxatidan o'chiriladi. Istalgan vaqt qayta aktivlashtirish mumkin.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="ca-icon-btn" onClick={() => setConfirmDeactivate(null)}>Bekor</button>
                            <button
                                className="ca-btn-primary"
                                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                onClick={handleDeactivate}
                                disabled={deactivateMut.isPending}
                            >
                                O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
