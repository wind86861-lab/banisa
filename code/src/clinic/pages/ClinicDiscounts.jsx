import { useState } from 'react';
import {
    Search, List, LayoutGrid, Plus, Eye, Edit3,
    Trash2, Tag, X, Loader2, RefreshCw, Percent, DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinicDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount } from '../hooks/useClinicData';
import { useClinicServices } from '../hooks/useClinicServices';
import './clinic-admin.css';

const DISCOUNT_TYPE_OPTS = [
    { value: 'PERCENT', label: 'Foiz (%)' },
    { value: 'FIXED', label: "Belgilangan summa (so'm)" },
];

const STATUS_OPTS = [
    { value: 'ALL', label: 'Barchasi' },
    { value: 'ACTIVE', label: 'Faol' },
    { value: 'INACTIVE', label: 'Nofaol' },
    { value: 'EXPIRED', label: 'Muddati o\'tgan' },
];

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const EMPTY_FORM = {
    name: '', type: 'PERCENT', value: '',
    serviceId: '', description: '',
    startDate: '', endDate: '', isActive: true,
};

function DiscountDrawer({ discount, services, onClose, onSave, saving }) {
    const isEdit = !!discount?.id;
    const [form, setForm] = useState(
        isEdit
            ? { ...discount, startDate: discount.startDate?.slice(0, 10) ?? '', endDate: discount.endDate?.slice(0, 10) ?? '' }
            : { ...EMPTY_FORM }
    );
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...form, ...(isEdit && { id: discount.id }) });
    };

    return (
        <>
            <motion.div
                className="ca-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="ca-drawer wide"
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28 }}
            >
                <div className="ca-drawer-header">
                    <span className="ca-drawer-title">{isEdit ? 'Chegirmani tahrirlash' : 'Yangi chegirma'}</span>
                    <button className="ca-drawer-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="ca-drawer-body">
                    <form id="discount-form" onSubmit={handleSubmit}>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Chegirma nomi *</label>
                                <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Masalan: Bahor chegirmasi" />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Xizmat</label>
                                <select value={form.serviceId} onChange={e => set('serviceId', e.target.value)}>
                                    <option value="">— Barcha xizmatlar —</option>
                                    {(services ?? []).map(s => (
                                        <option key={s.id} value={s.id}>{s.nameUz}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="ca-form-group">
                            <label className="ca-label">Chegirma turi *</label>
                            <div className="ca-radio-group">
                                {DISCOUNT_TYPE_OPTS.map(o => (
                                    <label
                                        key={o.value}
                                        className={`ca-radio-option${form.type === o.value ? ' selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="dtype"
                                            value={o.value}
                                            checked={form.type === o.value}
                                            onChange={() => set('type', o.value)}
                                        />
                                        {o.value === 'PERCENT' ? <Percent size={14} /> : <DollarSign size={14} />}
                                        {o.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Qiymat * {form.type === 'PERCENT' ? '(%)' : "(so'm)"}</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    max={form.type === 'PERCENT' ? 100 : undefined}
                                    value={form.value}
                                    onChange={e => set('value', e.target.value)}
                                    placeholder={form.type === 'PERCENT' ? '20' : '50000'}
                                />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Holat</label>
                                <select value={form.isActive ? 'true' : 'false'} onChange={e => set('isActive', e.target.value === 'true')}>
                                    <option value="true">Faol</option>
                                    <option value="false">Nofaol</option>
                                </select>
                            </div>
                        </div>

                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Boshlanish sanasi</label>
                                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Tugash sanasi</label>
                                <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                            </div>
                        </div>

                        <div className="ca-form-group">
                            <label className="ca-label">Tavsif</label>
                            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Chegirma haqida qisqacha..." />
                        </div>
                    </form>
                </div>
                <div className="ca-drawer-footer">
                    <button className="ca-btn-secondary" onClick={onClose}>Bekor qilish</button>
                    <button className="ca-btn-primary" type="submit" form="discount-form" disabled={saving}>
                        {saving ? <Loader2 size={15} className="ca-spin" /> : null}
                        Saqlash
                    </button>
                </div>
            </motion.div>
        </>
    );
}

export default function ClinicDiscounts() {
    const [viewMode, setViewMode] = useState('list');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('ALL');
    const [drawer, setDrawer] = useState(null);
    const [delId, setDelId] = useState(null);

    const { data, isLoading, refetch } = useClinicDiscounts({ search, status });
    const { data: services } = useClinicServices();
    const createMut = useCreateDiscount();
    const updateMut = useUpdateDiscount();
    const deleteMut = useDeleteDiscount();

    const discounts = data?.data ?? [];
    const saving = createMut.isPending || updateMut.isPending;

    const handleSave = async (form) => {
        if (form.id) await updateMut.mutateAsync(form);
        else await createMut.mutateAsync(form);
        setDrawer(null);
    };

    const handleDelete = async () => {
        if (!delId) return;
        await deleteMut.mutateAsync(delId);
        setDelId(null);
    };

    const getStatusCls = (d) => {
        if (!d.isActive) return 'inactive';
        const now = Date.now();
        if (d.endDate && new Date(d.endDate) < now) return 'expired';
        if (d.startDate && new Date(d.startDate) > now) return 'pending';
        return 'active';
    };
    const getStatusLabel = (d) => {
        const cls = getStatusCls(d);
        return { active: 'Faol', inactive: 'Nofaol', expired: "Muddati o'tgan", pending: 'Kutilmoqda' }[cls] ?? cls;
    };

    return (
        <div>
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Chegirmalar</h1>
                    <p className="ca-subtitle">Chegirma va aksiyalarni boshqarish</p>
                </div>
                <button className="ca-btn-primary" onClick={() => setDrawer({})}>
                    <Plus size={16} /> Yangi chegirma
                </button>
            </div>

            <div className="ca-toolbar">
                <div className="ca-search">
                    <Search size={16} className="ca-search-icon" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chegirma nomi bo'yicha..." />
                </div>
                <select className="ca-select" value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button className="ca-icon-btn" onClick={() => refetch()} title="Yangilash"><RefreshCw size={16} /></button>
                <div className="ca-view-toggle">
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={18} /></button>
                    <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><LayoutGrid size={18} /></button>
                </div>
            </div>

            {isLoading ? (
                <div className="ca-loading"><Loader2 size={32} className="ca-spin" /><span>Yuklanmoqda...</span></div>
            ) : discounts.length === 0 ? (
                <div className="ca-empty">
                    <div className="ca-empty-icon"><Tag size={36} /></div>
                    <h3>Chegirmalar topilmadi</h3>
                    <p>Hozircha chegirmalar mavjud emas. Birinchi chegirmangizni yarating!</p>
                    <button className="ca-btn-primary" onClick={() => setDrawer({})}><Plus size={15} /> Chegirma qo&#39;shish</button>
                </div>
            ) : viewMode === 'list' ? (
                <div className="ca-table-wrap">
                    <table className="ca-table">
                        <thead>
                            <tr>
                                <th>Chegirma nomi</th>
                                <th>Turi</th>
                                <th>Qiymat</th>
                                <th>Xizmat</th>
                                <th>Muddat</th>
                                <th>Status</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {discounts.map(d => (
                                <tr key={d.id}>
                                    <td>
                                        <div className="ca-name-cell">
                                            <span className="main">{d.name}</span>
                                            {d.description && <span className="sub">{d.description}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="ca-badge primary">
                                            {d.type === 'PERCENT' ? <Percent size={11} /> : <DollarSign size={11} />}
                                            {d.type === 'PERCENT' ? 'Foiz' : 'Summa'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#00C9A7' }}>
                                        {d.type === 'PERCENT' ? `${d.value}%` : `${fmt(d.value)} so'm`}
                                    </td>
                                    <td>{d.service?.nameUz ?? <span style={{ color: 'var(--text-muted)' }}>Barcha</span>}</td>
                                    <td>
                                        <div className="ca-name-cell">
                                            <span className="main">{fmtDate(d.startDate)}</span>
                                            <span className="sub">→ {fmtDate(d.endDate)}</span>
                                        </div>
                                    </td>
                                    <td><span className={`ca-badge ${getStatusCls(d)}`}>{getStatusLabel(d)}</span></td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="ca-actions-cell">
                                            <button className="ca-icon-btn" title="Tahrirlash" onClick={() => setDrawer(d)}><Edit3 size={15} /></button>
                                            <button className="ca-icon-btn danger" title="O'chirish" onClick={() => setDelId(d.id)}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="ca-cards-grid">
                    {discounts.map(d => (
                        <div key={d.id} className="ca-card">
                            <div className="ca-card-header">
                                <div className="ca-card-icon" style={{ background: 'rgba(0,201,167,0.1)', color: '#00C9A7' }}>
                                    <Tag size={20} />
                                </div>
                                <span className={`ca-badge ${getStatusCls(d)}`}>{getStatusLabel(d)}</span>
                            </div>
                            <div className="ca-card-title">{d.name}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#00C9A7' }}>
                                {d.type === 'PERCENT' ? `${d.value}%` : `${fmt(d.value)} so'm`}
                            </div>
                            {d.service && <div className="ca-card-meta">{d.service.nameUz}</div>}
                            <div className="ca-card-meta">{fmtDate(d.startDate)} → {fmtDate(d.endDate)}</div>
                            <div className="ca-card-actions" onClick={e => e.stopPropagation()}>
                                <button className="ca-icon-btn" onClick={() => setDrawer(d)}><Edit3 size={15} /></button>
                                <button className="ca-icon-btn danger" onClick={() => setDelId(d.id)}><Trash2 size={15} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit drawer */}
            <AnimatePresence>
                {drawer !== null && (
                    <DiscountDrawer
                        discount={drawer}
                        services={services}
                        onClose={() => setDrawer(null)}
                        onSave={handleSave}
                        saving={saving}
                    />
                )}
            </AnimatePresence>

            {/* Delete confirm */}
            {delId && (
                <div className="ca-dialog-overlay" onClick={() => setDelId(null)}>
                    <div className="ca-dialog" onClick={e => e.stopPropagation()}>
                        <div className="ca-dialog-icon" style={{ background: 'rgba(252,105,106,0.12)', color: 'var(--color-danger)' }}>
                            <Trash2 size={26} />
                        </div>
                        <div className="ca-dialog-title">Chegirmani o&#39;chirish?</div>
                        <div className="ca-dialog-desc">Bu amalni bekor qilib bo&#39;lmaydi.</div>
                        <div className="ca-dialog-actions">
                            <button className="ca-btn-secondary" onClick={() => setDelId(null)}>Bekor</button>
                            <button className="ca-btn-danger" onClick={handleDelete} disabled={deleteMut.isPending}>
                                {deleteMut.isPending ? <Loader2 size={14} className="ca-spin" /> : null} O&#39;chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
