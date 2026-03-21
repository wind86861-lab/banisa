import { useState } from 'react';
import { ChevronDown, Circle, CircleCheckBig, Package2, Loader2, Settings2, X, Check, PackageOpen } from 'lucide-react';
import { useActivatePackage, useUpdatePackage, useDeactivatePackage } from '../../hooks/useCheckupPackages';

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');

const CAT_LABELS = { BASIC: 'Bazaviy', SPECIALIZED: 'Ixtisoslashgan', AGE_BASED: 'Yosh guruhi' };

export default function PackageCard({ package: pkg }) {
    const isActivated = !!pkg.clinicPackage?.isActive;

    const [itemsOpen, setItemsOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);

    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    const activateMutation = useActivatePackage();
    const updateMutation = useUpdatePackage();
    const deactivateMutation = useDeactivatePackage();
    const loading = activateMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;

    const numPrice = Math.round(Number(price));
    const priceValid = price !== '' && !isNaN(numPrice) && numPrice >= (pkg.priceMin ?? 0) && numPrice <= (pkg.priceMax ?? Infinity);

    const openModal = () => {
        setPrice(String(pkg.clinicPackage?.clinicPrice ?? pkg.recommendedPrice ?? pkg.priceMin ?? 0));
        setNotes(pkg.clinicPackage?.customNotes ?? '');
        setError(null);
        setModalOpen(true);
    };

    const closeModal = () => { setModalOpen(false); setError(null); };

    const handleSubmit = () => {
        setError(null);
        const payload = { clinicPrice: numPrice, customNotes: notes.trim() || undefined };
        if (isActivated) {
            updateMutation.mutate(
                { id: pkg.clinicPackage.id, ...payload },
                { onSuccess: closeModal, onError: (e) => setError(e?.response?.data?.error?.message ?? 'Xatolik yuz berdi') },
            );
        } else {
            activateMutation.mutate(
                { packageId: pkg.id, ...payload },
                { onSuccess: closeModal, onError: (e) => setError(e?.response?.data?.error?.message ?? 'Xatolik yuz berdi') },
            );
        }
    };

    const handleDeactivate = () => {
        deactivateMutation.mutate(pkg.clinicPackage.id, {
            onSuccess: () => setConfirmDeactivate(false),
        });
    };

    return (
        <>
            {/* ── Card ── */}
            <div style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isActivated ? 'rgba(16,185,129,0.45)' : 'var(--border-color)'}`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                transition: 'border-color 0.2s',
            }}>
                {/* Status dot */}
                <div style={{ paddingTop: 3, flexShrink: 0 }}>
                    {isActivated
                        ? <CircleCheckBig size={18} color="#10b981" />
                        : <Circle size={18} color="var(--text-muted)" />}
                </div>

                {/* Info block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{pkg.nameUz}</span>
                        <span className="ca-badge" style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                            {CAT_LABELS[pkg.category] || pkg.category}
                        </span>
                        {isActivated && <span className="ca-badge active" style={{ fontSize: 10 }}>Faol</span>}
                    </div>

                    {pkg.nameRu && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{pkg.nameRu}</div>}
                    {pkg.shortDescription && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{pkg.shortDescription}</div>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 7, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setItemsOpen(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, padding: 0 }}
                        >
                            <Package2 size={13} />
                            {pkg.items?.length || 0} ta xizmat
                            <ChevronDown size={13} style={{ transform: itemsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
                        </button>

                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Diapazon: <strong>{fmt(pkg.priceMin)} – {fmt(pkg.priceMax)}</strong> UZS
                            &nbsp;·&nbsp; Tavsiya: <strong style={{ color: 'var(--color-primary)' }}>{fmt(pkg.recommendedPrice)}</strong>
                        </span>

                        {isActivated && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                                Klinika narxi: {fmt(pkg.clinicPackage?.clinicPrice)} UZS
                            </span>
                        )}
                    </div>

                    {/* Services list */}
                    {itemsOpen && (
                        <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--border-color)' }}>
                            {(pkg.items || []).map(item => (
                                <div key={item.id} style={{ fontSize: 12, color: 'var(--text-main)', padding: '2px 0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span>✓ {item.serviceName}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
                                    {item.servicePrice > 0 && <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{fmt(item.servicePrice)} UZS</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {!isActivated && (
                        <button className="ca-btn-primary" style={{ fontSize: 12, padding: '5px 14px' }} onClick={openModal}>
                            Aktivlashtirish
                        </button>
                    )}
                    {isActivated && (
                        <>
                            <button className="ca-icon-btn" title="Narx va ma'lumotlarni tahrirlash" onClick={openModal}>
                                <Settings2 size={15} />
                            </button>
                            <button className="ca-icon-btn danger" title="Nofaol qilish" onClick={() => setConfirmDeactivate(true)}>
                                <X size={15} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Activation / Edit modal overlay ── */}
            {modalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => !loading && closeModal()}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16, padding: 0,
                        maxWidth: 520, width: '92%', boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
                        overflow: 'hidden',
                    }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{
                            padding: '18px 22px', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>
                                    {isActivated ? 'Paket ma\'lumotlarini tahrirlash' : 'Paketni aktivlashtirish'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{pkg.nameUz}</div>
                            </div>
                            <button className="ca-icon-btn" onClick={closeModal} disabled={loading}><X size={18} /></button>
                        </div>

                        {/* Activate mode banner */}
                        {!isActivated && (
                            <div style={{
                                margin: '16px 22px 0', padding: '10px 14px',
                                background: 'rgba(0,201,167,0.07)', border: '1px solid rgba(0,201,167,0.22)',
                                borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <PackageOpen size={15} color="var(--color-primary)" />
                                <span>Paketni aktivlashtirish uchun <strong style={{ color: 'var(--color-primary)' }}>Klinika narxi</strong>ni kiriting.</span>
                            </div>
                        )}

                        {/* Summary info */}
                        <div style={{ padding: '14px 22px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                                <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Narx diapazoni</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(pkg.priceMin)} – {fmt(pkg.priceMax)}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Tavsiya: {fmt(pkg.recommendedPrice)} UZS</div>
                                </div>
                                <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tarkib</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{pkg.items?.length || 0} ta xizmat</div>
                                    {pkg.shortDescription && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{pkg.shortDescription}</div>}
                                </div>
                            </div>

                            {/* Price input */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                                    Klinika narxi (UZS) *
                                </label>
                                <input
                                    type="number"
                                    value={price}
                                    min={pkg.priceMin}
                                    max={pkg.priceMax}
                                    step={1000}
                                    onChange={e => setPrice(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                        border: `1.5px solid ${priceValid ? 'var(--color-primary)' : price !== '' ? '#ef4444' : 'var(--border-color)'}`,
                                        background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: 14,
                                        outline: 'none', boxSizing: 'border-box',
                                    }}
                                    autoFocus
                                />
                                <div style={{ fontSize: 11, color: priceValid ? 'var(--text-muted)' : '#ef4444', marginTop: 4 }}>
                                    {fmt(pkg.priceMin)} – {fmt(pkg.priceMax)} UZS oralig'ida bo'lishi kerak
                                </div>
                            </div>

                            {/* Notes input */}
                            <div style={{ marginBottom: 4 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                                    Qo'shimcha ma'lumot <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ixtiyoriy)</span>
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Masalan: erta tonggi tekshiruv, maxsus tayyorgarlik, murojaat vaqti..."
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: 13,
                                        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {error && (
                                <div style={{
                                    padding: '8px 12px', borderRadius: 8, marginTop: 8,
                                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#ef4444', fontSize: 12,
                                }}>
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 22px', borderTop: '1px solid var(--border-color)', marginTop: 16,
                            display: 'flex', gap: 10, justifyContent: 'flex-end',
                        }}>
                            <button className="ca-btn-secondary" onClick={closeModal} disabled={loading}>Bekor qilish</button>
                            <button
                                className="ca-btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={handleSubmit}
                                disabled={loading || !priceValid}
                            >
                                {loading ? <Loader2 size={14} className="ca-spin" /> : <Check size={14} />}
                                {isActivated ? 'Saqlash' : 'Saqlash va Aktivlashtirish'}
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
                        <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Paketni o'chirish</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
                            <strong>{pkg.nameUz}</strong> klinikangiz ro'yxatidan o'chiriladi. Istalgan vaqt qayta aktivlashtirish mumkin.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="ca-btn-secondary" onClick={() => setConfirmDeactivate(false)} disabled={deactivateMutation.isPending}>
                                Bekor qilish
                            </button>
                            <button
                                className="ca-btn-primary"
                                style={{ background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={handleDeactivate}
                                disabled={deactivateMutation.isPending}
                            >
                                {deactivateMutation.isPending ? <Loader2 size={13} className="ca-spin" /> : null}
                                O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
