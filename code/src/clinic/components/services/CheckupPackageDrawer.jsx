import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Check, Upload, Package2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../shared/api/axios';
import '../../pages/clinic-admin.css';

const TABS = [
    { key: 0, label: 'Asosiy' },
    { key: 1, label: 'Tavsif' },
    { key: 2, label: 'Narxlar' },
    { key: 3, label: 'Rasmlar' },
];

const EMPTY_FORM = {
    customNameUz: '',
    customNameRu: '',
    customNotes: '',
    customShortDescription: '',
    customFullDescription: '',
    customTargetAudience: '',
    customImageUrl: '',
    itemPrices: {},
};

function fmt(n) {
    return Number(n || 0).toLocaleString('uz-UZ');
}

function BasicTab({ form, setForm, basePackage, totalPrice }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                padding: '12px 16px', background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10,
            }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{basePackage.nameUz}</div>
                {basePackage.nameRu && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{basePackage.nameRu}</div>
                )}
            </div>

            <div className="ca-form-group">
                <label>Klinikangiz nomlanishi (Uz)</label>
                <input
                    type="text"
                    value={form.customNameUz}
                    onChange={e => setForm({ ...form, customNameUz: e.target.value })}
                    placeholder={basePackage.nameUz}
                />
                <span className="ca-hint">Bo'sh qoldirilsa, standart nom ishlatiladi</span>
            </div>

            <div className="ca-form-group">
                <label>Klinikangiz nomlanishi (Ru)</label>
                <input
                    type="text"
                    value={form.customNameRu}
                    onChange={e => setForm({ ...form, customNameRu: e.target.value })}
                    placeholder={basePackage.nameRu || ''}
                />
            </div>

            {/* Live total — readonly, sum of per-item prices */}
            <div style={{
                padding: '14px 16px',
                background: totalPrice > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${totalPrice > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                borderRadius: 10,
            }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Paket umumiy narxi (har bir analiz narxidan hisoblanadi)
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: totalPrice > 0 ? '#059669' : '#ef4444' }}>
                    {fmt(totalPrice)} UZS
                </div>
                {totalPrice === 0 && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                        ⚠ "Narxlar" bo'limida har bir analiz uchun narx kiriting
                    </div>
                )}
            </div>

            <div className="ca-form-group">
                <label>Qo'shimcha ma'lumot <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ixtiyoriy)</span></label>
                <textarea
                    value={form.customNotes}
                    onChange={e => setForm({ ...form, customNotes: e.target.value })}
                    placeholder="Masalan: erta tonggi tekshiruv, maxsus tayyorgarlik, murojaat vaqti..."
                    rows={3}
                />
            </div>
        </div>
    );
}

function DescriptionTab({ form, setForm, basePackage }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ca-form-group">
                <label>Qisqacha tavsif</label>
                <textarea
                    value={form.customShortDescription}
                    onChange={e => setForm({ ...form, customShortDescription: e.target.value })}
                    placeholder={basePackage.shortDescription || 'Paket haqida qisqacha...'}
                    rows={3}
                />
            </div>
            <div className="ca-form-group">
                <label>To'liq tavsif</label>
                <textarea
                    value={form.customFullDescription}
                    onChange={e => setForm({ ...form, customFullDescription: e.target.value })}
                    placeholder={basePackage.fullDescription || 'Paket tarkibi, qanday o\'tishi, natijalar haqida batafsil...'}
                    rows={8}
                />
            </div>
            <div className="ca-form-group">
                <label>Maqsadli auditoriya</label>
                <input
                    type="text"
                    value={form.customTargetAudience}
                    onChange={e => setForm({ ...form, customTargetAudience: e.target.value })}
                    placeholder={basePackage.targetAudience || 'Masalan: 40+ yoshdagi erkaklar'}
                />
            </div>
        </div>
    );
}

function PricesTab({ items, form, setForm, totalPrice }) {
    if (!items || items.length === 0) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Package2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>Bu paketda xizmatlar yo'q</p>
            </div>
        );
    }

    const setItemPrice = (id, value) => {
        const num = value === '' ? undefined : Math.max(0, Math.round(Number(value) || 0));
        const next = { ...(form.itemPrices || {}) };
        if (num === undefined) delete next[id];
        else next[id] = num;
        setForm({ ...form, itemPrices: next });
    };

    const fillFromReference = () => {
        const next = {};
        for (const it of items) {
            next[it.id] = Math.max(0, Math.round(it.servicePrice || 0));
        }
        setForm({ ...form, itemPrices: next });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
                padding: '12px 14px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 10, fontSize: 13,
            }}>
                <strong>{items.length}</strong> ta analiz — har biri uchun klinika narxini kiriting.
                Umumiy paket narxi avtomatik hisoblanadi.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <button
                    type="button"
                    onClick={fillFromReference}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', background: 'transparent',
                        border: '1px solid var(--border-color)', borderRadius: 8,
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-muted)',
                    }}
                    title="Super-admin tavsiya narxlaridan ko'chirib olish"
                >
                    <Wand2 size={14} /> Tavsiya narxlar bilan to'ldirish
                </button>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                    Jami: {fmt(totalPrice)} UZS
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((item, idx) => {
                    const id = item.id;
                    const value = form.itemPrices?.[id];
                    const refPrice = item.servicePrice || 0;
                    return (
                        <div key={id || idx} style={{
                            padding: '10px 12px',
                            background: 'var(--bg-main)',
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px',
                            gap: 10,
                            alignItems: 'center',
                        }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    {idx + 1}. {item.serviceName}
                                    {item.quantity > 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ×{item.quantity}</span>}
                                </div>
                                {item.notes && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.notes}</div>
                                )}
                                {refPrice > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        tavsiya: {fmt(refPrice)} UZS
                                    </div>
                                )}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    step="1000"
                                    value={value === undefined ? '' : value}
                                    onChange={e => setItemPrice(id, e.target.value)}
                                    placeholder={String(refPrice || 0)}
                                    style={{
                                        width: '100%', padding: '8px 36px 8px 10px',
                                        border: '1px solid var(--border-color)', borderRadius: 6,
                                        fontSize: 13, textAlign: 'right',
                                    }}
                                />
                                <span style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none',
                                }}>UZS</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ImagesTab({ form, setForm, basePackage }) {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('images', file);
            const res = await api.post('/upload/service-images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const urls = res.data?.data?.urls || [];
            if (urls[0]) setForm({ ...form, customImageUrl: urls[0] });
        } catch (error) {
            alert('Rasm yuklashda xatolik: ' + (error?.response?.data?.message || error.message));
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const currentImage = form.customImageUrl || basePackage.imageUrl;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {currentImage && (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img
                        src={currentImage}
                        alt="Paket rasmi"
                        style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                    />
                    {form.customImageUrl && (
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, customImageUrl: '' })}
                            style={{
                                position: 'absolute', top: 8, right: 8,
                                padding: '6px 10px', background: 'rgba(239,68,68,0.9)',
                                border: 'none', borderRadius: 6, color: 'white',
                                fontSize: 11, cursor: 'pointer', fontWeight: 600,
                            }}
                        >
                            O'chirish
                        </button>
                    )}
                </div>
            )}

            <label style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '32px 20px',
                border: '2px dashed var(--border-color)',
                borderRadius: 12,
                cursor: uploading ? 'not-allowed' : 'pointer',
                background: 'var(--bg-secondary)',
                opacity: uploading ? 0.6 : 1,
            }}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    style={{ display: 'none' }}
                />
                {uploading ? (
                    <Loader2 size={32} className="ca-spin" style={{ color: 'var(--color-primary)' }} />
                ) : (
                    <Upload size={32} style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
                )}
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {uploading ? 'Yuklanmoqda...' : 'Rasm yuklash'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    JPG, PNG yoki WebP (maks. 5MB)
                </div>
            </label>

            <div className="ca-form-group">
                <label>Yoki rasm URL manzilini kiriting</label>
                <input
                    type="text"
                    value={form.customImageUrl}
                    onChange={e => setForm({ ...form, customImageUrl: e.target.value })}
                    placeholder="https://..."
                />
            </div>
        </div>
    );
}

export default function CheckupPackageDrawer({
    open, onClose, pkg,
    activateMode = false,
    onSave,
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saveError, setSaveError] = useState(null);
    const [saving, setSaving] = useState(false);

    const basePackage = pkg?.package || pkg;
    const existingCustom = pkg?.clinicPackage?.customizationData || {};
    const items = basePackage?.items || basePackage?.package?.items || [];

    const totalPrice = useMemo(() => {
        let total = 0;
        for (const it of items) {
            const p = form.itemPrices?.[it.id];
            if (typeof p === 'number' && p > 0) total += p * (it.quantity || 1);
        }
        return total;
    }, [form.itemPrices, items]);

    useEffect(() => {
        if (!open) {
            setActiveTab(0);
            setForm({ ...EMPTY_FORM });
            setSaveError(null);
            setSaving(false);
            return;
        }
        // Seed itemPrices: prefer clinic's existing values, else scale super-admin's to match clinicPrice, else use super-admin's raw values.
        let seededItemPrices = {};
        const existingMap = pkg?.clinicPackage?.itemPrices;
        const existingClinicPrice = pkg?.clinicPackage?.clinicPrice;
        const baseSum = items.reduce((s, i) => s + (i.servicePrice || 0) * (i.quantity || 1), 0);

        if (existingMap && typeof existingMap === 'object') {
            seededItemPrices = { ...existingMap };
        } else if (existingClinicPrice && baseSum > 0) {
            const ratio = existingClinicPrice / baseSum;
            for (const it of items) {
                seededItemPrices[it.id] = Math.round((it.servicePrice || 0) * ratio);
            }
        } else if (activateMode) {
            for (const it of items) {
                seededItemPrices[it.id] = Math.max(0, Math.round(it.servicePrice || 0));
            }
        }

        setForm({
            ...EMPTY_FORM,
            itemPrices: seededItemPrices,
            customNotes: pkg?.clinicPackage?.customNotes ?? '',
            customNameUz: existingCustom.customNameUz ?? '',
            customNameRu: existingCustom.customNameRu ?? '',
            customShortDescription: existingCustom.customShortDescription ?? '',
            customFullDescription: existingCustom.customFullDescription ?? '',
            customTargetAudience: existingCustom.customTargetAudience ?? '',
            customImageUrl: existingCustom.customImageUrl ?? '',
        });
    }, [open, pkg]);

    const handleSave = async () => {
        if (totalPrice <= 0) {
            setSaveError('Iltimos, har bir analiz uchun narx kiriting (Narxlar bo\'limi).');
            setActiveTab(2);
            return;
        }
        setSaving(true);
        setSaveError(null);

        try {
            const customizationData = {
                customNameUz: form.customNameUz || undefined,
                customNameRu: form.customNameRu || undefined,
                customShortDescription: form.customShortDescription || undefined,
                customFullDescription: form.customFullDescription || undefined,
                customTargetAudience: form.customTargetAudience || undefined,
                customImageUrl: form.customImageUrl || undefined,
            };
            await onSave({
                itemPrices: form.itemPrices,
                customNotes: form.customNotes || undefined,
                customizationData,
            });
            onClose();
        } catch (err) {
            setSaveError(err?.response?.data?.message || 'Saqlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    if (!open || !pkg) return null;

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="ca-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="ca-drawer"
                        style={{ width: 680, maxWidth: '92vw' }}
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.28 }}
                    >
                        <div className="ca-drawer-header">
                            <div>
                                <span className="ca-drawer-title">
                                    {activateMode ? 'Aktivlashtirish' : 'Paketni tahrirlash'}
                                </span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {basePackage?.nameUz}
                                </div>
                            </div>
                            <button className="ca-drawer-close" onClick={onClose}><X size={20} /></button>
                        </div>

                        {activateMode && (
                            <div style={{
                                margin: '0 20px', padding: '10px 14px',
                                background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.25)',
                                borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ fontSize: 18 }}>💡</span>
                                <span><strong style={{ color: 'var(--color-primary)' }}>Narxlar</strong> bo'limida har bir analiz narxini kiriting — paket umumiy narxi shu yig'indidan tushadi.</span>
                            </div>
                        )}

                        <div className="ca-tabs" style={{ padding: '0 20px', borderBottom: '1px solid var(--border-color)' }}>
                            {TABS.map(t => (
                                <button
                                    key={t.key}
                                    className={`ca-tab${activeTab === t.key ? ' active' : ''}`}
                                    onClick={() => setActiveTab(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="ca-drawer-body">
                            {activeTab === 0 && <BasicTab form={form} setForm={setForm} basePackage={basePackage} totalPrice={totalPrice} />}
                            {activeTab === 1 && <DescriptionTab form={form} setForm={setForm} basePackage={basePackage} />}
                            {activeTab === 2 && <PricesTab items={items} form={form} setForm={setForm} totalPrice={totalPrice} />}
                            {activeTab === 3 && <ImagesTab form={form} setForm={setForm} basePackage={basePackage} />}
                        </div>

                        {saveError && (
                            <div style={{
                                margin: '0 20px', padding: '10px 14px',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8, fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>⚠️</span>
                                <span>{saveError}</span>
                            </div>
                        )}

                        <div className="ca-drawer-footer">
                            <button className="ca-btn-secondary" onClick={onClose} disabled={saving}>Bekor qilish</button>
                            <button
                                className="ca-btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={handleSave}
                                disabled={saving || totalPrice <= 0}
                            >
                                {saving ? <Loader2 size={14} className="ca-spin" /> : <Check size={14} />}
                                {activateMode ? 'Saqlash va Aktivlashtirish' : 'Saqlash'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
