import { Plus, X } from 'lucide-react';
import '../../pages/clinic-admin.css';

const TAG_OPTIONS = ['tez', 'aniq', 'arzon', "og'riqsiz", 'qulay', 'professional', 'zamonaviy', 'sifatli'];
const CATEGORY_OPTIONS = [
    { value: '', label: 'Kategoriyasiz' },
    { value: 'Standard', label: 'Standart' },
    { value: 'Premium', label: 'Premium' },
    { value: 'Express', label: 'Tezkor (Express)' },
    { value: 'VIP', label: 'VIP' },
];

export default function CustomizationBasicTab({ service, formData, setFormData }) {
    const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

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
        </div>
    );
}
