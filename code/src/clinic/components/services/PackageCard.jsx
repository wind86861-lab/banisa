import { useState } from 'react';
import { ChevronDown, Circle, CircleCheckBig, Package2, Loader2, Settings2, X } from 'lucide-react';
import { useActivatePackage, useUpdatePackage, useDeactivatePackage } from '../../hooks/useCheckupPackages';
import CheckupPackageDrawer from './CheckupPackageDrawer';

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');

const CAT_LABELS = { BASIC: 'Bazaviy', SPECIALIZED: 'Ixtisoslashgan', AGE_BASED: 'Yosh guruhi' };

export default function PackageCard({ package: pkg }) {
    const isActivated = !!pkg.clinicPackage?.isActive;

    const [itemsOpen, setItemsOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);

    const activateMutation = useActivatePackage();
    const updateMutation = useUpdatePackage();
    const deactivateMutation = useDeactivatePackage();
    const loading = activateMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;

    const handleDrawerSave = async (payload) => {
        if (isActivated) {
            await updateMutation.mutateAsync({ id: pkg.clinicPackage.id, ...payload });
        } else {
            await activateMutation.mutateAsync({ packageId: pkg.id, ...payload });
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

                        {isActivated ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                                Klinika narxi: {fmt(pkg.clinicPackage?.clinicPrice)} UZS
                            </span>
                        ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Narxni klinika belgilaydi
                            </span>
                        )}
                    </div>

                    {/* Services list */}
                    {itemsOpen && (
                        <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--border-color)' }}>
                            {(pkg.items || []).map(item => {
                                const clinicItemPrice = pkg.clinicPackage?.itemPrices?.[item.id];
                                return (
                                    <div key={item.id} style={{ fontSize: 12, color: 'var(--text-main)', padding: '2px 0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                        <span>✓ {item.serviceName}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
                                        {isActivated && typeof clinicItemPrice === 'number' && clinicItemPrice > 0 && (
                                            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{fmt(clinicItemPrice)} UZS</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {!isActivated && (
                        <button className="ca-btn-primary" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => setDrawerOpen(true)}>
                            Aktivlashtirish
                        </button>
                    )}
                    {isActivated && (
                        <>
                            <button className="ca-icon-btn" title="Narx va ma'lumotlarni tahrirlash" onClick={() => setDrawerOpen(true)}>
                                <Settings2 size={15} />
                            </button>
                            <button className="ca-icon-btn danger" title="Nofaol qilish" onClick={() => setConfirmDeactivate(true)}>
                                <X size={15} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Right-side drawer ── */}
            <CheckupPackageDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                pkg={pkg}
                activateMode={!isActivated}
                onSave={handleDrawerSave}
            />

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
