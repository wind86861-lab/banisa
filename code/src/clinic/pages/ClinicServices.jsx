import { useState, useEffect, useMemo } from 'react';
import {
    Search, List, LayoutGrid, RefreshCw, Loader2,
    CircleCheckBig, Circle, Clock, Beaker, Settings2,
    X, Sparkles, Eye, Info, AlertCircle,
    BriefcaseMedical, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinicServices, useActivateService, useDeactivateService } from '../hooks/useClinicServices';
import ServiceCustomizationDrawer from '../components/services/ServiceCustomizationDrawer';
import CheckupPackagesTab from '../components/services/CheckupPackagesTab';
import './clinic-admin.css';

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');

function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

const MAIN_TABS = [
    { key: 'services', label: 'Diagnostika xizmatlari', icon: <BriefcaseMedical size={15} /> },
    { key: 'checkup', label: 'Checkup paketlari', icon: <Package size={15} /> },
];

const FILTER_OPTIONS = [
    { value: 'all', label: 'Barchasi' },
    { value: 'active', label: 'Faol xizmatlar' },
    { value: 'inactive', label: 'Aktivlashtirilmagan' },
];

export default function ClinicServices() {
    const [mainTab, setMainTab] = useState('services');
    const [viewMode, setViewMode] = useState('list');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeService, setActiveService] = useState(null);
    const [customizeService, setCustomizeService] = useState(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState(null);

    const debouncedSearch = useDebounce(search, 300);

    const { data: services, isLoading, refetch } = useClinicServices({
        search: debouncedSearch || undefined,
        onlyActive: false,
    });

    const activateMut = useActivateService();
    const deactivateMut = useDeactivateService();

    // Filter services
    const filtered = useMemo(() => {
        if (!services) return [];
        let list = [...services];
        if (statusFilter === 'active') {
            list = list.filter(s => s.clinicService?.isActive);
        } else if (statusFilter === 'inactive') {
            list = list.filter(s => !s.clinicService?.isActive);
        }
        return list;
    }, [services, statusFilter]);

    // Group by category
    const grouped = useMemo(() => {
        return filtered.reduce((acc, svc) => {
            const cat = svc.category?.nameUz ?? 'Boshqa';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(svc);
            return acc;
        }, {});
    }, [filtered]);

    const totalActive = services?.filter(s => s.clinicService?.isActive).length ?? 0;
    const totalServices = services?.length ?? 0;

    const handleActivate = (serviceId) => {
        activateMut.mutate(serviceId);
    };

    const handleDeactivate = () => {
        if (!confirmDeactivate) return;
        deactivateMut.mutate(confirmDeactivate, {
            onSuccess: () => setConfirmDeactivate(null),
        });
    };

    // If showing non-services tab
    if (mainTab !== 'services') {
        return (
            <div>
                <div className="ca-header">
                    <div>
                        <h1 className="ca-title">Xizmatlar va Narxlar</h1>
                        <p className="ca-subtitle">Diagnostika xizmatlari, checkup paketlari va sozlamalar</p>
                    </div>
                </div>
                <div className="ca-tabs">
                    {MAIN_TABS.map(t => (
                        <button
                            key={t.key}
                            className={`ca-tab${mainTab === t.key ? ' active' : ''}`}
                            onClick={() => setMainTab(t.key)}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>
                <div style={{ marginTop: 20 }}>
                    {mainTab === 'checkup' && <CheckupPackagesTab />}
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Xizmatlar va Narxlar</h1>
                    <p className="ca-subtitle">
                        Jami {totalServices} ta xizmat — <strong>{totalActive}</strong> ta faol
                    </p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="ca-tabs">
                {MAIN_TABS.map(t => (
                    <button
                        key={t.key}
                        className={`ca-tab${mainTab === t.key ? ' active' : ''}`}
                        onClick={() => setMainTab(t.key)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="ca-toolbar" style={{ marginTop: 16 }}>
                <div className="ca-search">
                    <Search size={16} className="ca-search-icon" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Xizmat nomi bo'yicha qidirish..."
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)', color: 'var(--text-main)',
                        fontSize: 13,
                    }}
                >
                    {FILTER_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
                <button className="ca-icon-btn" onClick={() => refetch()} title="Yangilash">
                    <RefreshCw size={16} />
                </button>
                <div className="ca-view-toggle">
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                        <List size={18} />
                    </button>
                    <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="ca-loading"><Loader2 size={32} className="ca-spin" /><span>Yuklanmoqda...</span></div>
            ) : filtered.length === 0 ? (
                <div className="ca-empty">
                    <div className="ca-empty-icon"><BriefcaseMedical size={36} /></div>
                    <h3>Xizmatlar topilmadi</h3>
                    <p>Qidiruv yoki filtrni o&#39;zgartiring.</p>
                </div>
            ) : viewMode === 'list' ? (
                /* ═══ TABLE VIEW ═══ */
                <div className="ca-table-wrap">
                    <table className="ca-table">
                        <thead>
                            <tr>
                                <th>Xizmat nomi</th>
                                <th>Kategoriya</th>
                                <th>Narx oralig&#39;i</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => {
                                const isActive = !!s.clinicService?.isActive;
                                const hasCust = s.clinicService?.hasCustomization;
                                return (
                                    <tr key={s.id} onClick={() => setActiveService(s)}>
                                        <td>
                                            <div className="ca-name-cell">
                                                <span className="main" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {isActive ? <CircleCheckBig size={15} color="#10b981" /> : <Circle size={15} color="var(--text-muted)" />}
                                                    {s.clinicService?.displayNameUz || s.nameUz}
                                                    {hasCust && <Sparkles size={13} color="#FFD700" />}
                                                    {s.clinicService?.isHighlighted && (
                                                        <span className="ca-badge primary" style={{ fontSize: 9, padding: '1px 6px' }}>Mashhur</span>
                                                    )}
                                                </span>
                                                {s.nameRu && <span className="sub">{s.nameRu}</span>}
                                                <span className="sub">
                                                    <Clock size={11} /> {s.durationMinutes} daq
                                                    {s.clinicService?.customCategory && (
                                                        <> &middot; {s.clinicService.customCategory}</>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="ca-badge" style={{ background: 'rgba(0,201,167,0.08)', color: 'var(--text-main)', fontSize: 11 }}>
                                                {s.category?.nameUz || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ color: 'var(--color-primary)' }}>{fmt(s.priceMin)}</strong>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> — {fmt(s.priceMax)} UZS</span>
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
                                                        onClick={() => handleActivate(s.id)}
                                                        disabled={activateMut.isPending}
                                                    >
                                                        Aktivlashtirish
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="ca-icon-btn"
                                                            title="Moslashtirish"
                                                            onClick={() => setCustomizeService(s)}
                                                        >
                                                            <Settings2 size={15} />
                                                        </button>
                                                        <button
                                                            className="ca-icon-btn"
                                                            title="Batafsil"
                                                            onClick={() => setActiveService(s)}
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            className="ca-icon-btn danger"
                                                            title="O'chirish"
                                                            onClick={() => setConfirmDeactivate(s.id)}
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* ═══ GRID VIEW ═══ */
                <div className="ca-cards-grid">
                    {filtered.map(s => {
                        const isActive = !!s.clinicService?.isActive;
                        const hasCust = s.clinicService?.hasCustomization;
                        return (
                            <div key={s.id} className="ca-card" onClick={() => setActiveService(s)}>
                                <div className="ca-card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: isActive ? 'rgba(0,201,167,0.12)' : 'rgba(150,150,150,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Beaker size={20} color={isActive ? '#00C9A7' : 'var(--text-muted)'} />
                                        </div>
                                        <div>
                                            <div className="ca-card-title" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                {s.clinicService?.displayNameUz || s.nameUz}
                                                {hasCust && <Sparkles size={12} color="#FFD700" />}
                                            </div>
                                            {s.nameRu && <div className="ca-card-meta">{s.nameRu}</div>}
                                        </div>
                                    </div>
                                    <span className={`ca-badge ${isActive ? 'active' : 'inactive'}`} style={{ fontSize: 10 }}>
                                        {isActive ? 'Faol' : 'Nofaol'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
                                    <span className="ca-badge" style={{ fontSize: 10, background: 'rgba(0,201,167,0.08)' }}>
                                        {s.category?.nameUz || '—'}
                                    </span>
                                    {s.clinicService?.customCategory && (
                                        <span className="ca-badge primary" style={{ fontSize: 10 }}>
                                            {s.clinicService.customCategory}
                                        </span>
                                    )}
                                    {s.clinicService?.isHighlighted && (
                                        <span className="ca-badge" style={{ fontSize: 10, background: 'rgba(255,215,0,0.15)', color: '#b8860b' }}>
                                            Mashhur
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)', margin: '6px 0' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {s.durationMinutes} daq</span>
                                </div>

                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', margin: '4px 0 10px' }}>
                                    {fmt(s.priceMin)} — {fmt(s.priceMax)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>UZS</span>
                                </div>

                                <div className="ca-card-actions" onClick={e => e.stopPropagation()}>
                                    {!isActive ? (
                                        <button
                                            className="ca-btn-primary"
                                            style={{ flex: 1, fontSize: 12, justifyContent: 'center' }}
                                            onClick={() => handleActivate(s.id)}
                                        >
                                            Aktivlashtirish
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="ca-icon-btn"
                                                style={{ flex: 1, justifyContent: 'center' }}
                                                onClick={() => setCustomizeService(s)}
                                                title="Moslashtirish"
                                            >
                                                <Settings2 size={15} />
                                            </button>
                                            <button
                                                className="ca-icon-btn"
                                                style={{ flex: 1, justifyContent: 'center' }}
                                                onClick={() => setActiveService(s)}
                                                title="Batafsil"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                className="ca-icon-btn danger"
                                                style={{ flex: 1, justifyContent: 'center' }}
                                                onClick={() => setConfirmDeactivate(s.id)}
                                                title="O'chirish"
                                            >
                                                <X size={15} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ DETAIL DRAWER ═══ */}
            <AnimatePresence>
                {activeService && (
                    <>
                        <motion.div
                            className="ca-backdrop"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setActiveService(null)}
                        />
                        <motion.div
                            className="ca-drawer"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.28 }}
                        >
                            <div className="ca-drawer-header">
                                <span className="ca-drawer-title">{activeService.clinicService?.displayNameUz || activeService.nameUz}</span>
                                <button className="ca-drawer-close" onClick={() => setActiveService(null)}><X size={20} /></button>
                            </div>
                            <div className="ca-drawer-body">
                                {/* Status + Category badges */}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                    <span className={`ca-badge ${activeService.clinicService?.isActive ? 'active' : 'inactive'}`}>
                                        {activeService.clinicService?.isActive ? 'Faol' : 'Nofaol'}
                                    </span>
                                    <span className="ca-badge" style={{ background: 'rgba(0,201,167,0.08)' }}>
                                        {activeService.category?.nameUz || '—'}
                                    </span>
                                    {activeService.clinicService?.customCategory && (
                                        <span className="ca-badge primary">{activeService.clinicService.customCategory}</span>
                                    )}
                                    {activeService.clinicService?.hasCustomization && (
                                        <span className="ca-badge" style={{ background: 'rgba(255,215,0,0.15)', color: '#b8860b' }}>
                                            <Sparkles size={11} /> Moslashtirilgan
                                        </span>
                                    )}
                                </div>

                                {/* Info grid */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                                    padding: 16, borderRadius: 10,
                                    background: 'var(--bg-main)', marginBottom: 16,
                                }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Davomiyligi</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{activeService.durationMinutes} daqiqa</div>
                                    </div>
                                    {activeService.clinicService?.estimatedDuration && (
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Klinika davomiyligi</div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>{activeService.clinicService.estimatedDuration} daqiqa</div>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Tavsiya narx</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(activeService.priceRecommended)} UZS</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Narx oraliq</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(activeService.priceMin)} — {fmt(activeService.priceMax)}</div>
                                    </div>
                                </div>

                                {/* Price box */}
                                <div style={{
                                    background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.2)',
                                    padding: 20, borderRadius: 12, marginBottom: 16, textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Narx oraliq</div>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-primary)' }}>
                                        {fmt(activeService.priceMin)} — {fmt(activeService.priceMax)} <span style={{ fontSize: 14, fontWeight: 400 }}>UZS</span>
                                    </div>
                                </div>

                                {/* Description */}
                                {(activeService.clinicService?.displayDescriptionUz || activeService.shortDescription) && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Tavsifi</div>
                                        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-main)', margin: 0 }}>
                                            {activeService.clinicService?.displayDescriptionUz || activeService.shortDescription}
                                        </p>
                                    </div>
                                )}

                                {/* Preparation */}
                                {activeService.clinicService?.preparationUz && (
                                    <div style={{
                                        padding: 14, borderRadius: 10,
                                        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                                        marginBottom: 12,
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#3b82f6' }}>
                                            <Info size={14} /> Tayyorgarlik ko&#39;rsatmalari
                                        </div>
                                        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{activeService.clinicService.preparationUz}</p>
                                    </div>
                                )}

                                {/* Benefits */}
                                {activeService.clinicService?.benefits && Array.isArray(activeService.clinicService.benefits) && activeService.clinicService.benefits.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Afzalliklar</div>
                                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                                            {activeService.clinicService.benefits.map((b, i) => (
                                                <li key={i}>{b.uz || b}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Tags */}
                                {activeService.clinicService?.tags?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                        {activeService.clinicService.tags.map(tag => (
                                            <span key={tag} className="ca-badge primary" style={{ fontSize: 10 }}>{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Images */}
                                {activeService.clinicService?.images?.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Rasmlar</div>
                                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                                            {activeService.clinicService.images.map(img => (
                                                <img key={img.id} src={img.url} alt={img.alt || ''} style={{
                                                    width: 100, height: 70, borderRadius: 8, objectFit: 'cover',
                                                    border: img.isPrimary ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Drawer footer */}
                            <div className="ca-drawer-footer">
                                {activeService.clinicService?.isActive && (
                                    <button
                                        className="ca-btn-primary"
                                        style={{ flex: 1 }}
                                        onClick={() => { setCustomizeService(activeService); setActiveService(null); }}
                                    >
                                        <Settings2 size={15} /> Moslashtirish
                                    </button>
                                )}
                                <button className="ca-btn-secondary" onClick={() => setActiveService(null)}>Yopish</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══ CUSTOMIZATION DRAWER ═══ */}
            <ServiceCustomizationDrawer
                open={!!customizeService}
                onClose={() => setCustomizeService(null)}
                service={customizeService}
            />

            {/* ═══ DEACTIVATE CONFIRM ═══ */}
            {confirmDeactivate && (
                <div className="ca-dialog-overlay" onClick={() => setConfirmDeactivate(null)}>
                    <div className="ca-dialog" onClick={e => e.stopPropagation()}>
                        <div className="ca-dialog-icon" style={{ background: 'rgba(252,105,106,0.12)', color: 'var(--color-danger)' }}>
                            <AlertCircle size={26} />
                        </div>
                        <div className="ca-dialog-title">Xizmatni o&#39;chirish?</div>
                        <div className="ca-dialog-desc">Bu xizmat nofaol qilinadi. Qayta aktivlashtirish mumkin.</div>
                        <div className="ca-dialog-actions">
                            <button className="ca-btn-secondary" onClick={() => setConfirmDeactivate(null)}>Bekor</button>
                            <button className="ca-btn-danger" onClick={handleDeactivate} disabled={deactivateMut.isPending}>
                                {deactivateMut.isPending ? <Loader2 size={14} className="ca-spin" /> : null}
                                O&#39;chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
