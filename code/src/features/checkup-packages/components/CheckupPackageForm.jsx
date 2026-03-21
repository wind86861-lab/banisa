import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Info, ChevronRight, ChevronLeft, Check, Beaker, Stethoscope, X, TrendingDown } from 'lucide-react';
import { useCreateCheckupPackage, useUpdateCheckupPackage } from '../hooks/useCheckupPackages';
import { diagnosticsApi, categoriesApi } from '../../../services/api';

const schema = z.object({
    nameUz: z.string().min(3, "Kamida 3 ta harf"),
    nameRu: z.string().optional(),
    category: z.enum(['BASIC', 'SPECIALIZED', 'AGE_BASED']),
    shortDescription: z.string().max(200).optional(),
    recommendedPrice: z.number().min(0),
    priceMin: z.number().min(0),
    priceMax: z.number().min(0),
    discount: z.number().optional(),
});

const STEPS = [
    { label: "Asosiy Ma'lumotlar", icon: '📋' },
    { label: 'Xizmatlar', icon: '🔬' },
    { label: 'Narx Belgilash', icon: '💰' },
    { label: "Ko'rib Chiqish", icon: '✅' },
];

const CAT_OPTIONS = [
    { value: 'BASIC', icon: '🩺', label: 'Bazaviy', desc: 'Umumiy checkup' },
    { value: 'SPECIALIZED', icon: '❤️', label: 'Ixtisoslashgan', desc: "Yo'nalish bo'yicha" },
    { value: 'AGE_BASED', icon: '👨‍⚕️', label: 'Yosh guruhi', desc: 'Age-based checkup' },
];

export default function CheckupPackageForm({ initialData, onClose }) {
    const [step, setStep] = useState(0);
    const [selectedSvcs, setSelectedSvcs] = useState(
        initialData?.items?.map(i => ({
            id: i.diagnosticServiceId,
            name: i.serviceName || '',
            price: i.servicePrice || 0,
            catName: i.notes || '',
            type: 'DIAGNOSTIC',
        })) || []
    );
    const [svcType, setSvcType] = useState('DIAGNOSTIC');
    const [parentCatId, setParentCatId] = useState('');
    const [subCatId, setSubCatId] = useState('');
    const [pickedSvcId, setPickedSvcId] = useState('');
    const [discountType, setDiscountType] = useState('pct'); // 'pct' | 'uzs'
    const [discountInput, setDiscountInput] = useState(0);

    const [allCats, setAllCats] = useState([]);
    const [parentCats, setParentCats] = useState([]);
    const [subCats, setSubCats] = useState([]);
    const [svcList, setSvcList] = useState([]);
    const [loadingSvc, setLoadingSvc] = useState(false);

    const createMutation = useCreateCheckupPackage();
    const updateMutation = useUpdateCheckupPackage();

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            nameUz: initialData?.nameUz || '',
            nameRu: initialData?.nameRu || '',
            category: initialData?.category || 'BASIC',
            shortDescription: initialData?.shortDescription || '',
            recommendedPrice: initialData?.recommendedPrice || 0,
            priceMin: initialData?.priceMin || 0,
            priceMax: initialData?.priceMax || 0,
            discount: initialData?.discount || 0,
        }
    });

    const watchAll = watch();

    /* ─── Reset form when initialData loads ─── */
    useEffect(() => {
        if (initialData) {
            reset({
                nameUz: initialData.nameUz || '',
                nameRu: initialData.nameRu || '',
                category: initialData.category || 'BASIC',
                shortDescription: initialData.shortDescription || '',
                recommendedPrice: initialData.recommendedPrice || 0,
                priceMin: initialData.priceMin || 0,
                priceMax: initialData.priceMax || 0,
                discount: initialData.discount || 0,
            });
            setSelectedSvcs(
                initialData.items?.map(i => ({
                    id: i.diagnosticServiceId,
                    name: i.serviceName || '',
                    price: i.servicePrice || 0,
                    catName: i.notes || '',
                    type: 'DIAGNOSTIC',
                })) || []
            );
            // Calculate discount input from saved discount
            if (initialData.discount && initialData.items?.length > 0) {
                const total = initialData.items.reduce((s, i) => s + (i.servicePrice || 0), 0);
                const discountPct = total > 0 ? Math.round((initialData.discount / total) * 100) : 0;
                setDiscountInput(discountPct);
                setDiscountType('pct');
            }
        }
    }, [initialData, reset]);

    /* ─── Load categories once ─── */
    useEffect(() => {
        categoriesApi.list().then(data => {
            const flat = [];
            const flatten = (items) => items?.forEach(c => { flat.push(c); flatten(c.children); });
            flatten(data || []);
            setAllCats(flat);
            const root = flat.find(c => c.level === 0 && c.slug === 'diagnostics');
            setParentCats(flat.filter(c => c.level === 1 && c.parentId === root?.id));
        }).catch(console.error);
    }, []);

    /* ─── Update subcats on parent change ─── */
    useEffect(() => {
        if (parentCatId) {
            setSubCats(allCats.filter(c => c.parentId === parentCatId && c.level === 2));
            setSubCatId('');
            setSvcList([]);
        }
    }, [parentCatId, allCats]);

    /* ─── Load services on subcat change ─── */
    useEffect(() => {
        if (!subCatId) return;
        setLoadingSvc(true);
        diagnosticsApi.list({ categoryId: subCatId, limit: 500 })
            .then(res => setSvcList(res.data || []))
            .catch(console.error)
            .finally(() => setLoadingSvc(false));
    }, [subCatId]);

    /* ─── Totals ─── */
    const itemsTotal = selectedSvcs.reduce((s, i) => s + i.price, 0);
    const recPrice = Number(watchAll.recommendedPrice) || 0;
    const discount = itemsTotal > recPrice ? itemsTotal - recPrice : 0;
    const discPct = itemsTotal > 0 ? Math.round((recPrice / itemsTotal) * 100) : 100;

    /* ─── Discount calculator ─── */
    const applyDiscount = useCallback((value, type) => {
        const val = Math.max(0, Number(value) || 0);
        let newPrice;
        if (type === 'pct') {
            const pct = Math.min(val, 100);
            newPrice = Math.round(itemsTotal * (1 - pct / 100));
        } else {
            newPrice = Math.max(0, itemsTotal - val);
        }
        const discountAmount = itemsTotal - newPrice;
        setValue('recommendedPrice', newPrice);
        setValue('priceMin', Math.round(newPrice * 0.9));
        setValue('priceMax', Math.round(newPrice * 1.1));
        setValue('discount', discountAmount);
    }, [itemsTotal, setValue]);

    /* ─── Auto-set price when entering step 3 ─── */
    const goToStep = useCallback((next) => {
        if (next === 2 && step === 1) {
            // Only auto-set prices if creating new package (no initialData)
            if (!initialData) {
                setValue('recommendedPrice', itemsTotal);
                setValue('priceMin', Math.round(itemsTotal * 0.9));
                setValue('priceMax', Math.round(itemsTotal * 1.1));
                setDiscountInput(0);
            }
        }
        setStep(next);
    }, [step, itemsTotal, setValue, initialData]);

    /* ─── Validation per step ─── */
    const canProceed = () => {
        if (step === 0) return watchAll.nameUz?.length >= 3;
        if (step === 1) return selectedSvcs.length > 0;
        if (step === 2) return recPrice > 0;
        return true;
    };

    /* ─── Add / remove service ─── */
    const addService = () => {
        if (!pickedSvcId) return;
        const svc = svcList.find(s => s.id === pickedSvcId);
        if (!svc || selectedSvcs.find(s => s.id === svc.id)) return;
        const catName = allCats.find(c => c.id === subCatId)?.nameUz || '';
        setSelectedSvcs(prev => [...prev, {
            id: svc.id, name: svc.nameUz,
            price: svc.priceRecommended || 0, catName, type: svcType,
        }]);
        setPickedSvcId('');
    };

    const removeService = (id) => setSelectedSvcs(prev => prev.filter(s => s.id !== id));

    /* ─── Submit ─── */
    const onSubmit = (formData) => {
        const payload = {
            ...formData,
            items: selectedSvcs.map(s => ({
                diagnosticServiceId: s.id,
                serviceName: s.name,
                servicePrice: s.price,
                notes: s.catName,
                quantity: 1,
                isRequired: true,
            })),
        };
        if (initialData) {
            updateMutation.mutate({ id: initialData.id, data: payload }, { onSuccess: onClose });
        } else {
            createMutation.mutate(payload, { onSuccess: onClose });
        }
    };

    const diagSvcs = selectedSvcs.filter(s => s.type === 'DIAGNOSTIC');
    const consultSvcs = selectedSvcs.filter(s => s.type === 'CONSULTATION');
    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            {/* ── Wizard Header ── */}
            <div className="wiz-header">
                <div className="wiz-title-row">
                    <h2 className="wiz-title">
                        {initialData ? '✏️ Paketni tahrirlash' : '✨ Yangi Paket Yaratish'}
                    </h2>
                    <button className="wiz-close" onClick={onClose}><X size={16} /></button>
                </div>

                {/* Steps */}
                <div className="wiz-steps">
                    {STEPS.map((s, i) => (
                        <div key={i} className={`wiz-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
                            {i < STEPS.length - 1 && <div className="wiz-connector" />}
                            <div className="wiz-step-circle">
                                {i < step ? <Check size={14} /> : i + 1}
                            </div>
                            <span className="wiz-step-label">{s.label}</span>
                        </div>
                    ))}
                </div>
                <div className="wiz-progress-bar">
                    <div className="wiz-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                </div>
            </div>

            {/* ── Wizard Body ── */}
            <div className="wiz-body">
                <form id="wiz-form" onSubmit={handleSubmit(onSubmit)}>

                    {/* STEP 1 ─ Basic Info */}
                    {step === 0 && (
                        <div className="wiz-step-content">
                            <div className="wiz-field-group">
                                <div className="wiz-field">
                                    <label>Paket nomi (UZ) <span className="req">*</span></label>
                                    <input className={`wiz-input${errors.nameUz ? ' error' : ''}`} {...register('nameUz')} placeholder="Bazaviy Checkup" />
                                    {errors.nameUz && <p className="wiz-error-msg">{errors.nameUz.message}</p>}
                                </div>
                                <div className="wiz-field">
                                    <label>Paket nomi (RU)</label>
                                    <input className="wiz-input" {...register('nameRu')} placeholder="Базовый Чекап" />
                                </div>
                            </div>

                            <div className="wiz-field-group full" style={{ marginBottom: 16 }}>
                                <div className="wiz-field">
                                    <label>Kategoriya <span className="req">*</span></label>
                                    <div className="cat-options">
                                        {CAT_OPTIONS.map(opt => (
                                            <div
                                                key={opt.value}
                                                className={`cat-option${watchAll.category === opt.value ? ' selected' : ''}`}
                                                onClick={() => setValue('category', opt.value)}
                                            >
                                                <div className="cat-option-icon">{opt.icon}</div>
                                                <div className="cat-option-label">{opt.label}</div>
                                                <div className="cat-option-desc">{opt.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="wiz-field-group full">
                                <div className="wiz-field">
                                    <label>Qisqa tavsif</label>
                                    <textarea
                                        className="wiz-textarea"
                                        {...register('shortDescription')}
                                        placeholder="Asosiy tahlillar va ko'riklar to'plami..."
                                        maxLength={200}
                                    />
                                    <p className="wiz-char-count">{(watchAll.shortDescription || '').length}/200</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 ─ Services */}
                    {step === 1 && (
                        <div className="wiz-step-content">
                            <div className="info-banner">
                                <Info size={16} style={{ color: '#0891b2', flexShrink: 0, marginTop: 2 }} />
                                <span className="info-banner-text">
                                    Kategoriya → Subcategoriya → Xizmat tartibida tanlang. Bir nechta xizmat qo'shishingiz mumkin.
                                </span>
                            </div>

                            {/* Service Selector */}
                            <div className="svc-selector-box">
                                <div className="svc-type-toggle">
                                    <button
                                        type="button"
                                        className={`svc-type-btn${svcType === 'DIAGNOSTIC' ? ' diag-active' : ''}`}
                                        onClick={() => setSvcType('DIAGNOSTIC')}
                                    >
                                        <Beaker size={14} /> Diagnostika
                                    </button>
                                    <button
                                        type="button"
                                        className={`svc-type-btn${svcType === 'CONSULTATION' ? ' consult-active' : ''}`}
                                        onClick={() => setSvcType('CONSULTATION')}
                                    >
                                        <Stethoscope size={14} /> Konsultatsiya
                                    </button>
                                </div>

                                <div className="svc-selector-row">
                                    <div className="wiz-field" style={{ margin: 0 }}>
                                        <label>Kategoriya</label>
                                        <select className="wiz-select" value={parentCatId} onChange={e => setParentCatId(e.target.value)}>
                                            <option value="">Kategoriya tanlang...</option>
                                            {parentCats.map(c => <option key={c.id} value={c.id}>{c.nameUz}</option>)}
                                        </select>
                                    </div>
                                    <div className="wiz-field" style={{ margin: 0 }}>
                                        <label>Subcategoriya</label>
                                        <select className="wiz-select" value={subCatId} onChange={e => setSubCatId(e.target.value)} disabled={!parentCatId}>
                                            <option value="">Subcategoriya tanlang...</option>
                                            {subCats.map(c => <option key={c.id} value={c.id}>{c.nameUz}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="wiz-field" style={{ marginBottom: 12 }}>
                                    <label>Xizmat</label>
                                    <select className="wiz-select" value={pickedSvcId} onChange={e => setPickedSvcId(e.target.value)} disabled={!subCatId || loadingSvc}>
                                        <option value="">{loadingSvc ? 'Yuklanmoqda...' : 'Xizmat tanlang...'}</option>
                                        {svcList.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.nameUz} — {(s.priceRecommended || 0).toLocaleString()} UZS
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button type="button" className="svc-add-btn" onClick={addService} disabled={!pickedSvcId}>
                                    <Plus size={16} /> Qo'shish
                                </button>
                            </div>

                            {/* Selected list */}
                            {selectedSvcs.length > 0 && (
                                <>
                                    <div className="selected-svcs-header">
                                        Tanlangan xizmatlar
                                        <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                            {selectedSvcs.length}
                                        </span>
                                    </div>

                                    {diagSvcs.length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div className="svc-group-label diag"><Beaker size={12} /> Diagnostika ({diagSvcs.length})</div>
                                            {diagSvcs.map(s => (
                                                <div key={s.id} className="svc-item">
                                                    <div className="svc-item-icon diag"><Beaker size={14} /></div>
                                                    <div className="svc-item-info">
                                                        <div className="svc-item-name">{s.name}</div>
                                                        <div className="svc-item-meta">{s.catName}</div>
                                                    </div>
                                                    <span className="svc-item-price">{s.price.toLocaleString()} UZS</span>
                                                    <button type="button" className="svc-remove-btn" onClick={() => removeService(s.id)}><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {consultSvcs.length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div className="svc-group-label consult"><Stethoscope size={12} /> Konsultatsiya ({consultSvcs.length})</div>
                                            {consultSvcs.map(s => (
                                                <div key={s.id} className="svc-item">
                                                    <div className="svc-item-icon consult"><Stethoscope size={14} /></div>
                                                    <div className="svc-item-info">
                                                        <div className="svc-item-name">{s.name}</div>
                                                        <div className="svc-item-meta">{s.catName}</div>
                                                    </div>
                                                    <span className="svc-item-price">{s.price.toLocaleString()} UZS</span>
                                                    <button type="button" className="svc-remove-btn" onClick={() => removeService(s.id)}><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="svc-summary-card">
                                        <div className="svc-summary-row">
                                            <span>Diagnostika ({diagSvcs.length} ta)</span>
                                            <span>{diagSvcs.reduce((s, i) => s + i.price, 0).toLocaleString()} UZS</span>
                                        </div>
                                        {consultSvcs.length > 0 && (
                                            <div className="svc-summary-row">
                                                <span>Konsultatsiya ({consultSvcs.length} ta)</span>
                                                <span>{consultSvcs.reduce((s, i) => s + i.price, 0).toLocaleString()} UZS</span>
                                            </div>
                                        )}
                                        <div className="svc-summary-row total">
                                            <span>Jami</span>
                                            <span>{itemsTotal.toLocaleString()} UZS</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedSvcs.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
                                    <div style={{ fontSize: 14 }}>Hali hech qanday xizmat tanlanmagan</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3 ─ Pricing */}
                    {step === 2 && (
                        <div className="wiz-step-content">
                            {/* Total summary */}
                            <div className="price-total-card">
                                <div className="price-total-label">Xizmatlar jami summasi</div>
                                <div className="price-total-value">{itemsTotal.toLocaleString()} UZS</div>
                                <div className="price-breakdown">
                                    <div className="price-breakdown-row">
                                        <span>Diagnostika ({diagSvcs.length} ta)</span>
                                        <span>{diagSvcs.reduce((s, i) => s + i.price, 0).toLocaleString()} UZS</span>
                                    </div>
                                    {consultSvcs.length > 0 && (
                                        <div className="price-breakdown-row">
                                            <span>Konsultatsiya ({consultSvcs.length} ta)</span>
                                            <span>{consultSvcs.reduce((s, i) => s + i.price, 0).toLocaleString()} UZS</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Discount calculator ── */}
                            <div className="discount-calc-box">
                                <div className="discount-calc-header">
                                    <TrendingDown size={15} style={{ color: '#10b981' }} />
                                    <span>Chegirma hisoblash</span>
                                </div>
                                <div className="discount-calc-row">
                                    {/* Type toggle */}
                                    <div className="discount-type-toggle">
                                        <button
                                            type="button"
                                            className={`disc-type-btn${discountType === 'pct' ? ' active' : ''}`}
                                            onClick={() => {
                                                setDiscountType('pct');
                                                setDiscountInput(0);
                                                applyDiscount(0, 'pct');
                                            }}
                                        >%</button>
                                        <button
                                            type="button"
                                            className={`disc-type-btn${discountType === 'uzs' ? ' active' : ''}`}
                                            onClick={() => {
                                                setDiscountType('uzs');
                                                setDiscountInput(0);
                                                applyDiscount(0, 'uzs');
                                            }}
                                        >UZS</button>
                                    </div>
                                    {/* Value input */}
                                    <div className="discount-input-wrap">
                                        <input
                                            type="number"
                                            className="wiz-input"
                                            value={discountInput || ''}
                                            min={0}
                                            max={discountType === 'pct' ? 100 : itemsTotal}
                                            placeholder={discountType === 'pct' ? '0 – 100' : '0'}
                                            onChange={e => {
                                                const val = Number(e.target.value) || 0;
                                                setDiscountInput(val);
                                                applyDiscount(val, discountType);
                                            }}
                                        />
                                        <span className="discount-input-unit">
                                            {discountType === 'pct' ? '%' : "so'm"}
                                        </span>
                                    </div>
                                    {/* Result badge */}
                                    {discount > 0 && (
                                        <span className="discount-result-badge">
                                            −{discount.toLocaleString()} UZS ({100 - discPct}%)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Editable price fields */}
                            <div className="price-input-group">
                                <div className="wiz-field price-field-wide">
                                    <label>Paket narxi (tavsiya) <span className="req">*</span></label>
                                    <div className="price-stepper-wrap">
                                        {[-5000, -1000].map(step => (
                                            <button
                                                key={step}
                                                type="button"
                                                className="price-step-btn minus"
                                                onClick={() => {
                                                    const cur = Number(watchAll.recommendedPrice) || 0;
                                                    const next = Math.max(0, cur + step);
                                                    setValue('recommendedPrice', next);
                                                }}
                                            >{step.toLocaleString()}</button>
                                        ))}
                                        <input
                                            type="number" className="wiz-input price-step-input"
                                            {...register('recommendedPrice', { valueAsNumber: true })}
                                            placeholder="0"
                                        />
                                        {[1000, 5000].map(step => (
                                            <button
                                                key={step}
                                                type="button"
                                                className="price-step-btn plus"
                                                onClick={() => {
                                                    const cur = Number(watchAll.recommendedPrice) || 0;
                                                    setValue('recommendedPrice', cur + step);
                                                }}
                                            >+{step.toLocaleString()}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="wiz-field">
                                    <label>Minimal narx (klinikalar uchun)</label>
                                    <input
                                        type="number" className="wiz-input"
                                        {...register('priceMin', { valueAsNumber: true })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="wiz-field">
                                    <label>Maksimal narx (klinikalar uchun)</label>
                                    <input
                                        type="number" className="wiz-input"
                                        {...register('priceMax', { valueAsNumber: true })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Visual bar */}
                            <div className={`discount-preview ${discount > 0 ? 'has-discount' : 'no-discount'}`}>
                                <div className="discount-header">
                                    <span className="discount-label">
                                        <TrendingDown size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                        Chegirma natijasi
                                    </span>
                                    <span className="discount-value">
                                        {discount > 0 ? `${discount.toLocaleString()} UZS (${100 - discPct}%)` : "Chegirma yo'q"}
                                    </span>
                                </div>
                                {itemsTotal > 0 && recPrice > 0 && (
                                    <>
                                        <div className="discount-bar-wrap">
                                            <div className="discount-bar-fill" style={{ width: `${Math.min(discPct, 100)}%` }}>
                                                <span className="discount-bar-text">{discPct}% (Paket narxi)</span>
                                            </div>
                                        </div>
                                        <p className="discount-save-note">
                                            💵 Mijoz {discount.toLocaleString()} UZS tejaydi
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4 ─ Review */}
                    {step === 3 && (
                        <div className="wiz-step-content">
                            <div className="review-section">
                                <div className="review-section-title">📋 Paket ma'lumotlari</div>
                                <div className="review-card">
                                    <div className="review-row">
                                        <span>Nomi (UZ)</span>
                                        <strong>{watchAll.nameUz}</strong>
                                    </div>
                                    {watchAll.nameRu && (
                                        <div className="review-row">
                                            <span>Nomi (RU)</span>
                                            <strong>{watchAll.nameRu}</strong>
                                        </div>
                                    )}
                                    <div className="review-row">
                                        <span>Kategoriya</span>
                                        <strong>{CAT_OPTIONS.find(c => c.value === watchAll.category)?.label}</strong>
                                    </div>
                                    {watchAll.shortDescription && (
                                        <div className="review-row" style={{ flexDirection: 'column', gap: 4 }}>
                                            <span>Tavsif</span>
                                            <strong>{watchAll.shortDescription}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="review-section">
                                <div className="review-section-title">🔬 Xizmatlar ({selectedSvcs.length} ta)</div>
                                <div className="review-card">
                                    {diagSvcs.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0891b2', marginBottom: 6 }}>
                                                Diagnostika ({diagSvcs.length})
                                            </div>
                                            {diagSvcs.map(s => (
                                                <div key={s.id} className="review-row">
                                                    <span>{s.name}</span>
                                                    <strong>{s.price.toLocaleString()} UZS</strong>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {consultSvcs.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 6, marginTop: 8 }}>
                                                Konsultatsiya ({consultSvcs.length})
                                            </div>
                                            {consultSvcs.map(s => (
                                                <div key={s.id} className="review-row">
                                                    <span>{s.name}</span>
                                                    <strong>{s.price.toLocaleString()} UZS</strong>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="review-section">
                                <div className="review-section-title">💰 Narxlar</div>
                                <div className="review-card">
                                    <div className="review-row">
                                        <span>Xizmatlar summasi</span>
                                        <strong>{itemsTotal.toLocaleString()} UZS</strong>
                                    </div>
                                    <div className="review-row">
                                        <span>Paket narxi (tavsiya)</span>
                                        <strong style={{ color: '#10B981' }}>{recPrice.toLocaleString()} UZS</strong>
                                    </div>
                                    {discount > 0 && (
                                        <div className="review-row">
                                            <span>Chegirma</span>
                                            <strong style={{ color: '#10B981' }}>{discount.toLocaleString()} UZS ({100 - discPct}%)</strong>
                                        </div>
                                    )}
                                    <div className="review-row">
                                        <span>Klinika oralig'i</span>
                                        <strong>{(watchAll.priceMin || 0).toLocaleString()} – {(watchAll.priceMax || 0).toLocaleString()} UZS</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* ── Wizard Footer ── */}
            <div className="wiz-footer">
                <button type="button" className="wiz-btn ghost" onClick={onClose}>
                    Bekor qilish
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                    {step > 0 && (
                        <button type="button" className="wiz-btn back" onClick={() => setStep(s => s - 1)}>
                            <ChevronLeft size={16} /> Orqaga
                        </button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <button
                            type="button"
                            className="wiz-btn next"
                            onClick={() => canProceed() && goToStep(step + 1)}
                            disabled={!canProceed()}
                        >
                            Keyingi <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            form="wiz-form"
                            className="wiz-btn save"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saqlanmoqda...' : <><Check size={16} /> Saqlash</>}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
