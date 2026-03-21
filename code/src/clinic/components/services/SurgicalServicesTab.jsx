import { useState, useEffect, useMemo } from 'react';
import {
    Search, RefreshCw, Loader2, CircleCheckBig, Circle, X,
    Scissors, Clock, AlertTriangle, Check, Building2,
} from 'lucide-react';
import { useSurgicalServices, useActivateSurgicalService, useDeactivateSurgicalService } from '../../hooks/useSurgicalServices';
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

const COMPLEXITY_LABELS = {
    LOW: { label: 'Oddiy', color: '#10b981' },
    MEDIUM: { label: "O'rta", color: '#f59e0b' },
    HIGH: { label: 'Murakkab', color: '#ef4444' },
    VERY_HIGH: { label: 'Juda murakkab', color: '#7c3aed' },
};

const RISK_LABELS = {
    LOW: 'Past xavf',
    MEDIUM: "O'rta xavf",
    HIGH: 'Yuqori xavf',
    VERY_HIGH: 'Juda yuqori xavf',
};

export default function SurgicalServicesTab() {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [subcategoryFilter, setSubcategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [confirmDeactivate, setConfirmDeactivate] = useState(null);
    const [activateModal, setActivateModal] = useState(null);   // service to activate
    const [categories, setCategories] = useState([]);

    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        api.get('/categories').then(res => {
            setCategories(res.data.data || []);
        }).catch(console.error);
    }, []);

    const activeCategoryId = subcategoryFilter !== 'all' ? subcategoryFilter : (categoryFilter !== 'all' ? categoryFilter : undefined);

    const { data: services, isLoading, refetch } = useSurgicalServices({
        search: debouncedSearch || undefined,
        categoryId: activeCategoryId,
    });

    const activateMut = useActivateSurgicalService();
    const deactivateMut = useDeactivateSurgicalService();

    const flat = useMemo(() => {
        const result = [];
        const flatten = (items) => items?.forEach(c => { result.push(c); flatten(c.children); });
        flatten(categories);
        return result;
    }, [categories]);

    const surgicalRoot = useMemo(() => flat.find(c => c.level === 0 && c.slug === 'operations'), [flat]);
    const mainCategories = useMemo(() => surgicalRoot?.children || [], [surgicalRoot]);
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
    };

    const handleConfirmActivate = () => {
        if (!activateModal) return;
        activateMut.mutate(activateModal.id, {
            onSuccess: () => { setActivateModal(null); refetch(); },
        });
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
                Jami <strong>{services?.length ?? 0}</strong> ta operatsiya — <strong>{totalActive}</strong> ta faol
            </p>

            {/* Toolbar */}
            <div className="ca-toolbar" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div className="ca-search">
                    <Search size={16} className="ca-search-icon" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Operatsiya nomi bo'yicha qidirish..."
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
                    <div className="ca-empty-icon"><Scissors size={36} /></div>
                    <h3>Operatsiyalar topilmadi</h3>
                    <p>Qidiruv yoki filtrni o'zgartiring.</p>
                </div>
            ) : (
                <div className="ca-table-wrap">
                    <table className="ca-table">
                        <thead>
                            <tr>
                                <th>Operatsiya nomi</th>
                                <th>Kategoriya</th>
                                <th>Murakkablik</th>
                                <th>Narx oraliq</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => {
                                const isActive = !!s.clinicService?.isActive;
                                const cx = COMPLEXITY_LABELS[s.complexity] || { label: s.complexity, color: 'var(--text-muted)' };
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
                                                    {s.requiresHospitalization && s.hospitalizationDays && (
                                                        <> · 🏥 {s.hospitalizationDays} kun</>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="ca-badge" style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--text-main)', fontSize: 11 }}>
                                                {s.category?.nameUz || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="ca-badge" style={{ fontSize: 10, background: `${cx.color}18`, color: cx.color }}>
                                                {cx.label}
                                            </span>
                                            {s.riskLevel && (
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    <AlertTriangle size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                                                    {RISK_LABELS[s.riskLevel] || s.riskLevel}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <strong style={{ color: 'var(--color-primary)' }}>
                                                {fmt(s.priceMin)} – {fmt(s.priceMax)}
                                            </strong>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                Tavsiya: {fmt(s.priceRecommended)} UZS
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

            {/* ── Activate modal ── */}
            {activateModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => !activateMut.isPending && setActivateModal(null)}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16, padding: 0,
                        maxWidth: 480, width: '92%', boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
                        overflow: 'hidden',
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{
                            padding: '18px 22px', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>Operatsiyani aktivlashtirish</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{activateModal.nameUz}</div>
                            </div>
                            <button className="ca-icon-btn" onClick={() => setActivateModal(null)} disabled={activateMut.isPending}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Info banner */}
                        <div style={{
                            margin: '16px 22px 0', padding: '10px 14px',
                            background: 'rgba(0,201,167,0.07)', border: '1px solid rgba(0,201,167,0.22)',
                            borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <Building2 size={15} color="var(--color-primary)" />
                            <span>Ushbu operatsiya klinikangiz ro'yxatiga qo'shiladi.</span>
                        </div>

                        {/* Details */}
                        <div style={{ padding: '14px 22px 18px' }}>
                            {activateModal.nameRu && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{activateModal.nameRu}</div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Narx oralig'i</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
                                        {fmt(activateModal.priceMin)} – {fmt(activateModal.priceMax)}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                        Tavsiya: {fmt(activateModal.priceRecommended)} UZS
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Davomiylik</div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                                        {activateModal.durationMinutes > 0 ? `${activateModal.durationMinutes} daqiqa` : '—'}
                                    </div>
                                    {activateModal.requiresHospitalization && activateModal.hospitalizationDays && (
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                            🏥 {activateModal.hospitalizationDays} kun yotoqxona
                                        </div>
                                    )}
                                </div>
                                {activateModal.complexity && (
                                    <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 14px' }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Murakkablik</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: COMPLEXITY_LABELS[activateModal.complexity]?.color || 'var(--text-main)' }}>
                                            {COMPLEXITY_LABELS[activateModal.complexity]?.label || activateModal.complexity}
                                        </div>
                                    </div>
                                )}
                                {activateModal.category && (
                                    <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 14px' }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Kategoriya</div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{activateModal.category.nameUz}</div>
                                    </div>
                                )}
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
                        <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Operatsiyani o'chirish</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
                            Ushbu operatsiya klinikangiz ro'yxatidan o'chiriladi. Istalgan vaqt qayta aktivlashtirish mumkin.
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
