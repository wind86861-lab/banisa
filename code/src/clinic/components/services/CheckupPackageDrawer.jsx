import { useState, useEffect } from 'react';
import { X, Loader2, Save, Check, Upload, Image as ImageIcon, Package2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../shared/api/axios';
import '../../pages/clinic-admin.css';

const TABS = [
    { key: 0, label: 'Asosiy' },
    { key: 1, label: 'Tavsif' },
    { key: 2, label: 'Xizmatlar' },
    { key: 3, label: 'Rasmlar' },
];

const EMPTY_FORM = {
    customNameUz: '',
    customNameRu: '',
    clinicPrice: '',
    discountPercent: '',
    customNotes: '',
    customShortDescription: '',
    customFullDescription: '',
    customTargetAudience: '',
    customImageUrl: '',
};

function BasicTab({ form, setForm, basePackage }) {
    const priceNum = Number(form.clinicPrice);
    const priceValid = form.clinicPrice !== '' && !isNaN(priceNum) && priceNum >= (basePackage.priceMin ?? 0) && priceNum <= (basePackage.priceMax ?? Infinity);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Base info */}
            <div style={{
                padding: '12px 16px', background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10,
            }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{basePackage.nameUz}</div>
                {basePackage.nameRu && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{basePackage.nameRu}</div>
                )}
            </div>

            {/* Custom naming */}
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

            {/* Price + Discount */}
            <div className="ca-form-row">
                <div className="ca-form-group">
                    <label>Klinika narxi (UZS) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        type="number"
                        value={form.clinicPrice}
                        onChange={e => setForm({ ...form, clinicPrice: e.target.value })}
                        placeholder={String(basePackage.recommendedPrice ?? basePackage.priceMin ?? 0)}
                        min={basePackage.priceMin}
                        max={basePackage.priceMax}
                        step={1000}
                        required
                        style={{
                            border: `1.5px solid ${priceValid ? 'var(--color-primary)' : form.clinicPrice !== '' ? '#ef4444' : 'var(--border-color)'}`,
                        }}
                    />
                    <span className="ca-hint">Diapazon: {Number(basePackage.priceMin).toLocaleString('uz-UZ')} – {Number(basePackage.priceMax).toLocaleString('uz-UZ')} UZS</span>
                </div>
                <div className="ca-form-group">
                    <label>Chegirma (%)</label>
                    <input
                        type="number"
                        value={form.discountPercent}
                        onChange={e => setForm({ ...form, discountPercent: e.target.value })}
                        placeholder="0"
                        min="0"
                        max="100"
                    />
                </div>
            </div>

            {/* Notes */}
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
                <span className="ca-hint">Bo'sh qoldirilsa, standart tavsif ishlatiladi</span>
            </div>

            <div className="ca-form-group">
                <label>To'liq tavsif</label>
                <textarea
                    value={form.customFullDescription}
                    onChange={e => setForm({ ...form, customFullDescription: e.target.value })}
                    placeholder={basePackage.fullDescription || 'Paket tarkibi, qanday o\'tishi, natijalar haqida batafsil...'}
                    rows={8}
                />
                <span className="ca-hint">Bemorlar uchun tushunarli tilda yozing</span>
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

function ServicesTab({ items }) {
    if (!items || items.length === 0) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Package2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>Bu paketda xizmatlar yo'q</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
                padding: '10px 14px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 10, fontSize: 13,
            }}>
                <strong>{items.length}</strong> ta xizmat paket tarkibida
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, idx) => (
                    <div key={item.id || idx} style={{
                        padding: '10px 14px',
                        background: 'var(--bg-main)',
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
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
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {item.servicePrice > 0 && `${Number(item.servicePrice).toLocaleString('uz-UZ')} UZS`}
                        </div>
                    </div>
                ))}
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
            <div style={{
                padding: '12px 16px',
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: 10, fontSize: 13,
            }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Paket rasmi</div>
                <div style={{ color: 'var(--text-muted)' }}>
                    Bu rasm bemorlar uchun paket sahifasida ko'rsatiladi.
                </div>
            </div>

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
                    {!form.customImageUrl && basePackage.imageUrl && (
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '8px 12px', background: 'rgba(0,0,0,0.6)',
                            color: 'white', fontSize: 11,
                        }}>
                            Standart rasm (o'zgartirish uchun yangi rasm yuklang)
                        </div>
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
    const [priceError, setPriceError] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saving, setSaving] = useState(false);

    const basePackage = pkg?.package || pkg;
    const existingCustom = pkg?.clinicPackage?.customizationData || {};

    useEffect(() => {
        if (!open) {
            setActiveTab(0);
            setForm({ ...EMPTY_FORM });
            setPriceError(false);
            setSaveError(null);
            setSaving(false);
            return;
        }
        // Pre-fill from existing customization data
        setForm({
            ...EMPTY_FORM,
            clinicPrice: String(pkg?.clinicPackage?.clinicPrice ?? pkg?.recommendedPrice ?? pkg?.priceMin ?? ''),
            customNotes: pkg?.clinicPackage?.customNotes ?? '',
            customNameUz: existingCustom.customNameUz ?? '',
            customNameRu: existingCustom.customNameRu ?? '',
            discountPercent: existingCustom.discountPercent ?? '',
            customShortDescription: existingCustom.customShortDescription ?? '',
            customFullDescription: existingCustom.customFullDescription ?? '',
            customTargetAudience: existingCustom.customTargetAudience ?? '',
            customImageUrl: existingCustom.customImageUrl ?? '',
        });
    }, [open, pkg]);

    const handleSave = async () => {
        const priceNum = Math.round(Number(form.clinicPrice));
        const min = basePackage?.priceMin ?? 0;
        const max = basePackage?.priceMax ?? Infinity;
        if (!form.clinicPrice || isNaN(priceNum) || priceNum < min || priceNum > max) {
            setPriceError(true);
            setActiveTab(0);
            return;
        }
        setPriceError(false);
        setSaving(true);
        setSaveError(null);

        try {
            const customizationData = {
                customNameUz: form.customNameUz || undefined,
                customNameRu: form.customNameRu || undefined,
                discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
                customShortDescription: form.customShortDescription || undefined,
                customFullDescription: form.customFullDescription || undefined,
                customTargetAudience: form.customTargetAudience || undefined,
                customImageUrl: form.customImageUrl || undefined,
            };
            await onSave({
                clinicPrice: priceNum,
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
                        {/* Header */}
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

                        {/* Activate banner */}
                        {activateMode && (
                            <div style={{
                                margin: '0 20px', padding: '10px 14px',
                                background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.25)',
                                borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ fontSize: 18 }}>💡</span>
                                <span>Paketni aktivlashtirish uchun <strong style={{ color: 'var(--color-primary)' }}>Klinika narxi</strong> va asosiy ma'lumotlarni kiriting.</span>
                            </div>
                        )}

                        {/* Price error */}
                        {priceError && (
                            <div style={{
                                margin: '8px 20px 0', padding: '8px 14px',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8, fontSize: 13, color: '#ef4444',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>⚠️</span>
                                <span><strong>Narx</strong> to'g'ri diapazonda kiritilishi shart!</span>
                            </div>
                        )}

                        {/* Tabs */}
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

                        {/* Body */}
                        <div className="ca-drawer-body">
                            {activeTab === 0 && <BasicTab form={form} setForm={setForm} basePackage={basePackage} />}
                            {activeTab === 1 && <DescriptionTab form={form} setForm={setForm} basePackage={basePackage} />}
                            {activeTab === 2 && <ServicesTab items={basePackage?.items || basePackage?.package?.items} />}
                            {activeTab === 3 && <ImagesTab form={form} setForm={setForm} basePackage={basePackage} />}
                        </div>

                        {/* Save error */}
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

                        {/* Footer */}
                        <div className="ca-drawer-footer">
                            <button className="ca-btn-secondary" onClick={onClose} disabled={saving}>Bekor qilish</button>
                            <button
                                className="ca-btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={handleSave}
                                disabled={saving}
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
