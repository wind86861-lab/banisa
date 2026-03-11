import { useState } from 'react';
import {
    Search, List, LayoutGrid, Plus, Edit3,
    Trash2, Users, X, Loader2, RefreshCw,
    Phone, Stethoscope,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useClinicStaff, useCreateStaff,
    useUpdateStaff, useDeleteStaff,
} from '../hooks/useClinicData';
import './clinic-admin.css';

const EMPTY_FORM = { firstName: '', lastName: '', specialty: '', phone: '', isActive: true };

function StaffDrawer({ staff, onClose, onSave, saving }) {
    const isEdit = !!staff?.id;
    const [form, setForm] = useState(isEdit ? { ...staff } : { ...EMPTY_FORM });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...form, ...(isEdit && { id: staff.id }) });
    };

    return (
        <>
            <motion.div
                className="ca-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="ca-drawer"
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28 }}
            >
                <div className="ca-drawer-header">
                    <span className="ca-drawer-title">
                        {isEdit ? 'Shifokorni tahrirlash' : 'Yangi shifokor qo\'shish'}
                    </span>
                    <button className="ca-drawer-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="ca-drawer-body">
                    <form id="staff-form" onSubmit={handleSubmit}>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Ism *</label>
                                <input
                                    required
                                    value={form.firstName}
                                    onChange={e => set('firstName', e.target.value)}
                                    placeholder="Alisher"
                                />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Familiya *</label>
                                <input
                                    required
                                    value={form.lastName}
                                    onChange={e => set('lastName', e.target.value)}
                                    placeholder="Karimov"
                                />
                            </div>
                        </div>
                        <div className="ca-form-row">
                            <div className="ca-form-group">
                                <label className="ca-label">Mutaxassislik</label>
                                <input
                                    value={form.specialty ?? ''}
                                    onChange={e => set('specialty', e.target.value)}
                                    placeholder="Kardiolog"
                                />
                            </div>
                            <div className="ca-form-group">
                                <label className="ca-label">Telefon</label>
                                <input
                                    value={form.phone ?? ''}
                                    onChange={e => set('phone', e.target.value)}
                                    placeholder="+998 90 123 45 67"
                                />
                            </div>
                        </div>
                        {isEdit && (
                            <div className="ca-form-group">
                                <label className="ca-label">Holat</label>
                                <select
                                    value={form.isActive ? 'true' : 'false'}
                                    onChange={e => set('isActive', e.target.value === 'true')}
                                >
                                    <option value="true">Faol</option>
                                    <option value="false">Nofaol</option>
                                </select>
                            </div>
                        )}
                    </form>
                </div>
                <div className="ca-drawer-footer">
                    <button className="ca-btn-secondary" onClick={onClose}>Bekor qilish</button>
                    <button className="ca-btn-primary" type="submit" form="staff-form" disabled={saving}>
                        {saving ? <Loader2 size={15} className="ca-spin" /> : null}
                        Saqlash
                    </button>
                </div>
            </motion.div>
        </>
    );
}

export default function ClinicStaff() {
    const [viewMode, setViewMode] = useState('list');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [drawer, setDrawer] = useState(null);
    const [delId, setDelId] = useState(null);

    const { data, isLoading, refetch } = useClinicStaff({ search, page });
    const createMut = useCreateStaff();
    const updateMut = useUpdateStaff();
    const deleteMut = useDeleteStaff();

    const staff = data?.data ?? [];
    const meta = data?.meta ?? {};
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

    const initials = (s) =>
        `${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}`.toUpperCase() || 'S';

    return (
        <div>
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Xodimlar</h1>
                    <p className="ca-subtitle">Klinika shifokorlari va xodimlari</p>
                </div>
                <button className="ca-btn-primary" onClick={() => setDrawer({})}>
                    <Plus size={16} /> Shifokor qo&#39;shish
                </button>
            </div>

            <div className="ca-toolbar">
                <div className="ca-search">
                    <Search size={16} className="ca-search-icon" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Ism, familiya yoki mutaxassislik..."
                    />
                </div>
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

            {meta.total != null && (
                <p className="ca-count-bar">
                    Jami <strong>{meta.total}</strong> ta xodim
                </p>
            )}

            {isLoading ? (
                <div className="ca-loading"><Loader2 size={32} className="ca-spin" /><span>Yuklanmoqda...</span></div>
            ) : staff.length === 0 ? (
                <div className="ca-empty">
                    <div className="ca-empty-icon"><Users size={36} /></div>
                    <h3>Xodimlar topilmadi</h3>
                    <p>Klinikaga birinchi shifokorni qo&#39;shing.</p>
                    <button className="ca-btn-primary" onClick={() => setDrawer({})}>
                        <Plus size={15} /> Shifokor qo&#39;shish
                    </button>
                </div>
            ) : viewMode === 'list' ? (
                <div className="ca-table-wrap">
                    <table className="ca-table">
                        <thead>
                            <tr>
                                <th>Shifokor</th>
                                <th>Mutaxassislik</th>
                                <th>Telefon</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map(s => (
                                <tr key={s.id} onClick={() => setDrawer(s)}>
                                    <td>
                                        <div className="ca-user-cell">
                                            <div className="ca-avatar">{initials(s)}</div>
                                            <div className="ca-name-cell">
                                                <span className="main">{s.firstName} {s.lastName}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {s.specialty
                                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Stethoscope size={14} color="var(--text-muted)" />
                                                {s.specialty}
                                            </span>
                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        }
                                    </td>
                                    <td>
                                        {s.phone
                                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Phone size={14} color="var(--text-muted)" />
                                                {s.phone}
                                            </span>
                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        }
                                    </td>
                                    <td>
                                        <span className={`ca-badge ${s.isActive ? 'active' : 'inactive'}`}>
                                            {s.isActive ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="ca-actions-cell">
                                            <button
                                                className="ca-icon-btn"
                                                title="Tahrirlash"
                                                onClick={() => setDrawer(s)}
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                className="ca-icon-btn danger"
                                                title="O'chirish"
                                                onClick={() => setDelId(s.id)}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {meta.totalPages > 1 && (
                        <div className="ca-pagination">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Oldingi</button>
                            <span className="ca-pagination-info">{page} / {meta.totalPages}</span>
                            <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Keyingi →</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="ca-cards-grid">
                    {staff.map(s => (
                        <div key={s.id} className="ca-card" onClick={() => setDrawer(s)}>
                            <div className="ca-card-header">
                                <div className="ca-user-cell">
                                    <div className="ca-avatar lg">{initials(s)}</div>
                                    <div>
                                        <div className="ca-card-title">{s.firstName} {s.lastName}</div>
                                        {s.specialty && (
                                            <div className="ca-card-meta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <Stethoscope size={12} /> {s.specialty}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className={`ca-badge ${s.isActive ? 'active' : 'inactive'}`}>
                                    {s.isActive ? 'Faol' : 'Nofaol'}
                                </span>
                            </div>
                            {s.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                    <Phone size={14} /> {s.phone}
                                </div>
                            )}
                            <div className="ca-card-actions" onClick={e => e.stopPropagation()}>
                                <button className="ca-icon-btn" style={{ flex: 1, width: 'auto', justifyContent: 'center' }} onClick={() => setDrawer(s)}>
                                    <Edit3 size={15} />
                                </button>
                                <button className="ca-icon-btn danger" style={{ flex: 1, width: 'auto', justifyContent: 'center' }} onClick={() => setDelId(s.id)}>
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit drawer */}
            <AnimatePresence>
                {drawer !== null && (
                    <StaffDrawer
                        staff={drawer}
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
                        <div className="ca-dialog-title">Xodimni o&#39;chirish?</div>
                        <div className="ca-dialog-desc">Bu shifokor tizimdan butunlay o&#39;chiriladi.</div>
                        <div className="ca-dialog-actions">
                            <button className="ca-btn-secondary" onClick={() => setDelId(null)}>Bekor</button>
                            <button className="ca-btn-danger" onClick={handleDelete} disabled={deleteMut.isPending}>
                                {deleteMut.isPending ? <Loader2 size={14} className="ca-spin" /> : null}
                                O&#39;chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
