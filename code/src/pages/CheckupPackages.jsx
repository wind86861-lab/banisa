import React, { useState, useMemo } from 'react';
import {
    useCheckupPackages,
    useCheckupPackage,
    useCreateCheckupPackage,
    useUpdateCheckupPackage,
    useDeleteCheckupPackage,
    useTogglePackageStatus
} from '../features/checkup-packages/hooks/useCheckupPackages';
import {
    Plus, Edit3, Trash2, Eye, CheckCircle, Ban, Search, Download, Loader2,
    Package, Activity, AlertCircle, TrendingDown, X, Beaker, Stethoscope
} from 'lucide-react';
import CheckupPackageForm from '../features/checkup-packages/components/CheckupPackageForm';
import { checkupPackagesApi } from '../features/checkup-packages/api/checkupPackagesApi';
import './CheckupPackages.css';

const CATEGORY_LABELS = {
    BASIC: { label: 'Bazaviy', emoji: '🩺' },
    SPECIALIZED: { label: 'Ixtisoslashgan', emoji: '❤️' },
    AGE_BASED: { label: 'Yosh guruhi', emoji: '👨‍⚕️' },
};

const PAGE_SIZE = 9;

/* ─── Package Card ─────────────────────────────────────── */
const PackageCard = ({ pkg, onEdit, onToggle, onDelete }) => {
    const itemCount = pkg._count?.items || pkg.items?.length || 0;
    const diagCount = pkg.items?.filter(i => !i.isConsultation).length ?? itemCount;
    const consCount = pkg.items?.filter(i => i.isConsultation).length ?? 0;
    const total = pkg.items?.reduce((s, i) => s + (i.servicePrice || 0), 0) ?? 0;
    const recPrice = pkg.recommendedPrice || 0;
    const discount = total > recPrice ? total - recPrice : 0;
    const pct = total > 0 ? Math.round((recPrice / total) * 100) : 100;
    const catInfo = CATEGORY_LABELS[pkg.category] || { label: pkg.category, emoji: '📦' };

    return (
        <div className="pkg-card">
            <div className="pkg-card-top">
                <div className="pkg-card-title-row">
                    <div className="pkg-emoji-box">{catInfo.emoji}</div>
                    <div style={{ minWidth: 0 }}>
                        <p className="pkg-name">{pkg.nameUz}</p>
                        <p className="pkg-desc">{pkg.shortDescription || 'Tavsif mavjud emas'}</p>
                    </div>
                </div>
                <span className={`pkg-cat-badge ${pkg.category}`}>{catInfo.label}</span>
            </div>

            <div className="pkg-card-body">
                <div className="pkg-services-row">
                    <span className="pkg-svc-chip diag">
                        <Beaker size={12} />{diagCount} Diagnostika
                    </span>
                    {consCount > 0 && (
                        <span className="pkg-svc-chip consult">
                            <Stethoscope size={12} />{consCount} Konsultatsiya
                        </span>
                    )}
                    {diagCount === 0 && consCount === 0 && (
                        <span className="pkg-svc-chip diag">
                            <Beaker size={12} />{itemCount} Xizmat
                        </span>
                    )}
                </div>

                <div className="pkg-price-block">
                    <div className="pkg-price-row">
                        <div>
                            <div className="pkg-price-main">{recPrice.toLocaleString()} UZS</div>
                            <div className="pkg-price-sub">Tavsiya narx</div>
                        </div>
                        {discount > 0 && (
                            <span className="pkg-save-chip">
                                <TrendingDown size={11} />
                                {discount.toLocaleString()} tejash
                            </span>
                        )}
                    </div>
                    {total > 0 && (
                        <div className="pkg-discount-bar">
                            <div className="pkg-discount-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                    )}
                </div>
            </div>

            <div className="pkg-card-footer">
                <span className={`pkg-status-dot ${pkg.isActive ? 'active' : 'inactive'}`}>
                    {pkg.isActive ? <CheckCircle size={12} /> : <Ban size={12} />}
                    {pkg.isActive ? 'Faol' : 'Nofaol'}
                </span>
                <span className="pkg-act-count">{itemCount} ta xizmat</span>
            </div>

            <div className="pkg-card-actions">
                <button className="pkg-btn-view" onClick={() => onEdit(pkg)}>
                    <Eye size={14} /> Ko'rish
                </button>
                <button className="pkg-btn-icon" title="Tahrirlash" onClick={() => onEdit(pkg)}>
                    <Edit3 size={15} />
                </button>
                <button
                    className="pkg-btn-icon warn"
                    title={pkg.isActive ? 'Nofaol qilish' : 'Faollashtirish'}
                    onClick={() => onToggle(pkg.id, pkg.isActive)}
                >
                    {pkg.isActive ? <Ban size={15} /> : <CheckCircle size={15} />}
                </button>
                <button className="pkg-btn-icon danger" title="O'chirish" onClick={() => onDelete(pkg.id)}>
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    );
};

/* ─── Main Page ────────────────────────────────────────── */
const CheckupPackages = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const { data, isLoading } = useCheckupPackages({
        page,
        limit: PAGE_SIZE,
        search: search.length >= 2 ? search : undefined,
        category: category || undefined,
        status: status || undefined,
    });

    const { data: editingPkgData } = useCheckupPackage(editingId);
    const toggleMutation = useTogglePackageStatus();
    const deleteMutation = useDeleteCheckupPackage();

    const items = data?.items || [];
    const totalCount = data?.meta?.total || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    const activeCount = items.filter(p => p.isActive).length;
    const inactiveCount = items.filter(p => !p.isActive).length;

    const avgDiscount = useMemo(() => {
        const withDiscount = items.filter(p => p.recommendedPrice > 0 && p.items?.length > 0);
        if (!withDiscount.length) return null;
        const total = withDiscount.reduce((s, p) => {
            const sum = p.items.reduce((a, i) => a + (i.servicePrice || 0), 0);
            return s + (sum > p.recommendedPrice ? Math.round(((sum - p.recommendedPrice) / sum) * 100) : 0);
        }, 0);
        return Math.round(total / withDiscount.length);
    }, [items]);

    const openCreate = () => { setEditingId(null); setFormOpen(true); };
    const openEdit = (pkg) => { setEditingId(pkg.id); setFormOpen(true); };

    // ── CSV Export ──
    const [csvExporting, setCsvExporting] = useState(false);
    const exportCheckupCSV = async () => {
        setCsvExporting(true);
        try {
            const result = await checkupPackagesApi.getAll({ page: 1, limit: 10000 });
            const rows = result.items || [];
            if (!rows.length) { alert('Eksport uchun ma\'lumot topilmadi'); return; }
            const flattenValue = (val) => {
                if (val === null || val === undefined) return '';
                if (Array.isArray(val)) return JSON.stringify(val);
                if (typeof val === 'object') return JSON.stringify(val);
                return String(val);
            };
            const allKeys = new Set();
            rows.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
            const headers = [...allKeys];
            const csvRows = [
                headers.join(','),
                ...rows.map(row => headers.map(h => `"${flattenValue(row[h]).replace(/"/g, '""')}"`).join(','))
            ];
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `checkup_paketlar_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.response?.data?.error?.message || err.message || 'Eksportda xatolik');
        } finally {
            setCsvExporting(false);
        }
    };

    const handleToggle = (id, current) => {
        if (window.confirm(`Paketni ${current ? 'nofaol' : 'faol'} qilmoqchimisiz?`))
            toggleMutation.mutate({ id, activate: !current });
    };

    const handleDelete = (id) => {
        if (window.confirm("Ushbu paketni o'chirmoqchimisiz?"))
            deleteMutation.mutate(id);
    };

    const pageNums = [];
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);

    return (
        <div className="packages-container">

            {/* ── Header ── */}
            <div className="packages-header">
                <div className="packages-header-left">
                    <h1><Package size={24} /> Checkup Paketlar</h1>
                    <p>Super admin panel — barcha checkup paketlarni boshqaring</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="btn-add-package" style={{ background: '#059669' }} onClick={exportCheckupCSV} disabled={csvExporting}>
                        {csvExporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />} CSV Export
                    </button>
                    <button className="btn-add-package" onClick={openCreate}>
                        <Plus size={18} /> Yangi Yaratish
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={22} /></div>
                    <div className="stat-body">
                        <div className="value">{totalCount}</div>
                        <div className="label">Jami paketlar</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><CheckCircle size={22} /></div>
                    <div className="stat-body">
                        <div className="value">{activeCount}</div>
                        <div className="label">Faol paketlar</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><AlertCircle size={22} /></div>
                    <div className="stat-body">
                        <div className="value">{inactiveCount}</div>
                        <div className="label">Nofaol paketlar</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><TrendingDown size={22} /></div>
                    <div className="stat-body">
                        <div className="value">{avgDiscount != null ? `${avgDiscount}%` : '—'}</div>
                        <div className="label">O'rtacha chegirma</div>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="packages-toolbar">
                <div className="search-box">
                    <Search size={16} className="search-icon" />
                    <input
                        className="search-input-field"
                        placeholder="Paket nomini qidiring..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <select
                    className="filter-select"
                    value={category}
                    onChange={e => { setCategory(e.target.value); setPage(1); }}
                >
                    <option value="">Barcha kategoriyalar</option>
                    <option value="BASIC">Bazaviy</option>
                    <option value="SPECIALIZED">Ixtisoslashgan</option>
                    <option value="AGE_BASED">Yosh guruhi</option>
                </select>
                <select
                    className="filter-select"
                    value={status}
                    onChange={e => { setStatus(e.target.value); setPage(1); }}
                >
                    <option value="">Barcha statuslar</option>
                    <option value="active">Faol</option>
                    <option value="inactive">Nofaol</option>
                </select>
                <span className="toolbar-count">
                    {totalCount} ta paket
                </span>
            </div>

            {/* ── Cards Grid ── */}
            <div className="packages-grid">
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="pkg-skeleton" />)
                ) : items.length === 0 ? (
                    <div className="pkg-empty">
                        <span className="pkg-empty-icon">📦</span>
                        <h3>Paketlar topilmadi</h3>
                        <p>Qidiruv shartlarini o'zgartiring yoki yangi paket yarating</p>
                        <button className="btn-add-package" onClick={openCreate}>
                            <Plus size={16} /> Yangi Yaratish
                        </button>
                    </div>
                ) : (
                    items.map((pkg, idx) => (
                        <PackageCard
                            key={pkg.id}
                            pkg={pkg}
                            onEdit={openEdit}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        />
                    ))
                )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="pkg-pagination">
                    <span className="pkg-pagination-info">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} ta
                    </span>
                    <div className="pkg-pagination-btns">
                        <button
                            className="pkg-page-btn"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >‹</button>
                        {pageNums.map(n => (
                            <button
                                key={n}
                                className={`pkg-page-btn${n === page ? ' active' : ''}`}
                                onClick={() => setPage(n)}
                            >{n}</button>
                        ))}
                        <button
                            className="pkg-page-btn"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >›</button>
                    </div>
                </div>
            )}

            {/* ── Wizard Modal ── */}
            {formOpen && (
                <div className="pkg-modal-overlay" onClick={e => e.target === e.currentTarget && setFormOpen(false)}>
                    <div className="pkg-modal">
                        <CheckupPackageForm
                            initialData={editingId ? editingPkgData : null}
                            onClose={() => { setFormOpen(false); setEditingId(null); }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckupPackages;
