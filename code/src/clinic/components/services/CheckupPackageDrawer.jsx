import { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, Loader2, Check, Upload, Package2, Wand2, AlertTriangle,
    Search, Eye, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight,
    Copy, Info, CheckCircle2, Circle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../shared/api/axios';
import BlockedDatesPicker from '../BlockedDatesPicker';
import '../../pages/clinic-admin.css';

const TABS = [
    { key: 0, label: 'Asosiy', icon: Info },
    { key: 1, label: 'Tavsif', icon: Copy },
    { key: 2, label: 'Narxlar', icon: Package2 },
    { key: 3, label: 'Rasmlar', icon: ImageIcon },
    { key: 4, label: 'Ko\'rinish', icon: Eye },
];

const MAX_IMAGES = 5;
const SANITY_HIGH = 5;   // input > 5x clinic's own price → flag
const SANITY_LOW = 0.2;  // input < 0.2x clinic's own price → flag

const EMPTY_FORM = {
    customNameUz: '',
    customNameRu: '',
    customNotes: '',
    customShortDescription: '',
    customFullDescription: '',
    customTargetAudience: '',
    customImageUrl: '',
    customImages: [],
    itemPrices: {},
    discountPercent: 0,  // clinic-set discount off the total package price
};

const fmt = (n) => Number(n || 0).toLocaleString('uz-UZ');

// Display "165 000" while the underlying value is the raw integer.
function PriceInput({ value, onChange, placeholder, danger }) {
    const display = value === undefined || value === null || value === ''
        ? ''
        : Number(value).toLocaleString('uz-UZ');
    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                inputMode="numeric"
                value={display}
                onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    onChange(raw === '' ? '' : Number(raw));
                }}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '8px 40px 8px 10px',
                    border: `1px solid ${danger ? 'rgba(239,68,68,0.55)' : 'var(--border-color)'}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'right',
                    background: danger ? 'rgba(239,68,68,0.04)' : undefined,
                }}
            />
            <span style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none',
            }}>UZS</span>
        </div>
    );
}

// ───────────────────────────── Tab: Asosiy ─────────────────────────────
function BasicTab({ form, setForm, basePackage }) {
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

// ───────────────────────────── Tab: Tavsif ─────────────────────────────
// Field is defined at module scope (not inside DescriptionTab) so React doesn't
// remount the input on every keystroke — that previously caused focus loss
// and could swallow input events on slow renders.
function DescriptionField({ label, field, multiline, rows = 3, adminValue, form, setForm }) {
    const copyFromAdmin = () => {
        if (!adminValue) return;
        setForm(prev => ({ ...prev, [field]: adminValue }));
    };
    return (
        <div className="ca-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>{label}</label>
                {adminValue && (
                    <button
                        type="button"
                        onClick={copyFromAdmin}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, padding: 0,
                        }}
                    >
                        <Copy size={11} /> Standart tavsifdan ko'chirish
                    </button>
                )}
            </div>
            {multiline ? (
                <textarea
                    value={form[field] || ''}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={adminValue || ''}
                    rows={rows}
                />
            ) : (
                <input
                    type="text"
                    value={form[field] || ''}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={adminValue || ''}
                />
            )}
        </div>
    );
}

function DescriptionTab({ form, setForm, basePackage }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DescriptionField
                label="Qisqacha tavsif"
                field="customShortDescription"
                multiline rows={3}
                adminValue={basePackage.shortDescription}
                form={form}
                setForm={setForm}
            />
            <DescriptionField
                label="To'liq tavsif"
                field="customFullDescription"
                multiline rows={8}
                adminValue={basePackage.fullDescription}
                form={form}
                setForm={setForm}
            />
            <DescriptionField
                label="Maqsadli auditoriya"
                field="customTargetAudience"
                adminValue={basePackage.targetAudience}
                form={form}
                setForm={setForm}
            />
        </div>
    );
}

// ───────────────────────────── Tab: Narxlar ─────────────────────────────
function PricesTab({ items, form, setForm, totalPrice, packageId }) {
    const [search, setSearch] = useState('');

    if (!items || items.length === 0) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Package2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>Bu paketda xizmatlar yo'q</p>
            </div>
        );
    }

    const setItemPrice = (id, value) => {
        const next = { ...(form.itemPrices || {}) };
        if (value === '' || value === undefined) delete next[id];
        else next[id] = Math.max(0, Math.round(Number(value) || 0));
        setForm({ ...form, itemPrices: next });
    };

    const fillFromClinic = () => {
        // Fill every item so the clinic isn't left with empty inputs:
        //   1. Clinic's own price for that diagnostic (when activated)
        //   2. Catalog's recommended price as a starting suggestion (editable)
        //   3. 0 only when neither exists
        // Admin's price is used only as a starting value the clinic can change —
        // it's never shown as a label or persisted as "admin's price".
        const next = {};
        for (const it of items) {
            const own = typeof it.clinicServicePrice === 'number' && it.clinicServicePrice > 0
                ? it.clinicServicePrice
                : null;
            const fallback = Math.max(0, Math.round(it.servicePrice || 0));
            next[it.id] = own ?? fallback;
        }
        setForm({ ...form, itemPrices: next });
    };

    const bulkAdjust = (pct) => {
        const next = { ...(form.itemPrices || {}) };
        for (const it of items) {
            const current = next[it.id];
            if (typeof current !== 'number' || current <= 0) continue;
            const adjusted = Math.max(0, Math.round(current * (1 + pct / 100)));
            next[it.id] = Math.round(adjusted / 1000) * 1000;
        }
        setForm({ ...form, itemPrices: next });
    };

    const filteredItems = search.trim()
        ? items.filter(it => (it.serviceName || '').toLowerCase().includes(search.trim().toLowerCase()))
        : items;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Quick-fill + bulk adjust */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                    type="button"
                    onClick={fillFromClinic}
                    style={quickBtnStyle('#059669')}
                    title="Klinika xizmat narxlaridan qayta to'ldirish"
                >
                    <Wand2 size={13} /> Klinika narxlarim bilan to'ldirish
                </button>
                <div style={{ width: 1, background: 'var(--border-color)', margin: '0 4px' }} />
                <button type="button" onClick={() => bulkAdjust(-10)} style={quickBtnStyle('#ef4444')}>−10%</button>
                <button type="button" onClick={() => bulkAdjust(-5)} style={quickBtnStyle('#ef4444')}>−5%</button>
                <button type="button" onClick={() => bulkAdjust(5)} style={quickBtnStyle('#059669')}>+5%</button>
                <button type="button" onClick={() => bulkAdjust(10)} style={quickBtnStyle('#059669')}>+10%</button>
            </div>

            {/* Search */}
            {items.length > 6 && (
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                    }} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Xizmat nomi bo'yicha qidiruv..."
                        style={{
                            width: '100%', padding: '8px 10px 8px 32px',
                            border: '1px solid var(--border-color)', borderRadius: 8,
                            fontSize: 13,
                        }}
                    />
                </div>
            )}

            {/* Summary */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 10, fontSize: 13,
            }}>
                <span><strong>{items.length}</strong> ta analiz</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                    Jami: {fmt(totalPrice)} UZS
                </span>
            </div>

            {/* Clinic-set discount on the package total */}
            <div style={{
                padding: '12px 14px',
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.18)',
                borderRadius: 10,
                display: 'grid', gap: 8,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        Chegirma foizi (umumiy narxdan)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={form.discountPercent ?? 0}
                            onChange={e => {
                                const v = e.target.value === '' ? 0 : Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                setForm({ ...form, discountPercent: v });
                            }}
                            style={{
                                width: 80, padding: '6px 10px', fontSize: 14, fontWeight: 700,
                                border: '1px solid #d1d5db', borderRadius: 8, textAlign: 'right',
                                fontFamily: 'inherit',
                            }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>%</span>
                    </div>
                </div>
                {(form.discountPercent ?? 0) > 0 && totalPrice > 0 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                        fontSize: 13,
                    }}>
                        <div style={{ color: 'var(--text-muted)' }}>
                            Bemorga ko'rinadigan yakuniy narx:
                        </div>
                        <div>
                            <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginRight: 8 }}>
                                {fmt(totalPrice)}
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>
                                {fmt(Math.round(totalPrice * (1 - (form.discountPercent ?? 0) / 100)))} so'm
                            </span>
                        </div>
                    </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    0% chegirma → patient {fmt(totalPrice)} so'm to'laydi. 10% chegirma → {fmt(Math.round(totalPrice * 0.9))} so'm.
                </div>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredItems.map((item, idx) => {
                    const id = item.id;
                    const value = form.itemPrices?.[id];
                    const clinicPrice = item.clinicServicePrice;
                    const hasClinicPrice = typeof clinicPrice === 'number' && clinicPrice > 0;

                    let sanity = null;
                    if (typeof value === 'number' && hasClinicPrice) {
                        const ratio = value / clinicPrice;
                        if (ratio > SANITY_HIGH) sanity = { msg: `Klinika narxidan ${ratio.toFixed(1)}x baland — xato bo'lishi mumkin` };
                        else if (ratio < SANITY_LOW && value > 0) sanity = { msg: `Klinika narxidan ${ratio.toFixed(2)}x past — xato bo'lishi mumkin` };
                    }

                    return (
                        <div key={id || idx} style={{
                            padding: '10px 12px',
                            background: 'var(--bg-main)',
                            borderRadius: 8,
                            border: `1px solid ${sanity ? 'rgba(245,158,11,0.4)' : 'var(--border-color)'}`,
                            display: 'grid',
                            gridTemplateColumns: '1fr 160px',
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
                                {hasClinicPrice && (
                                    <div style={{ marginTop: 4 }}>
                                        <span style={pillStyle('#059669')}>klinika narxim: {fmt(clinicPrice)} so'm</span>
                                    </div>
                                )}
                                {sanity && (
                                    <div style={{
                                        marginTop: 6, fontSize: 11, color: '#b45309',
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                    }}>
                                        <AlertTriangle size={11} /> {sanity.msg}
                                    </div>
                                )}
                            </div>
                            <PriceInput
                                value={value}
                                onChange={v => setItemPrice(id, v)}
                                placeholder={hasClinicPrice ? String(clinicPrice) : '0'}
                                danger={!!sanity}
                            />
                        </div>
                    );
                })}
                {filteredItems.length === 0 && (
                    <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                        Qidiruvga mos xizmat topilmadi
                    </div>
                )}
            </div>

            {packageId && <BlockedDatesPicker serviceType="CHECKUP" serviceId={packageId} />}
        </div>
    );
}

function pillStyle(color) {
    return {
        fontSize: 10, fontWeight: 700, color,
        background: `${color}1A`,
        padding: '2px 6px', borderRadius: 10,
    };
}

function quickBtnStyle(color) {
    return {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '6px 10px',
        background: 'transparent',
        border: `1px solid ${color}55`,
        borderRadius: 6,
        cursor: 'pointer', fontSize: 11, fontWeight: 700,
        color,
    };
}

// ───────────────────────────── Tab: Rasmlar ─────────────────────────────
function ImagesTab({ form, setForm, basePackage }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const images = form.customImages || [];
    const fallbackImage = images[0] || form.customImageUrl || basePackage.imageUrl;

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const room = MAX_IMAGES - images.length;
        if (room <= 0) {
            alert(`Eng ko'pi ${MAX_IMAGES} ta rasm yuklash mumkin.`);
            e.target.value = '';
            return;
        }
        const chosen = files.slice(0, room);
        setUploading(true);
        try {
            const formData = new FormData();
            chosen.forEach(f => formData.append('images', f));
            const res = await api.post('/upload/service-images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const urls = res.data?.data?.urls || [];
            const next = [...images, ...urls].slice(0, MAX_IMAGES);
            setForm({ ...form, customImages: next, customImageUrl: next[0] || '' });
        } catch (error) {
            alert('Rasm yuklashda xatolik: ' + (error?.response?.data?.message || error.message));
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removeImage = (idx) => {
        const next = images.filter((_, i) => i !== idx);
        setForm({ ...form, customImages: next, customImageUrl: next[0] || '' });
    };

    const moveImage = (idx, dir) => {
        const j = idx + dir;
        if (j < 0 || j >= images.length) return;
        const next = [...images];
        [next[idx], next[j]] = [next[j], next[idx]];
        setForm({ ...form, customImages: next, customImageUrl: next[0] || '' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {images.length === 0 && fallbackImage && (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={fallbackImage} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                    <div style={{
                        position: 'absolute', top: 8, left: 8,
                        padding: '4px 10px', background: 'rgba(0,0,0,0.6)',
                        color: 'white', fontSize: 11, fontWeight: 600, borderRadius: 6,
                    }}>Admin rasmi (default)</div>
                </div>
            )}

            {images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {images.map((url, idx) => (
                        <div key={idx} style={{
                            position: 'relative', borderRadius: 10, overflow: 'hidden',
                            border: idx === 0 ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                            aspectRatio: '4/3',
                        }}>
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {idx === 0 && (
                                <div style={{
                                    position: 'absolute', top: 4, left: 4,
                                    padding: '2px 8px', background: 'var(--color-primary)',
                                    color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 4,
                                }}>Asosiy</div>
                            )}
                            <div style={{
                                position: 'absolute', top: 4, right: 4,
                                display: 'flex', gap: 2,
                            }}>
                                <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0}
                                    style={imgBtnStyle(idx === 0)}><ChevronLeft size={11} /></button>
                                <button type="button" onClick={() => moveImage(idx, +1)} disabled={idx === images.length - 1}
                                    style={imgBtnStyle(idx === images.length - 1)}><ChevronRight size={11} /></button>
                                <button type="button" onClick={() => removeImage(idx)}
                                    style={{ ...imgBtnStyle(false), background: 'rgba(239,68,68,0.85)' }}><Trash2 size={11} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <label style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '24px 20px',
                border: '2px dashed var(--border-color)',
                borderRadius: 12,
                cursor: uploading || images.length >= MAX_IMAGES ? 'not-allowed' : 'pointer',
                background: 'var(--bg-secondary)',
                opacity: uploading || images.length >= MAX_IMAGES ? 0.6 : 1,
            }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading || images.length >= MAX_IMAGES}
                    style={{ display: 'none' }}
                />
                {uploading ? (
                    <Loader2 size={28} className="ca-spin" style={{ color: 'var(--color-primary)' }} />
                ) : (
                    <Upload size={28} style={{ color: 'var(--color-primary)', marginBottom: 6 }} />
                )}
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {uploading ? 'Yuklanmoqda...' : images.length >= MAX_IMAGES ? 'Limit yetib bo\'ldi' : 'Rasm yuklash'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {images.length}/{MAX_IMAGES} · JPG, PNG, WebP (maks. 5MB har biri)
                </div>
            </label>
        </div>
    );
}

function imgBtnStyle(disabled) {
    return {
        width: 22, height: 22, borderRadius: 4,
        background: 'rgba(0,0,0,0.55)', border: 'none',
        color: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
    };
}

// ───────────────────────────── Tab: Ko'rinish (Preview) ─────────────────────────────
function PreviewTab({ form, items, totalPrice, basePackage }) {
    const title = form.customNameUz || basePackage.nameUz;
    const desc = form.customShortDescription || basePackage.shortDescription;
    const fullDesc = form.customFullDescription || basePackage.fullDescription;
    const images = form.customImages?.length ? form.customImages : (basePackage.imageUrl ? [basePackage.imageUrl] : []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
                padding: '8px 12px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 8, fontSize: 12, color: 'var(--text-muted)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
                <Eye size={13} /> Bemorga shu ko'rinishda chiqadi (simulyatsiya)
            </div>

            {images[0] && (
                <img src={images[0]} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10 }} />
            )}

            <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
                {desc && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{desc}</div>}
            </div>

            <div style={{
                padding: '10px 14px', background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paket narxi</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    {(form.discountPercent ?? 0) > 0 && (
                        <>
                            <span style={{ fontSize: 13, textDecoration: 'line-through', color: '#94a3b8' }}>
                                {fmt(totalPrice)}
                            </span>
                            <span style={{
                                fontSize: 11, fontWeight: 700, color: '#dc2626',
                                background: '#fee2e2', padding: '2px 6px', borderRadius: 6,
                            }}>
                                −{form.discountPercent}%
                            </span>
                        </>
                    )}
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>
                        {fmt((form.discountPercent ?? 0) > 0
                            ? Math.round(totalPrice * (1 - (form.discountPercent ?? 0) / 100))
                            : totalPrice)} so'm
                    </span>
                </div>
            </div>

            {fullDesc && (
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Tavsif</div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {fullDesc}
                    </div>
                </div>
            )}

            <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Paketga kiruvchi tahlillar</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map((it, i) => {
                        const price = form.itemPrices?.[it.id] ?? 0;
                        return (
                            <div key={it.id || i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '6px 0', borderBottom: '1px dashed var(--border-color)',
                                fontSize: 13,
                            }}>
                                <span>✓ {it.serviceName}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
                                {price > 0 && <span style={{ color: 'var(--text-muted)' }}>{fmt(price)} so'm</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ───────────────────────────── Main drawer ─────────────────────────────
export default function CheckupPackageDrawer({
    open, onClose, pkg,
    activateMode = false,
    onSave,
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [initialFormSnapshot, setInitialFormSnapshot] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);

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

    // Per-tab status — for badges on the tab strip
    const tabStatus = useMemo(() => {
        const pricesFilled = items.length > 0 && items.every(it => {
            const v = form.itemPrices?.[it.id];
            return typeof v === 'number' && v > 0;
        });
        const descFilled = !!(form.customShortDescription || form.customFullDescription
            || basePackage.shortDescription || basePackage.fullDescription);
        const imagesFilled = (form.customImages?.length > 0) || !!form.customImageUrl || !!basePackage.imageUrl;
        return {
            0: 'ok',
            1: descFilled ? 'ok' : 'warn',
            2: pricesFilled ? 'ok' : 'warn',
            3: imagesFilled ? 'ok' : 'warn',
            4: 'ok',
        };
    }, [form, items, basePackage]);

    const isDirty = useMemo(() => {
        if (!initialFormSnapshot) return false;
        return JSON.stringify(form) !== initialFormSnapshot;
    }, [form, initialFormSnapshot]);

    useEffect(() => {
        if (!open) {
            setActiveTab(0);
            setForm({ ...EMPTY_FORM });
            setInitialFormSnapshot(null);
            setSaveError(null);
            setSaving(false);
            setConfirmClose(false);
            return;
        }
        setActiveTab(activateMode ? 2 : 0);

        // Seed itemPrices: existing (when editing) → clinic's own diagnostic price → admin recommendation
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
            // Seed every item so activation never starts with empty inputs:
            //   1. Clinic's own price for that diagnostic (when activated)
            //   2. Catalog's recommended price as a starting suggestion
            // Clinic can edit any value before saving; once saved, the underlying
            // diagnostic service gets auto-activated server-side at their chosen price.
            for (const it of items) {
                const own = typeof it.clinicServicePrice === 'number' && it.clinicServicePrice > 0
                    ? it.clinicServicePrice
                    : null;
                seededItemPrices[it.id] = own ?? Math.max(0, Math.round(it.servicePrice || 0));
            }
        }

        // customImages may live in customizationData as array, or just the legacy single customImageUrl.
        const seededImages = Array.isArray(existingCustom.customImages)
            ? existingCustom.customImages.filter(Boolean)
            : (existingCustom.customImageUrl ? [existingCustom.customImageUrl] : []);

        const next = {
            ...EMPTY_FORM,
            itemPrices: seededItemPrices,
            customNotes: pkg?.clinicPackage?.customNotes ?? '',
            customNameUz: existingCustom.customNameUz ?? '',
            customNameRu: existingCustom.customNameRu ?? '',
            customShortDescription: existingCustom.customShortDescription ?? '',
            customFullDescription: existingCustom.customFullDescription ?? '',
            customTargetAudience: existingCustom.customTargetAudience ?? '',
            customImageUrl: seededImages[0] ?? existingCustom.customImageUrl ?? '',
            customImages: seededImages,
            discountPercent: Math.max(0, Math.min(100, Number(pkg?.clinicPackage?.discountPercent ?? 0))),
        };
        setForm(next);
        setInitialFormSnapshot(JSON.stringify(next));
        // Depend on pkg?.id, NOT the whole pkg object: react-query refetches
        // (staleTime / refetchOnWindowFocus) hand us a NEW pkg object with the
        // same id while the drawer is open. Depending on `pkg` re-ran this
        // effect on every such refetch and wiped the admin's in-progress edits
        // (e.g. a discount they'd just typed). Keyed on the id it only re-seeds
        // on open or when a different package is opened.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, pkg?.id]);

    const tryClose = () => {
        if (saving) return;
        if (isDirty) {
            setConfirmClose(true);
            return;
        }
        onClose();
    };

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
                customImageUrl: form.customImages?.[0] || form.customImageUrl || undefined,
                customImages: form.customImages?.length ? form.customImages : undefined,
            };
            await onSave({
                itemPrices: form.itemPrices,
                customNotes: form.customNotes || undefined,
                discountPercent: Math.max(0, Math.min(100, Number(form.discountPercent || 0))),
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

    const saveDisabledReason = saving
        ? 'Saqlanmoqda...'
        : totalPrice <= 0
            ? 'Avval har bir analiz uchun narx kiriting'
            : null;

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="ca-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={tryClose}
                    />
                    <motion.div
                        className="ca-drawer"
                        style={{ width: 720, maxWidth: '94vw', display: 'flex', flexDirection: 'column' }}
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
                            <button className="ca-drawer-close" onClick={tryClose}><X size={20} /></button>
                        </div>

                        {activateMode && (
                            <div style={{
                                margin: '0 20px', padding: '10px 14px',
                                background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.25)',
                                borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ fontSize: 18 }}>💡</span>
                                <span>
                                    <strong style={{ color: 'var(--color-primary)' }}>Narxlar</strong> default holda klinikangizning xizmat narxlaridan to'ldirilgan. Tekshirib, kerak bo'lsa o'zgartiring.
                                </span>
                            </div>
                        )}

                        <div className="ca-tabs" style={{ padding: '0 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 4 }}>
                            {TABS.map(t => {
                                const status = tabStatus[t.key];
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.key}
                                        className={`ca-tab${activeTab === t.key ? ' active' : ''}`}
                                        onClick={() => setActiveTab(t.key)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <Icon size={13} />
                                        {t.label}
                                        {status === 'ok'
                                            ? <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                                            : <Circle size={12} style={{ color: '#f59e0b' }} />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="ca-drawer-body" style={{ flex: 1, overflowY: 'auto' }}>
                            {activeTab === 0 && <BasicTab form={form} setForm={setForm} basePackage={basePackage} />}
                            {activeTab === 1 && <DescriptionTab form={form} setForm={setForm} basePackage={basePackage} />}
                            {activeTab === 2 && <PricesTab items={items} form={form} setForm={setForm} totalPrice={totalPrice} packageId={basePackage?.id} />}
                            {activeTab === 3 && <ImagesTab form={form} setForm={setForm} basePackage={basePackage} />}
                            {activeTab === 4 && <PreviewTab form={form} items={items} totalPrice={totalPrice} basePackage={basePackage} />}
                        </div>

                        {saveError && (
                            <div style={{
                                margin: '0 20px 10px', padding: '10px 14px',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8, fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <AlertTriangle size={16} />
                                <span>{saveError}</span>
                            </div>
                        )}

                        {/* Sticky footer: always shows total + action */}
                        <div className="ca-drawer-footer" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                            borderTop: '1px solid var(--border-color)',
                            padding: '12px 20px', background: 'var(--bg-card)',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Jami paket narxi</span>
                                {(form.discountPercent ?? 0) > 0 && totalPrice > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 12, textDecoration: 'line-through', color: '#94a3b8' }}>
                                            {fmt(totalPrice)}
                                        </span>
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, color: '#dc2626',
                                            background: '#fee2e2', padding: '1px 5px', borderRadius: 5,
                                        }}>
                                            −{form.discountPercent}%
                                        </span>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
                                            {fmt(Math.round(totalPrice * (1 - (form.discountPercent ?? 0) / 100)))} UZS
                                        </span>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: 18, fontWeight: 700, color: totalPrice > 0 ? '#059669' : '#ef4444' }}>
                                        {fmt(totalPrice)} UZS
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* Always-visible discount input — same field as the Narxlar tab but
                                    surfaced here so admins don't have to switch tabs to apply
                                    a quick discount during activation. */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '6px 8px', background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8,
                                }}
                                    title="Chegirma foizi — umumiy narxdan ushlab qolinadi"
                                >
                                    <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 600 }}>Chegirma</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={form.discountPercent ?? 0}
                                        onChange={(e) => {
                                            const v = e.target.value === '' ? 0 : Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                            setForm({ ...form, discountPercent: v });
                                        }}
                                        style={{
                                            width: 56, padding: '4px 6px', fontSize: 13, fontWeight: 700,
                                            border: '1px solid #d1d5db', borderRadius: 6, textAlign: 'right',
                                            fontFamily: 'inherit',
                                        }}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>%</span>
                                </div>
                                <button className="ca-btn-secondary" onClick={tryClose} disabled={saving}>Bekor qilish</button>
                                <button
                                    className="ca-btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    onClick={handleSave}
                                    disabled={!!saveDisabledReason}
                                    title={saveDisabledReason || ''}
                                >
                                    {saving ? <Loader2 size={14} className="ca-spin" /> : <Check size={14} />}
                                    {activateMode ? 'Saqlash va Aktivlashtirish' : 'Saqlash'}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Unsaved-changes confirmation */}
                    {confirmClose && (
                        <div style={{
                            // Must sit ABOVE the drawer (.ca-drawer z-index 1201)
                            // and its backdrop (.ca-backdrop 1200) — at the old
                            // 1001 this confirm dialog rendered BEHIND them, so it
                            // looked broken (off to the side, dimmed) and its
                            // buttons were unclickable: the drawer backdrop on top
                            // swallowed the click and fired tryClose instead.
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
                        }}>
                            <div style={{
                                background: 'var(--bg-card)', borderRadius: 12, padding: 24,
                                maxWidth: 380, width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            }}>
                                <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Saqlanmagan o'zgarishlar bor</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 18px' }}>
                                    Hozir chiqsangiz, kiritgan ma'lumotlaringiz yo'qoladi. Chiqishni xohlaysizmi?
                                </p>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button className="ca-btn-secondary" onClick={() => setConfirmClose(false)}>
                                        Tahrirni davom ettirish
                                    </button>
                                    <button
                                        className="ca-btn-primary"
                                        style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                        onClick={() => { setConfirmClose(false); onClose(); }}
                                    >
                                        Ha, chiqaman
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}
