import { Plus, X, Tag, BadgePercent } from 'lucide-react';
import '../../pages/clinic-admin.css';

const TAG_OPTIONS = ['tez', 'aniq', 'arzon', "og'riqsiz", 'qulay', 'professional', 'zamonaviy', 'sifatli'];
const CATEGORY_OPTIONS = [
    { value: '', label: 'Kategoriyasiz' },
    { value: 'Standard', label: 'Standart' },
    { value: 'Premium', label: 'Premium' },
    { value: 'Express', label: 'Tezkor (Express)' },
    { value: 'VIP', label: 'VIP' },
];

const fmt = (n) => n != null ? n.toLocaleString('uz-UZ') : '—';

function MetadataField({ template, value, onChange }) {
    const v = (template.validation && typeof template.validation === 'object') ? template.validation : {};
    const common = {
        value: value ?? '',
        onChange: (e) => onChange(template.id, e.target.value),
    };

    if (template.inputType === 'SELECT') {
        return (
            <select {...common}>
                <option value="">— tanlang —</option>
                {(v.options || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }
    if (template.inputType === 'CHECKBOX') {
        return (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={value === 'true'}
                    onChange={(e) => onChange(template.id, e.target.checked ? 'true' : 'false')}
                />
                Ha
            </label>
        );
    }
    if (template.inputType === 'TEXTAREA') {
        return <textarea rows={3} maxLength={v.maxLength || undefined} {...common} />;
    }
    if (template.inputType === 'DATE') {
        return <input type="date" {...common} />;
    }
    if (template.inputType === 'NUMBER') {
        return (
            <input
                type="number"
                min={v.min ?? undefined}
                max={v.max ?? undefined}
                {...common}
            />
        );
    }
    return <input type="text" maxLength={v.maxLength || undefined} {...common} />;
}

export default function CustomizationBasicTab({
    service,
    formData,
    setFormData,
    linkedMetadata = [],
    metadataValues = {},
    onMetadataChange = () => {},
}) {
    const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

    const baseMin = service?.priceMin ?? 0;
    const baseMax = service?.priceMax ?? 0;
    const baseRecommended = service?.priceRecommended ?? 0;

    const discountedPrice = formData.customPrice && formData.discountPercent
        ? Math.round(formData.customPrice * (1 - formData.discountPercent / 100))
        : formData.customPrice ?? null;

    // Benefits management
    const addBenefit = () => {
        const benefits = [...(formData.benefits || []), { uz: '', ru: '' }];
        set('benefits', benefits);
    };
    const updateBenefit = (index, lang, value) => {
        const benefits = [...(formData.benefits || [])];
        benefits[index] = { ...benefits[index], [lang]: value };
        set('benefits', benefits);
    };
    const removeBenefit = (index) => {
        const benefits = (formData.benefits || []).filter((_, i) => i !== index);
        set('benefits', benefits);
    };

    // Tags management
    const addTag = (tag) => {
        const tags = [...(formData.tags || [])];
        if (!tags.includes(tag) && tags.length < 10) {
            set('tags', [...tags, tag]);
        }
    };
    const removeTag = (tag) => {
        set('tags', (formData.tags || []).filter(t => t !== tag));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ═══ PRICE & DISCOUNT ═══ */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(0,201,167,0.06), rgba(59,130,246,0.06))',
                border: '1px solid rgba(0,201,167,0.25)',
                borderRadius: 12,
                padding: 16,
            }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BadgePercent size={15} style={{ color: 'var(--color-primary)' }} />
                    Narx va Chegirma
                </div>

                {/* Reference price from super admin */}
                <div style={{
                    fontSize: 11, color: 'var(--text-muted)', marginBottom: 12,
                    background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: '6px 10px',
                    display: 'flex', gap: 16,
                }}>
                    <span>Tavsiya: <strong style={{ color: 'var(--color-primary)' }}>{fmt(baseRecommended)} UZS</strong></span>
                    <span>Oraliq: {fmt(baseMin)} – {fmt(baseMax)} UZS</span>
                </div>

                <div className="ca-form-row" style={{ alignItems: 'flex-start' }}>
                    {/* Custom Price */}
                    <div className="ca-form-group" style={{ flex: 2 }}>
                        <label className="ca-label">Klinika narxi (UZS)</label>
                        <input
                            type="number"
                            min={0}
                            step={1000}
                            value={formData.customPrice ?? ''}
                            onChange={e => set('customPrice', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            placeholder={`${fmt(baseRecommended)} (tavsiya)`}
                        />
                        <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            Bo&#39;sh qoldirsa Super Admin narxi ko&#39;rsatiladi
                        </small>
                    </div>

                    {/* Discount */}
                    <div className="ca-form-group" style={{ flex: 1 }}>
                        <label className="ca-label">Chegirma (%)</label>
                        <input
                            type="number"
                            min={0}
                            max={90}
                            value={formData.discountPercent ?? ''}
                            onChange={e => set('discountPercent', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* Live price preview */}
                {formData.customPrice && (
                    <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mijoz ko&#39;radi:</span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-primary)' }}>
                            {fmt(discountedPrice)} UZS
                            {formData.discountPercent > 0 && (
                                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 8 }}>
                                    {fmt(formData.customPrice)}
                                </span>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Custom Name Uz */}
            <div className="ca-form-group">
                <label className="ca-label">Maxsus nom (O&#39;zbekcha) — ixtiyoriy</label>
                <input
                    value={formData.customNameUz || ''}
                    onChange={e => set('customNameUz', e.target.value)}
                    placeholder={service.nameUz}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    Bo&#39;sh qoldirish mumkin — Super Admin nomi ishlatiladi
                </small>
            </div>

            {/* Custom Name Ru */}
            <div className="ca-form-group">
                <label className="ca-label">Maxsus nom (Русский) — ixtiyoriy</label>
                <input
                    value={formData.customNameRu || ''}
                    onChange={e => set('customNameRu', e.target.value)}
                    placeholder={service.nameRu || ''}
                />
            </div>

            {/* Custom Description Uz */}
            <div className="ca-form-group">
                <label className="ca-label">Maxsus tavsif (O&#39;zbekcha)</label>
                <textarea
                    rows={4}
                    value={formData.customDescriptionUz || ''}
                    onChange={e => set('customDescriptionUz', e.target.value)}
                    placeholder="Bizda zamonaviy Siemens uskunalari, 15 yillik tajribali mutaxassislar..."
                />
            </div>

            {/* Custom Description Ru */}
            <div className="ca-form-group">
                <label className="ca-label">Maxsus tavsif (Русский)</label>
                <textarea
                    rows={3}
                    value={formData.customDescriptionRu || ''}
                    onChange={e => set('customDescriptionRu', e.target.value)}
                    placeholder="Описание на русском..."
                />
            </div>

            {/* Preparation Uz */}
            <div className="ca-form-group">
                <label className="ca-label">Tayyorgarlik ko&#39;rsatmalari</label>
                <textarea
                    rows={3}
                    value={formData.preparationUz || ''}
                    onChange={e => set('preparationUz', e.target.value)}
                    placeholder="Tekshiruvdan 8 soat oldin ovqatlanmang. Och qoringa keling."
                />
            </div>

            {/* Estimated Duration */}
            <div className="ca-form-row">
                <div className="ca-form-group">
                    <label className="ca-label">Taxminiy davomiyligi (daqiqa)</label>
                    <input
                        type="number"
                        min={5}
                        max={480}
                        value={formData.estimatedDurationMinutes || ''}
                        onChange={e => set('estimatedDurationMinutes', parseInt(e.target.value) || null)}
                        placeholder="30"
                    />
                </div>
                <div className="ca-form-group">
                    <label className="ca-label">Kategoriya</label>
                    <select
                        value={formData.customCategory || ''}
                        onChange={e => set('customCategory', e.target.value || null)}
                    >
                        {CATEGORY_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tags */}
            <div className="ca-form-group">
                <label className="ca-label">Teglar (maksimum 10)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {(formData.tags || []).map(tag => (
                        <span key={tag} className="ca-badge primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {tag}
                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)} />
                        </span>
                    ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TAG_OPTIONS.filter(t => !(formData.tags || []).includes(t)).map(tag => (
                        <button
                            key={tag}
                            type="button"
                            className="ca-btn-secondary"
                            style={{ fontSize: 11, padding: '3px 10px' }}
                            onClick={() => addTag(tag)}
                        >
                            + {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Benefits */}
            <div className="ca-form-group">
                <label className="ca-label">Afzalliklar / xususiyatlar</label>
                {(formData.benefits || []).map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                        <input
                            style={{ flex: 1 }}
                            value={b.uz || ''}
                            onChange={e => updateBenefit(i, 'uz', e.target.value)}
                            placeholder="Afzallik (O'zbekcha)"
                        />
                        <input
                            style={{ flex: 1 }}
                            value={b.ru || ''}
                            onChange={e => updateBenefit(i, 'ru', e.target.value)}
                            placeholder="Преимущество (Русский)"
                        />
                        <button
                            type="button"
                            className="ca-icon-btn danger"
                            onClick={() => removeBenefit(i)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
                {(formData.benefits || []).length < 10 && (
                    <button type="button" className="ca-btn-secondary" onClick={addBenefit} style={{ fontSize: 12 }}>
                        <Plus size={14} /> Afzallik qo&#39;shish
                    </button>
                )}
            </div>

            {/* ═══ METADATA — clinic-entered, patient-filterable ═══ */}
            {linkedMetadata.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(147,51,234,0.06), rgba(236,72,153,0.06))',
                    border: '1px solid rgba(147,51,234,0.25)',
                    borderRadius: 12,
                    padding: 16,
                }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>📋</span>
                        Xizmat xususiyatlari (Metadata)
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                        Bu qiymatlarni to&#39;ldiring — bemorlar xizmatlar bo&#39;limida shular bo&#39;yicha filtrlaydi.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {linkedMetadata.map(template => {
                            const isRequired = template.isRequired || false;
                            return (
                                <div className="ca-form-group" key={template.id}>
                                    <label className="ca-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                                        {template.labelUz}
                                        {template.unit && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                ({template.unit})
                                            </span>
                                        )}
                                        {template.visibleToPatient && (
                                            <span style={{
                                                marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                                                color: '#9333ea', background: 'rgba(147,51,234,0.1)',
                                                padding: '2px 7px', borderRadius: 5,
                                            }}>
                                                Filtrlanadi
                                            </span>
                                        )}
                                    </label>
                                    <MetadataField
                                        template={template}
                                        value={metadataValues[template.id]}
                                        onChange={onMetadataChange}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
