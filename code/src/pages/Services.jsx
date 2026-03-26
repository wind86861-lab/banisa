import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Plus, LayoutGrid, List, ChevronRight, ChevronDown,
    Info, Trash2, Edit3, Eye,
    CheckCircle2, Clock, Beaker, AlertCircle,
    ArrowLeft, ArrowRight, X, Loader2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { categoriesApi, diagnosticsApi, surgicalApi, sanatoriumApi } from '../services/api';
import { EMPTY_SURGICAL_FORM, SURGICAL_STEPS } from './SurgicalConstants';
import SurgicalForm from './SurgicalForm';
import './Services.css';

const PRICE_FILTERS = [
    { value: 'all', label: 'Barcha narxlar' },
    { value: 'low', label: '50,000 UZS dan past', max: 50000 },
    { value: 'mid', label: '50,000 – 150,000', min: 50000, max: 150000 },
    { value: 'high', label: '150,000 dan yuqori', min: 150000 },
];

const EMPTY_FORM = {
    nameUz: '', nameRu: '', nameEn: '',
    parentCatId: '',
    categoryId: '',
    shortDescription: '', fullDescription: '',
    priceRecommended: '', priceMin: '', priceMax: '',
    durationMinutes: 15, resultTimeHours: 24,
    preparation: '', contraindications: '', sampleType: '',
    // Extended detail fields
    sampleVolume: '', resultFormat: '', processDescription: '',
    resultParameters: [],
    preparationJson: { fastingHours: '', waterAllowed: true, stopMedications: '', alcoholHours: '', smokingHours: '', exerciseRestriction: '', specialDiet: '', bestTime: '', documents: [], womenWarnings: '' },
    indicationsJson: { symptoms: [], diseases: [], preventive: '', mandatoryFor: [] },
    contraindicationsJson: { absolute: [], relative: [], temporary: [], warnings: [] },
    additionalInfo: { equipment: '', certifications: [], accuracy: '', experience: '', dailyCapacity: '' },
    bookingPolicy: { prepaymentRequired: false, cancellationPolicy: '', modificationPolicy: '' },
};



const Services = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const rootQuery = searchParams.get('root');

    // ── UI state ──────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState('table');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [priceFilter, setPriceFilter] = useState('all');
    const [expandedCats, setExpandedCats] = useState({});
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [selectedServices, setSelectedServices] = useState([]);
    const [activeService, setActiveService] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formStep, setFormStep] = useState(1);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    // ── Data state ────────────────────────────────────────────────────────────
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [catLoading, setCatLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showCatForm, setShowCatForm] = useState(false);
    const [catFormData, setCatFormData] = useState({ nameUz: '', parentId: '' });
    const [editCatId, setEditCatId] = useState(null);
    const [activeRootId, setActiveRootId] = useState(null);

    // ── Fetch categories ──────────────────────────────────────────────────────
    useEffect(() => {
        setCatLoading(true);
        categoriesApi.list()
            .then(data => {
                const cats = data || [];
                setCategories(cats);

                // Auto-select root based on query param or default to diagnostics
                const targetSlug = rootQuery || 'diagnostics';
                const targetRoot = cats.find(c => c.level === 0 && c.slug === targetSlug);

                if (targetRoot) {
                    setActiveRootId(targetRoot.id);
                } else {
                    const firstRoot = cats.find(c => c.level === 0);
                    if (firstRoot) setActiveRootId(firstRoot.id);
                }

                // Auto-expand top-level categories
                const expanded = {};
                cats.forEach(cat => { expanded[cat.id] = true; });
                setExpandedCats(expanded);
            })
            .catch(err => console.error('Categories error:', err))
            .finally(() => setCatLoading(false));
    }, [rootQuery]);

    // Update active root when query param changes after initial load
    useEffect(() => {
        if (categories.length > 0 && rootQuery) {
            const targetRoot = categories.find(c => c.level === 0 && c.slug === rootQuery);
            if (targetRoot && targetRoot.id !== activeRootId) {
                setActiveRootId(targetRoot.id);
                setSelectedCategory('all');
            }
        }
    }, [rootQuery, categories, activeRootId]);

    // ── Fetch services ────────────────────────────────────────────────────────
    const fetchServices = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const priceOpt = PRICE_FILTERS.find(f => f.value === priceFilter);
            const params = {
                page,
                limit: meta.limit,
                ...(searchQuery.length >= 2 && { search: searchQuery }),
                ...(selectedCategory !== 'all' && { categoryId: selectedCategory }),
                ...(priceOpt?.min && { minPrice: priceOpt.min }),
                ...(priceOpt?.max && { maxPrice: priceOpt.max }),
            };

            const isOps = rootQuery === 'operations';
            const isSan = rootQuery === 'sanatorium';
            const api = isSan ? sanatoriumApi : isOps ? surgicalApi : diagnosticsApi;

            const result = await api.list(params);
            setServices(result.data || []);
            setMeta(result.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
        } catch (err) {
            setError(err.message || 'Ma\'lumotlarni yuklashda xatolik');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedCategory, priceFilter, meta.limit, rootQuery]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => fetchServices(1), 400);
        return () => clearTimeout(timer);
    }, [fetchServices]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const toggleCat = (id) => setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));

    const openCreate = () => {
        setEditingId(null);

        let parentId = '';
        let catId = '';

        if (selectedCategory !== 'all') {
            // Find if selectedCategory is L1 or L2
            const findNode = (nodes, id) => {
                for (const node of nodes) {
                    if (node.id === id) return node;
                    if (node.children) {
                        const found = findNode(node.children, id);
                        if (found) return found;
                    }
                }
                return null;
            };

            const selected = findNode(categories, selectedCategory);
            if (selected) {
                if (selected.level === 1) {
                    parentId = selected.id;
                } else if (selected.level === 2) {
                    catId = selected.id;
                    parentId = selected.parentId;
                }
            }
        }

        const isOps = rootQuery === 'operations';
        const isSan = rootQuery === 'sanatorium';
        const empty = (isOps || isSan) ? EMPTY_SURGICAL_FORM : EMPTY_FORM;

        setFormData({ ...empty, parentCatId: parentId, categoryId: catId });
        setFormStep(1);
        setShowForm(true);
    };

    const openEdit = (service, e) => {
        e?.stopPropagation();
        setEditingId(service.id);

        // Find parent category ID
        const findParentId = (nodes, id) => {
            for (const node of nodes) {
                if (node.children?.some(c => c.id === id)) return node.id;
                if (node.children) {
                    const found = findParentId(node.children, id);
                    if (found) return found;
                }
            }
            return '';
        };
        const parentId = findParentId(categories, service.categoryId);

        setFormData({
            nameUz: service.nameUz || '',
            nameRu: service.nameRu || '',
            nameEn: service.nameEn || '',
            parentCatId: parentId,
            categoryId: service.categoryId || '',
            shortDescription: service.shortDescription || '',
            fullDescription: service.fullDescription || '',
            priceRecommended: service.priceRecommended || '',
            priceMin: service.priceMin || '',
            priceMax: service.priceMax || '',
            durationMinutes: service.durationMinutes || 15,
            resultTimeHours: service.resultTimeHours || 24,
            preparation: service.preparation || '',
            contraindications: service.contraindications || '',
            sampleType: service.sampleType || '',
            sampleVolume: service.sampleVolume || '',
            resultFormat: service.resultFormat || '',
            processDescription: service.processDescription || '',
            resultParameters: service.resultParameters || [],
            preparationJson: service.preparationJson || EMPTY_FORM.preparationJson,
            indicationsJson: service.indicationsJson || EMPTY_FORM.indicationsJson,
            contraindicationsJson: service.contraindicationsJson || EMPTY_FORM.contraindicationsJson,
            additionalInfo: service.additionalInfo || EMPTY_FORM.additionalInfo,
            bookingPolicy: service.bookingPolicy || EMPTY_FORM.bookingPolicy,
        });
        setFormStep(1);
        setShowForm(true);
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCreateCategory = async () => {
        if (!catFormData.nameUz || (!editCatId && !catFormData.parentId)) {
            alert('Iltimos, nomni kiriting');
            return;
        }
        try {
            const payload = {
                nameUz: catFormData.nameUz,
                slug: catFormData.nameUz.toLowerCase().replace(/\s+/g, '-'),
            };

            if (editCatId) {
                await categoriesApi.update(editCatId, payload);
                alert('Kategoriya yangilandi!');
            } else {
                await categoriesApi.create({
                    ...payload,
                    parentId: catFormData.parentId,
                    level: 2,
                    icon: '•'
                });
                alert('Kategoriya yaratildi!');
            }

            setShowCatForm(false);
            setEditCatId(null);
            setCatFormData({ nameUz: '', parentId: '' });
            // Refresh categories
            const data = await categoriesApi.list();
            setCategories(data || []);
        } catch (err) {
            alert('Kategoriyada xatolik: ' + err.message);
        }
    };

    const handleDeleteCategory = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Haqiqatdan ham ushbu kategoriyani o\'chirmoqchimisiz?')) return;
        try {
            await categoriesApi.delete(id);
            alert('Kategoriya o\'chirildi');
            const data = await categoriesApi.list();
            setCategories(data || []);
        } catch (err) {
            alert('O\'chirishda xatolik: ' + err.message);
        }
    };

    const handleSave = async () => {
        // Frontend validation
        const errors = [];
        if (!formData.nameUz || formData.nameUz.trim().length < 3) {
            errors.push('Xizmat nomi (O\'zbekcha) kamida 3 ta belgidan iborat bo\'lishi kerak');
        }
        if (!formData.categoryId) {
            errors.push('Kategoriya tanlanmagan');
        }
        if (!formData.priceRecommended || isNaN(Number(formData.priceRecommended)) || Number(formData.priceRecommended) < 0) {
            errors.push('Tavsiya etilgan narx noto\'g\'ri');
        }
        if (!formData.priceMin || isNaN(Number(formData.priceMin)) || Number(formData.priceMin) < 0) {
            errors.push('Minimal narx noto\'g\'ri');
        }
        if (!formData.priceMax || isNaN(Number(formData.priceMax)) || Number(formData.priceMax) < 0) {
            errors.push('Maksimal narx noto\'g\'ri');
        }
        if (!formData.durationMinutes || isNaN(Number(formData.durationMinutes)) || Number(formData.durationMinutes) < 1) {
            errors.push('Davomiyligi noto\'g\'ri');
        }
        if (!formData.resultTimeHours || isNaN(Number(formData.resultTimeHours)) || Number(formData.resultTimeHours) < 0.5) {
            errors.push('Natija vaqti noto\'g\'ri');
        }

        const priceMin = Number(formData.priceMin);
        const priceRec = Number(formData.priceRecommended);
        const priceMax = Number(formData.priceMax);
        if (priceMin > priceRec || priceRec > priceMax) {
            errors.push('Narxlar: min <= tavsiya <= max bo\'lishi kerak');
        }

        if (errors.length > 0) {
            alert('Xatoliklar:\n\n' + errors.join('\n'));
            return;
        }

        setSaving(true);
        try {
            const isOps = rootQuery === 'operations';
            const isSan = rootQuery === 'sanatorium';
            const api = isSan ? sanatoriumApi : isOps ? surgicalApi : diagnosticsApi;

            const payload = { ...formData };

            // Convert numbers
            ['priceRecommended', 'priceMin', 'priceMax', 'durationMinutes', 'resultTimeHours', 'recoveryDays', 'hospitalizationDays', 'icuDays', 'fastingHours', 'minSurgeonExperience', 'successRate']
                .forEach(key => {
                    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
                        payload[key] = Number(payload[key]);
                    }
                });

            // Remove UI-only fields that aren't in the database schema
            delete payload.parentCatId;

            // Clean empty strings to undefined for optional fields
            ['shortDescription', 'fullDescription', 'preparation', 'contraindications', 'sampleType', 'imageUrl', 'nameRu', 'nameEn', 'sampleVolume', 'resultFormat', 'processDescription'].forEach(key => {
                if (payload[key] === '') payload[key] = undefined;
            });

            // Convert preparationJson number fields
            if (payload.preparationJson) {
                const pj = { ...payload.preparationJson };
                ['fastingHours', 'alcoholHours', 'smokingHours'].forEach(k => {
                    if (pj[k] !== undefined && pj[k] !== '' && pj[k] !== null) pj[k] = Number(pj[k]);
                    else delete pj[k];
                });
                payload.preparationJson = pj;
            }

            // Convert additionalInfo number fields
            if (payload.additionalInfo?.dailyCapacity !== undefined) {
                const ai = { ...payload.additionalInfo };
                if (ai.dailyCapacity !== '' && ai.dailyCapacity !== null) ai.dailyCapacity = Number(ai.dailyCapacity);
                else delete ai.dailyCapacity;
                payload.additionalInfo = ai;
            }

            // Remove empty JSON objects to avoid sending blank data
            if (payload.resultParameters?.length === 0) payload.resultParameters = undefined;
            if (payload.indicationsJson && !payload.indicationsJson.symptoms?.length && !payload.indicationsJson.diseases?.length && !payload.indicationsJson.preventive && !payload.indicationsJson.mandatoryFor?.length) payload.indicationsJson = undefined;
            if (payload.contraindicationsJson && !payload.contraindicationsJson.absolute?.length && !payload.contraindicationsJson.relative?.length && !payload.contraindicationsJson.temporary?.length && !payload.contraindicationsJson.warnings?.length) payload.contraindicationsJson = undefined;

            if (editingId) {
                await api.update(editingId, payload);
            } else {
                await api.create(payload);
            }
            setShowForm(false);
            fetchServices(meta.page);
        } catch (err) {
            alert(err.message || 'Saqlashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm('Xizmatni o\'chirmoqchimisiz?')) return;
        try {
            await diagnosticsApi.delete(id);
            fetchServices(meta.page);
            if (activeService?.id === id) setActiveService(null);
        } catch (err) {
            alert(err.message || 'O\'chirishda xatolik');
        }
    };

    const toggleSelect = (id) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };



    const activeRoot = categories.find(c => c.id === activeRootId);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={`services-container ${isSidebarMinimized ? 'sidebar-minimized' : ''}`}>
            {/* PAGE HEADER */}
            <div className="services-header">
                <div>
                    <h1>{activeRoot?.icon || '🔬'} {activeRoot?.nameUz || 'Katalog'}</h1>
                    <p>Super Admin Panel › {activeRoot?.nameUz || 'Katalog'} Boshqaruvi</p>
                </div>
                <button className="btn-add-service" onClick={openCreate}>
                    <Plus size={20} />
                    <span>Yangi xizmat qo'shish</span>
                </button>
            </div>

            <div className="services-layout">
                {/* CATEGORY SIDEBAR */}
                <aside className={`cat-sidebar ${isSidebarMinimized ? 'minimized' : ''}`}>
                    <div className="sidebar-header-row">
                        {!isSidebarMinimized && <div className="sidebar-title">KATEGORIYALAR</div>}
                        <button
                            className="btn-minimize"
                            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                            title={isSidebarMinimized ? 'Kengaytirish' : 'Kichraytirish'}
                        >
                            {isSidebarMinimized
                                ? <ChevronRight size={18} />
                                : <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />}
                        </button>
                    </div>

                    <div className="cat-tree">


                        {catLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                                <Loader2 size={20} className="spin" />
                            </div>
                        ) : (
                            (() => {
                                // Show children of active root
                                const mainGroups = activeRoot ? activeRoot.children : [];

                                return mainGroups.map(group => (
                                    <div key={group.id} className="cat-group">
                                        {/* Level 1: Lab / Instrumental */}
                                        <div
                                            className="cat-level-1"
                                            onClick={() => toggleCat(group.id)}
                                        >
                                            <span className="icon">{group.icon || '📂'}</span>
                                            {!isSidebarMinimized && <span className="name">{group.nameUz}</span>}
                                            {!isSidebarMinimized && (
                                                <span className="arrow-icon">
                                                    {expandedCats[group.id]
                                                        ? <ChevronDown size={14} />
                                                        : <ChevronRight size={14} />
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        {/* Level 2: Specific Categories */}
                                        {expandedCats[group.id] && !isSidebarMinimized && (
                                            <div className="cat-children">
                                                {group.children?.map(sub => (
                                                    <div
                                                        key={sub.id}
                                                        className={`cat-level-2 ${selectedCategory === sub.id ? 'active' : ''}`}
                                                        onClick={() => setSelectedCategory(sub.id)}
                                                    >
                                                        <span className="icon">{sub.icon || '•'}</span>
                                                        <span className="name">{sub.nameUz}</span>
                                                        <div className="cat-actions-mini">
                                                            <button
                                                                className="btn-tiny"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditCatId(sub.id);
                                                                    setCatFormData({ nameUz: sub.nameUz, parentId: group.id });
                                                                    setShowCatForm(true);
                                                                }}
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                            <button
                                                                className="btn-tiny delete"
                                                                onClick={(e) => handleDeleteCategory(sub.id, e)}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    className="btn-add-cat-sidebar"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCatFormData({ nameUz: '', parentId: group.id });
                                                        setShowCatForm(true);
                                                    }}
                                                >
                                                    <Plus size={14} /> Qo'shish
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ));
                            })()
                        )}
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="catalog-content">
                    {/* Toolbar */}
                    <div className="catalog-toolbar">
                        <div className="search-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Xizmat nomi bo'yicha qidirish..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
                                {PRICE_FILTERS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                            <button className="btn-icon" title="Yangilash" onClick={() => fetchServices(meta.page)}>
                                <RefreshCw size={18} />
                            </button>
                            <div className="view-toggle">
                                <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
                                    <List size={20} />
                                </button>
                                <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>
                                    <LayoutGrid size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedServices.length > 0 && (
                        <div className="bulk-actions-bar">
                            <span>{selectedServices.length} tanlangan</span>
                            <button className="btn-bulk-cancel" onClick={() => setSelectedServices([])}>Bekor qilish</button>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="error-banner">
                            <AlertCircle size={18} /> {error}
                            <button onClick={() => fetchServices(meta.page)}>Qayta urinish</button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="loading-state">
                            <Loader2 size={36} className="spin" />
                            <p>Yuklanmoqda...</p>
                        </div>
                    ) : services.length === 0 ? (
                        <div className="empty-state">
                            <span>🔬</span>
                            <h3>Xizmatlar topilmadi</h3>
                            <p>Qidiruv yoki filtrni o'zgartiring yoki yangi xizmat qo'shing.</p>
                            <button className="btn-add-service" onClick={openCreate}>
                                <Plus size={18} /> Yangi xizmat
                            </button>
                        </div>
                    ) : (
                        <div className="catalog-view">
                            {viewMode === 'table' ? (
                                <table className="master-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}>
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => setSelectedServices(e.target.checked ? services.map(s => s.id) : [])}
                                                    checked={selectedServices.length === services.length && services.length > 0}
                                                />
                                            </th>
                                            <th>Xizmat nomi</th>
                                            <th>Kategoriya</th>
                                            <th>Tavsiya narx</th>
                                            <th>Holati</th>
                                            <th>Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {services.map(service => (
                                            <tr key={service.id} onClick={() => setActiveService(service)}>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedServices.includes(service.id)}
                                                        onChange={() => toggleSelect(service.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="service-name-cell">
                                                        <span className="main-name">🧪 {service.nameUz}</span>
                                                        {service.nameRu && <span className="meta sub-name">{service.nameRu}</span>}
                                                        <span className="meta">⏱️ {service.durationMinutes} min • 📊 {service.resultTimeHours}h</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="cat-badge">
                                                        {service.category?.icon || '📁'} {service.category?.nameUz || '—'}
                                                    </span>
                                                </td>
                                                <td className="price-cell">
                                                    <strong>{(service.priceRecommended || 0).toLocaleString()} UZS</strong>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${service.isActive ? 'active' : 'inactive'}`}>
                                                        {service.isActive ? '✅ Faol' : '⭕ Nofaol'}
                                                    </span>
                                                </td>
                                                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                                    <button className="btn-icon" title="Tahrirlash" onClick={(e) => openEdit(service, e)}>
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button className="btn-icon danger" title="O'chirish" onClick={(e) => handleDelete(service.id, e)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="cards-grid">
                                    {services.map(service => (
                                        <div key={service.id} className="service-card" onClick={() => setActiveService(service)}>
                                            <div className="card-top">
                                                <span className="card-icon">🧪</span>
                                                <span className={`status-dot ${service.isActive ? 'active' : ''}`} />
                                            </div>
                                            <h3>{service.nameUz}</h3>
                                            {service.nameRu && <p className="card-sub">{service.nameRu}</p>}
                                            <span className="cat-badge">
                                                {service.category?.icon || '📁'} {service.category?.nameUz || '—'}
                                            </span>
                                            <div className="card-meta">
                                                <span><Clock size={14} /> {service.durationMinutes} min</span>
                                                <span><Beaker size={14} /> {service.resultTimeHours}h</span>
                                            </div>
                                            <div className="card-price">
                                                {(service.priceRecommended || 0).toLocaleString()} <span>UZS</span>
                                            </div>
                                            <div className="card-actions">
                                                <button className="btn-view" onClick={(e) => { e.stopPropagation(); setActiveService(service); }}>Batafsil</button>
                                                <button className="btn-edit" onClick={(e) => openEdit(service, e)}>Tahrirlash</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {meta.totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        disabled={meta.page <= 1}
                                        onClick={() => fetchServices(meta.page - 1)}
                                    >
                                        <ArrowLeft size={16} /> Oldingi
                                    </button>
                                    <span>{meta.page} / {meta.totalPages} ({meta.total} ta)</span>
                                    <button
                                        disabled={meta.page >= meta.totalPages}
                                        onClick={() => fetchServices(meta.page + 1)}
                                    >
                                        Keyingi <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* DETAIL DRAWER */}
            <AnimatePresence>
                {activeService && (
                    <>
                        <motion.div
                            className="drawer-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveService(null)}
                        />
                        <motion.div
                            className="service-drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                        >
                            <div className="drawer-header">
                                <h2>{activeService.nameUz}</h2>
                                <button className="btn-close" onClick={() => setActiveService(null)}><X size={24} /></button>
                            </div>
                            <div className="drawer-body">
                                <div className="detail-section">
                                    <div className="badge-row">
                                        <span className="cat-badge-lg">
                                            {activeService.category?.icon || '📁'} {activeService.category?.nameUz || '—'}
                                        </span>
                                        <span className={`status-badge ${activeService.isActive ? 'active' : ''}`}>
                                            {activeService.isActive ? '✅ Faol' : '⭕ Nofaol'}
                                        </span>
                                    </div>
                                </div>

                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Davomiyligi</label>
                                        <span>{activeService.durationMinutes} daqiqa</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Natija vaqti</label>
                                        <span>{activeService.resultTimeHours} soat</span>
                                    </div>
                                    {activeService.sampleType && (
                                        <div className="info-item">
                                            <label>Namuna turi</label>
                                            <span>{activeService.sampleType}</span>
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <label>Yaratilgan</label>
                                        <span>{new Date(activeService.createdAt).toLocaleDateString('uz-UZ')}</span>
                                    </div>
                                </div>

                                {activeService.shortDescription && (
                                    <div className="detail-section">
                                        <h4>Tavsifi</h4>
                                        <p className="desc-text">{activeService.shortDescription}</p>
                                    </div>
                                )}

                                <div className="pricing-box">
                                    <label>Tavsiya etilgan narx</label>
                                    <div className="main-price">{(activeService.priceRecommended || 0).toLocaleString()} UZS</div>
                                </div>

                                {activeService.preparation && (
                                    <div className="alert-box info">
                                        <div className="label"><Info size={16} /> Tayyorgarlik ko'rsatmalari</div>
                                        <p>{activeService.preparation}</p>
                                    </div>
                                )}
                                {activeService.contraindications && (
                                    <div className="alert-box warning">
                                        <div className="label"><AlertCircle size={16} /> Qarshi ko'rsatmalar</div>
                                        <p>{activeService.contraindications}</p>
                                    </div>
                                )}
                            </div>
                            <div className="drawer-footer">
                                <button className="btn-edit-full" onClick={(e) => { openEdit(activeService, e); setActiveService(null); }}>
                                    <Edit3 size={18} /> Tahrirlash
                                </button>
                                <button className="btn-delete" onClick={(e) => handleDelete(activeService.id, e)}>
                                    <Trash2 size={18} /> O'chirish
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ADD / EDIT MODAL FORM */}
            <AnimatePresence>
                {showForm && (
                    <div className="modal-overlay">
                        <motion.div
                            className="form-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="form-modal-header">
                                <h2>{editingId ? 'Xizmatni tahrirlash' : 'Yangi xizmat qo\'shish'}</h2>
                                <button className="btn-close" onClick={() => setShowForm(false)}><X size={22} /></button>
                            </div>

                            {(rootQuery === 'operations' || rootQuery === 'sanatorium') ? (
                                <SurgicalForm
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleFormChange={handleFormChange}
                                    onSave={handleSave}
                                    onCancel={() => setShowForm(false)}
                                    saving={saving}
                                    categories={categories}
                                />
                            ) : (
                                <>
                                    <div className="form-steps">
                                        {['Asosiy', 'Narx & Vaqt', 'Texnik', 'Tayyorgarlik', 'Indikatsiya', 'Qo\'shimcha'].map((label, i) => (
                                            <div key={i} className={`step ${formStep >= i + 1 ? 'active' : ''}`} onClick={() => setFormStep(i + 1)}>
                                                {i + 1}. {label}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="form-content">
                                        {/* ── Step 1: Asosiy ── */}
                                        {formStep === 1 && (
                                            <div className="step-content">
                                                <h3>Asosiy Ma'lumotlar</h3>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Nomi (UZ) *</label>
                                                        <input type="text" placeholder="Masalan: Qon klinik tahlili" value={formData.nameUz} onChange={(e) => handleFormChange('nameUz', e.target.value)} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Nomi (RU)</label>
                                                        <input type="text" placeholder="Общий анализ крови" value={formData.nameRu} onChange={(e) => handleFormChange('nameRu', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Nomi (EN)</label>
                                                    <input type="text" placeholder="Complete Blood Count" value={formData.nameEn} onChange={(e) => handleFormChange('nameEn', e.target.value)} />
                                                </div>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Asosiy Kategoriya *</label>
                                                        <select value={formData.parentCatId} onChange={(e) => { const pId = e.target.value; setFormData(prev => ({ ...prev, parentCatId: pId, categoryId: '' })); }}>
                                                            <option value="">Tanlang...</option>
                                                            {(() => { const ar = categories.find(c => c.id === activeRootId); return (ar?.children || []).map(cat => (<option key={cat.id} value={cat.id}>{cat.icon || '📁'} {cat.nameUz}</option>)); })()}
                                                        </select>
                                                    </div>
                                                    <div className="col">
                                                        <label>Yo'nalish (Sub-kategoriya) *</label>
                                                        <select value={formData.categoryId} onChange={(e) => handleFormChange('categoryId', e.target.value)} disabled={!formData.parentCatId}>
                                                            <option value="">Tanlang...</option>
                                                            {(() => { const ar = categories.find(c => c.id === activeRootId); const p = (ar?.children || []).find(c => c.id === formData.parentCatId); return p?.children?.map(sub => (<option key={sub.id} value={sub.id}>{sub.icon || '•'} {sub.nameUz}</option>)) || []; })()}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Qisqa tavsif (max 200 belgi)</label>
                                                    <textarea rows={2} maxLength={200} value={formData.shortDescription} onChange={(e) => handleFormChange('shortDescription', e.target.value)} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Batafsil tavsif</label>
                                                    <textarea rows={4} placeholder="Nima uchun kerak, nimani aniqlaydi..." value={formData.fullDescription} onChange={(e) => handleFormChange('fullDescription', e.target.value)} />
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Step 2: Narx & Vaqt ── */}
                                        {formStep === 2 && (
                                            <div className="step-content">
                                                <h3>Narx va Vaqt</h3>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Minimal narx (UZS) *</label>
                                                        <input type="number" min="0" step="1000" placeholder="50000" value={formData.priceMin} onChange={(e) => handleFormChange('priceMin', e.target.value)} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Tavsiya narx (UZS) *</label>
                                                        <input type="number" min="0" step="1000" placeholder="75000" value={formData.priceRecommended} onChange={(e) => handleFormChange('priceRecommended', e.target.value)} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Maksimal narx (UZS) *</label>
                                                        <input type="number" min="0" step="1000" placeholder="100000" value={formData.priceMax} onChange={(e) => handleFormChange('priceMax', e.target.value)} />
                                                    </div>
                                                </div>
                                                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '-8px', marginBottom: '12px' }}>
                                                    Narxlar: min ≤ tavsiya ≤ max bo'lishi kerak
                                                </small>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Davomiyligi (daqiqa)</label>
                                                        <input type="number" value={formData.durationMinutes} onChange={(e) => handleFormChange('durationMinutes', e.target.value)} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Natija vaqti (soat)</label>
                                                        <input type="number" step="0.5" value={formData.resultTimeHours} onChange={(e) => handleFormChange('resultTimeHours', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Step 3: Texnik ma'lumotlar ── */}
                                        {formStep === 3 && (
                                            <div className="step-content">
                                                <h3>Texnik Ma'lumotlar</h3>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Namuna turi</label>
                                                        <input type="text" placeholder="Venoz qon, Siydik..." value={formData.sampleType} onChange={(e) => handleFormChange('sampleType', e.target.value)} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Namuna miqdori</label>
                                                        <input type="text" placeholder="5 ml" value={formData.sampleVolume} onChange={(e) => handleFormChange('sampleVolume', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Natija formati</label>
                                                    <input type="text" placeholder="PDF, Online, Qog'oz" value={formData.resultFormat} onChange={(e) => handleFormChange('resultFormat', e.target.value)} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Jarayon tavsifi (Qanday o'tadi)</label>
                                                    <textarea rows={4} placeholder="Bemor qo'lidan qon olinadi, probirkaga solinadi..." value={formData.processDescription} onChange={(e) => handleFormChange('processDescription', e.target.value)} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Natija parametrlari</label>
                                                    <small style={{ color: '#888', display: 'block', marginBottom: 8 }}>Har bir parametr uchun nom, tavsif va normal diapazonni kiriting</small>
                                                    {(formData.resultParameters || []).map((param, idx) => (
                                                        <div key={idx} className="form-group row" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                                                            <div className="col">
                                                                <input type="text" placeholder="Parametr nomi" value={param.name || ''} onChange={(e) => { const arr = [...formData.resultParameters]; arr[idx] = { ...arr[idx], name: e.target.value }; handleFormChange('resultParameters', arr); }} />
                                                            </div>
                                                            <div className="col">
                                                                <input type="text" placeholder="Normal diapazon" value={param.normalRange || ''} onChange={(e) => { const arr = [...formData.resultParameters]; arr[idx] = { ...arr[idx], normalRange: e.target.value }; handleFormChange('resultParameters', arr); }} />
                                                            </div>
                                                            <button className="btn-icon danger" style={{ marginBottom: 4 }} onClick={() => { const arr = formData.resultParameters.filter((_, i) => i !== idx); handleFormChange('resultParameters', arr); }}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => handleFormChange('resultParameters', [...(formData.resultParameters || []), { name: '', description: '', normalRange: '' }])}>
                                                        <Plus size={14} /> Parametr qo'shish
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Step 4: Tayyorgarlik ── */}
                                        {formStep === 4 && (
                                            <div className="step-content">
                                                <h3>Tayyorgarlik Ko'rsatmalari</h3>
                                                <div className="form-group">
                                                    <label>Umumiy tayyorgarlik (matn)</label>
                                                    <textarea rows={3} placeholder="- Och qoringa 6-8 soat kelish kerak..." value={formData.preparation} onChange={(e) => handleFormChange('preparation', e.target.value)} />
                                                </div>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Och qorin (soat)</label>
                                                        <input type="number" min="0" max="24" placeholder="8" value={formData.preparationJson?.fastingHours || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, fastingHours: e.target.value } }))} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Suv ichish mumkinmi?</label>
                                                        <select value={formData.preparationJson?.waterAllowed === false ? 'no' : 'yes'} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, waterAllowed: e.target.value === 'yes' } }))}>
                                                            <option value="yes">Ha</option>
                                                            <option value="no">Yo'q</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Alkogol cheklovi (soat oldin)</label>
                                                        <input type="number" min="0" placeholder="48" value={formData.preparationJson?.alcoholHours || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, alcoholHours: e.target.value } }))} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Chekish cheklovi (soat oldin)</label>
                                                        <input type="number" min="0" placeholder="2" value={formData.preparationJson?.smokingHours || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, smokingHours: e.target.value } }))} />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Dorilarni to'xtatish</label>
                                                    <input type="text" placeholder="Aspirin, antikoagulyantlar..." value={formData.preparationJson?.stopMedications || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, stopMedications: e.target.value } }))} />
                                                </div>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Eng yaxshi vaqt</label>
                                                        <input type="text" placeholder="Ertalab 8:00-10:00" value={formData.preparationJson?.bestTime || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, bestTime: e.target.value } }))} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Maxsus dieta</label>
                                                        <input type="text" placeholder="Yog'li ovqat iste'mol qilmaslik" value={formData.preparationJson?.specialDiet || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, specialDiet: e.target.value } }))} />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Jismoniy mashqlar cheklovi</label>
                                                    <input type="text" placeholder="24 soat oldin og'ir sport qilmaslik" value={formData.preparationJson?.exerciseRestriction || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, exerciseRestriction: e.target.value } }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Ayollar uchun ogohlantirish</label>
                                                    <textarea rows={2} placeholder="Homiladorlik, hayz davri..." value={formData.preparationJson?.womenWarnings || ''} onChange={(e) => setFormData(p => ({ ...p, preparationJson: { ...p.preparationJson, womenWarnings: e.target.value } }))} />
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Step 5: Indikatsiya & Kontraindikatsiya ── */}
                                        {formStep === 5 && (
                                            <div className="step-content">
                                                <h3>Indikatsiya va Kontraindikatsiya</h3>
                                                <div className="form-group">
                                                    <label>Belgilar (qachon kerak) — vergul bilan ajrating</label>
                                                    <textarea rows={2} placeholder="Zaiflik, Bosh og'rig'i, Tez charchash..." value={(formData.indicationsJson?.symptoms || []).join(', ')} onChange={(e) => setFormData(p => ({ ...p, indicationsJson: { ...p.indicationsJson, symptoms: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Kasalliklar uchun tavsiya — vergul bilan ajrating</label>
                                                    <textarea rows={2} placeholder="Anemiya, Diabet, Tireoid kasalliklari..." value={(formData.indicationsJson?.diseases || []).join(', ')} onChange={(e) => setFormData(p => ({ ...p, indicationsJson: { ...p.indicationsJson, diseases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Kimlar uchun majburiy — vergul bilan ajrating</label>
                                                    <input type="text" placeholder="Homiladorlar, Operatsiya oldinlari..." value={(formData.indicationsJson?.mandatoryFor || []).join(', ')} onChange={(e) => setFormData(p => ({ ...p, indicationsJson: { ...p.indicationsJson, mandatoryFor: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Profilaktik tekshiruv sifatida</label>
                                                    <input type="text" placeholder="Yiliga 1 marta tavsiya etiladi" value={formData.indicationsJson?.preventive || ''} onChange={(e) => setFormData(p => ({ ...p, indicationsJson: { ...p.indicationsJson, preventive: e.target.value } }))} />
                                                </div>
                                                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                                <h3>Kontraindikatsiya</h3>
                                                <div className="form-group">
                                                    <label>Umumiy matn</label>
                                                    <textarea rows={2} placeholder="- Homiladorlik..." value={formData.contraindications} onChange={(e) => handleFormChange('contraindications', e.target.value)} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Absolyut (mutlaqo mumkin emas) — vergul bilan</label>
                                                    <input type="text" placeholder="Og'ir allergiya..." value={(formData.contraindicationsJson?.absolute || []).join(', ')} onChange={(e) => setFormData(p => ({ ...p, contraindicationsJson: { ...p.contraindicationsJson, absolute: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Nisbiy (ehtiyotkorlik bilan) — vergul bilan</label>
                                                    <input type="text" placeholder="Qon ketish xavfi..." value={(formData.contraindicationsJson?.relative || []).join(', ')} onChange={(e) => setFormData(p => ({ ...p, contraindicationsJson: { ...p.contraindicationsJson, relative: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Vaqtinchalik (keyinroq mumkin) — vergul bilan</label>
                                                    <input type="text" placeholder="Infeksion kasallik davri..." value={(formData.contraindicationsJson?.temporary || []).join(', ')} onChange={(e) => setFormData(p => ({ ...p, contraindicationsJson: { ...p.contraindicationsJson, temporary: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Step 6: Qo'shimcha ── */}
                                        {formStep === 6 && (
                                            <div className="step-content">
                                                <h3>Qo'shimcha Ma'lumotlar</h3>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Zamonaviy uskunalar</label>
                                                        <input type="text" placeholder="Siemens Atellica..." value={formData.additionalInfo?.equipment || ''} onChange={(e) => setFormData(p => ({ ...p, additionalInfo: { ...p.additionalInfo, equipment: e.target.value } }))} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Aniqlik foizi</label>
                                                        <input type="text" placeholder="99.5%" value={formData.additionalInfo?.accuracy || ''} onChange={(e) => setFormData(p => ({ ...p, additionalInfo: { ...p.additionalInfo, accuracy: e.target.value } }))} />
                                                    </div>
                                                </div>
                                                <div className="form-group row">
                                                    <div className="col">
                                                        <label>Tajriba</label>
                                                        <input type="text" placeholder="15 yillik tajriba" value={formData.additionalInfo?.experience || ''} onChange={(e) => setFormData(p => ({ ...p, additionalInfo: { ...p.additionalInfo, experience: e.target.value } }))} />
                                                    </div>
                                                    <div className="col">
                                                        <label>Kunlik sig'im</label>
                                                        <input type="number" min="0" placeholder="500" value={formData.additionalInfo?.dailyCapacity || ''} onChange={(e) => setFormData(p => ({ ...p, additionalInfo: { ...p.additionalInfo, dailyCapacity: e.target.value } }))} />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Sertifikatlar — vergul bilan</label>
                                                    <input type="text" placeholder="ISO 15189, CAP..." value={(formData.additionalInfo?.certifications || []).join(', ')} onChange={(e) => setFormData(p => ({ ...p, additionalInfo: { ...p.additionalInfo, certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))} />
                                                </div>
                                                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                                <h3>Buyurtma siyosati</h3>
                                                <div className="form-group">
                                                    <label>Oldindan to'lov kerakmi?</label>
                                                    <select value={formData.bookingPolicy?.prepaymentRequired ? 'yes' : 'no'} onChange={(e) => setFormData(p => ({ ...p, bookingPolicy: { ...p.bookingPolicy, prepaymentRequired: e.target.value === 'yes' } }))}>
                                                        <option value="no">Yo'q</option>
                                                        <option value="yes">Ha</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Bekor qilish shartlari</label>
                                                    <input type="text" placeholder="24 soat oldin bepul bekor qilish..." value={formData.bookingPolicy?.cancellationPolicy || ''} onChange={(e) => setFormData(p => ({ ...p, bookingPolicy: { ...p.bookingPolicy, cancellationPolicy: e.target.value } }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>O'zgartirish shartlari</label>
                                                    <input type="text" placeholder="12 soat oldin o'zgartirish mumkin..." value={formData.bookingPolicy?.modificationPolicy || ''} onChange={(e) => setFormData(p => ({ ...p, bookingPolicy: { ...p.bookingPolicy, modificationPolicy: e.target.value } }))} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-footer">
                                        <button
                                            className="btn-secondary"
                                            onClick={() => formStep > 1 ? setFormStep(s => s - 1) : setShowForm(false)}
                                            disabled={saving}
                                        >
                                            {formStep === 1 ? 'Bekor qilish' : <><ArrowLeft size={16} /> Orqaga</>}
                                        </button>
                                        {formStep < 6 ? (
                                            <button className="btn-primary" onClick={() => setFormStep(s => s + 1)}>
                                                Keyingisi <ArrowRight size={18} />
                                            </button>
                                        ) : (
                                            <button className="btn-primary" onClick={handleSave} disabled={saving}>
                                                {saving ? <><Loader2 size={16} className="spin" /> Saqlanmoqda...</> : '✅ Saqlash'}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD CATEGORY MODAL */}
            <AnimatePresence>
                {showCatForm && (
                    <div className="modal-overlay">
                        <motion.div
                            className="form-modal mini-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="form-modal-header">
                                <h2>{editCatId ? 'Kategoriyani tahrirlash' : 'Yangi Kategoriya'}</h2>
                                <button className="btn-close" onClick={() => {
                                    setShowCatForm(false);
                                    setEditCatId(null);
                                }}><X size={22} /></button>
                            </div>
                            <div className="form-content" style={{ padding: 20 }}>
                                <div className="form-group">
                                    <label>Kategoriya Nomi *</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Masalan: Gormonlar"
                                        value={catFormData.nameUz}
                                        onChange={(e) => setCatFormData(p => ({ ...p, nameUz: e.target.value }))}
                                    />
                                </div>
                                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <button className="btn-secondary" onClick={() => {
                                        setShowCatForm(false);
                                        setEditCatId(null);
                                    }}>Bekor qilish</button>
                                    <button className="btn-primary" onClick={handleCreateCategory}>
                                        {editCatId ? 'Saqlash' : 'Yaratish'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Services;
