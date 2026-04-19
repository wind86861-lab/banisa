import React, { useState } from 'react';
import {
    ArrowLeft, ArrowRight, Loader2, X, Plus, Trash2,
    Stethoscope, Clock, ShieldCheck, ClipboardCheck,
    Thermometer, Package, Milestone, HelpCircle
} from 'lucide-react';
import { SURGICAL_STEPS } from './SurgicalConstants';

const SurgicalForm = ({ formData, handleFormChange, setFormData, onSave, onCancel, saving, categories }) => {
    const [step, setStep] = useState(1);

    const nextStep = () => setStep(s => Math.min(s + 1, 8));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleArrayChange = (field, index, value) => {
        const newArr = [...(formData[field] || [])];
        newArr[index] = value;
        handleFormChange(field, newArr);
    };

    const addArrayItem = (field, defaultValue = '') => {
        handleFormChange(field, [...(formData[field] || []), defaultValue]);
    };

    const removeArrayItem = (field, index) => {
        handleFormChange(field, (formData[field] || []).filter((_, i) => i !== index));
    };

    const renderStepContent = () => {
        switch (step) {
            case 1: // Basic Info
                return (
                    <div className="step-content animated fade-in">
                        <h3><Stethoscope className="step-icon" /> Asosiy Ma'lumotlar</h3>
                        <div className="form-group row">
                            <div className="col">
                                <label>Operatsiya nomi (UZ) *</label>
                                <input
                                    type="text"
                                    value={formData.nameUz || ''}
                                    onChange={(e) => handleFormChange('nameUz', e.target.value)}
                                    placeholder="Masalan: Appendiqtomiya"
                                />
                            </div>
                            <div className="col">
                                <label>Operatsiya nomi (RU)</label>
                                <input
                                    type="text"
                                    value={formData.nameRu || ''}
                                    onChange={(e) => handleFormChange('nameRu', e.target.value)}
                                    placeholder="Аппендэктомия"
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="col">
                                <label>Asosiy Kategoriya *</label>
                                <select
                                    value={formData.parentCatId || ''}
                                    onChange={(e) => {
                                        const pId = e.target.value;
                                        setFormData(prev => ({ ...prev, parentCatId: pId, categoryId: '' }));
                                    }}
                                >
                                    <option value="">Tanlang...</option>
                                    {(categories.find(c => c.slug === 'operations')?.children || []).map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.icon || '📁'} {cat.nameUz}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col">
                                <label>Yo'nalish (Guruh) *</label>
                                <select
                                    value={formData.categoryId || ''}
                                    onChange={(e) => handleFormChange('categoryId', e.target.value)}
                                    disabled={!formData.parentCatId}
                                >
                                    <option value="">Tanlang...</option>
                                    {(() => {
                                        const parent = (categories.find(c => c.slug === 'operations')?.children || [])
                                            .find(c => c.id === formData.parentCatId);
                                        return parent?.children?.map(sub => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.icon || '•'} {sub.nameUz}
                                            </option>
                                        )) || [];
                                    })()}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Qisqa tavsif (max 200 belgi)</label>
                            <textarea
                                rows={2}
                                maxLength={200}
                                value={formData.shortDescription || ''}
                                onChange={(e) => handleFormChange('shortDescription', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>To'liq ma'lumot</label>
                            <textarea
                                rows={4}
                                value={formData.fullDescription || ''}
                                onChange={(e) => handleFormChange('fullDescription', e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 2: // Pricing & Time
                return (
                    <div className="step-content animated fade-in">
                        <h3><Clock className="step-icon" /> Narx va Vaqt</h3>
                        <div className="form-group row">
                            <div className="col">
                                <label>Tavsiya etilgan narx (UZS)</label>
                                <input
                                    type="number"
                                    value={formData.priceRecommended}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            priceRecommended: val,
                                            priceMin: val,
                                            priceMax: val
                                        }));
                                    }}
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="col">
                                <label>Operatsiya davomiyligi (daqiqa)</label>
                                <input
                                    type="number"
                                    value={formData.durationMinutes}
                                    onChange={(e) => handleFormChange('durationMinutes', e.target.value)}
                                />
                            </div>
                            <div className="col">
                                <label>Sog'ayish davri (kun)</label>
                                <input
                                    type="number"
                                    value={formData.recoveryDays}
                                    onChange={(e) => handleFormChange('recoveryDays', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 3: // Anesthesia & Hospitalization
                return (
                    <div className="step-content animated fade-in">
                        <h3><ShieldCheck className="step-icon" /> Anesteziya va Shifoxona</h3>
                        <div className="form-group row">
                            <div className="col">
                                <label>Anesteziya turi</label>
                                <select
                                    value={formData.anesthesiaType || 'GENERAL'}
                                    onChange={(e) => handleFormChange('anesthesiaType', e.target.value)}
                                >
                                    <option value="LOCAL">Mahalliy (Local)</option>
                                    <option value="GENERAL">Umumiy (General)</option>
                                    <option value="SPINAL">Spinal</option>
                                    <option value="SEDATION">Sedatsiya</option>
                                </select>
                            </div>
                            <div className="col">
                                <label>Yotish muddati (kun)</label>
                                <input
                                    type="number"
                                    value={formData.hospitalizationDays}
                                    onChange={(e) => handleFormChange('hospitalizationDays', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="col">
                                <label>Palata turi</label>
                                <select
                                    value={formData.roomType || 'STANDARD'}
                                    onChange={(e) => handleFormChange('roomType', e.target.value)}
                                >
                                    <option value="STANDARD">Standard</option>
                                    <option value="COMFORT">Comfort</option>
                                    <option value="LUX">Lux</option>
                                    <option value="VIP">VIP</option>
                                </select>
                            </div>
                            <div className="col" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 25 }}>
                                <input
                                    type="checkbox"
                                    id="requiresICU"
                                    checked={formData.requiresICU}
                                    onChange={(e) => handleFormChange('requiresICU', e.target.checked)}
                                />
                                <label htmlFor="requiresICU" style={{ margin: 0 }}>Reanimatsiya (ICU) zarur</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Hospitlizatsiya haqida eslatmalar</label>
                            <textarea
                                value={formData.hospitalizationNotes || ''}
                                onChange={(e) => handleFormChange('hospitalizationNotes', e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 4: // Pre-operation
                return (
                    <div className="step-content animated fade-in">
                        <h3><ClipboardCheck className="step-icon" /> Tayyorgarlik</h3>
                        <div className="form-group">
                            <label>Zaruriy tahlillar</label>
                            {(formData.requiredTests || []).map((test, i) => (
                                <div key={i} className="array-input-row">
                                    <input
                                        value={test}
                                        onChange={(e) => handleArrayChange('requiredTests', i, e.target.value)}
                                        placeholder="Tahlil nomi..."
                                    />
                                    <button onClick={() => removeArrayItem('requiredTests', i)}><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button className="btn-add-item" onClick={() => addArrayItem('requiredTests')}>
                                <Plus size={14} /> Tahlil qo'shish
                            </button>
                        </div>
                        <div className="form-group row">
                            <div className="col" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                    type="checkbox"
                                    id="fasting"
                                    checked={formData.preparationFasting}
                                    onChange={(e) => handleFormChange('preparationFasting', e.target.checked)}
                                />
                                <label htmlFor="fasting" style={{ margin: 0 }}>Ochlik talab etiladi</label>
                            </div>
                            {formData.preparationFasting && (
                                <div className="col">
                                    <label>Ochlik vaqti (soat)</label>
                                    <input
                                        type="number"
                                        value={formData.fastingHours}
                                        onChange={(e) => handleFormChange('fastingHours', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 5: // Operation Details
                return (
                    <div className="step-content animated fade-in">
                        <h3><Thermometer className="step-icon" /> Operatsiya Tafsilotlari</h3>
                        <div className="form-group row">
                            <div className="col">
                                <label>Murakkablik darajasi</label>
                                <select
                                    value={formData.complexity}
                                    onChange={(e) => handleFormChange('complexity', e.target.value)}
                                >
                                    <option value="SIMPLE">Oddiy (Simple)</option>
                                    <option value="MEDIUM">O'rtacha (Medium)</option>
                                    <option value="COMPLEX">Murakkab (Complex)</option>
                                    <option value="ADVANCED">Yuqori texnologik (Advanced)</option>
                                </select>
                            </div>
                            <div className="col">
                                <label>Xavf darajasi</label>
                                <select
                                    value={formData.riskLevel}
                                    onChange={(e) => handleFormChange('riskLevel', e.target.value)}
                                >
                                    <option value="LOW">Past (Low)</option>
                                    <option value="MEDIUM">O'rtacha (Medium)</option>
                                    <option value="HIGH">Yuqori (High)</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="col">
                                <label>Jarroh tajribasi (min. yil)</label>
                                <input
                                    type="number"
                                    value={formData.minSurgeonExperience}
                                    onChange={(e) => handleFormChange('minSurgeonExperience', e.target.value)}
                                />
                            </div>
                            <div className="col">
                                <label>Mutaxassislik</label>
                                <input
                                    type="text"
                                    value={formData.surgeonSpecialization}
                                    onChange={(e) => handleFormChange('surgeonSpecialization', e.target.value)}
                                    placeholder="Masalan: Neyroxirurg"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 6: // Post-operation
                return (
                    <div className="step-content animated fade-in">
                        <h3><Milestone className="step-icon" /> Operatsiyadan Keyin</h3>
                        <div className="form-group">
                            <label>Zudlik bilan parvarish (ICU/Palata)</label>
                            <textarea
                                value={formData.postOpImmediate?.monitoring || ''}
                                onChange={(e) => handleFormChange('postOpImmediate', { ...formData.postOpImmediate, monitoring: e.target.value })}
                                placeholder="Monitoring va dori-darmonlar..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Uy sharoitida parvarish</label>
                            <textarea
                                value={formData.postOpHome?.care || ''}
                                onChange={(e) => handleFormChange('postOpHome', { ...formData.postOpHome, care: e.target.value })}
                                placeholder="Rejim va cheklovlar..."
                            />
                        </div>
                    </div>
                );
            case 7: // Package
                return (
                    <div className="step-content animated fade-in">
                        <h3><Package className="step-icon" /> Paket Tarkibi</h3>
                        <div className="form-group">
                            <label>Kiritilgan xizmatlar</label>
                            {(formData.packageIncluded || []).map((item, i) => (
                                <div key={i} className="array-input-row">
                                    <input
                                        value={item.item || ''}
                                        onChange={(e) => {
                                            const newArr = [...formData.packageIncluded];
                                            newArr[i] = { ...newArr[i], item: e.target.value };
                                            handleFormChange('packageIncluded', newArr);
                                        }}
                                        placeholder="Xizmat nomi..."
                                    />
                                    <button onClick={() => removeArrayItem('packageIncluded', i)}><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button className="btn-add-item" onClick={() => addArrayItem('packageIncluded', { item: '', desc: '' })}>
                                <Plus size={14} /> Element qo'shish
                            </button>
                        </div>
                    </div>
                );
            case 8: // Review
                return (
                    <div className="step-content animated fade-in review-step">
                        <h3><HelpCircle className="step-icon" /> Yakuniy Tekshirish</h3>
                        <div className="review-summary">
                            {/* Step 1: Basic Info */}
                            <div className="summary-card">
                                <h4>{formData.nameUz}</h4>
                                {formData.nameRu && <p style={{ fontSize: 13, color: '#64748b' }}>{formData.nameRu}</p>}
                                {formData.shortDescription && <p>{formData.shortDescription}</p>}
                                {formData.fullDescription && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{formData.fullDescription.substring(0, 150)}{formData.fullDescription.length > 150 ? '...' : ''}</p>}
                            </div>

                            {/* Step 2: Price & Time */}
                            <div className="review-section">
                                <h5 className="review-section-title">💰 Narx va Vaqt</h5>
                                <div className="summary-stats">
                                    <div className="stat"><span>Narx:</span> {Number(formData.priceRecommended).toLocaleString()} UZS</div>
                                    <div className="stat"><span>Vaqt:</span> {formData.durationMinutes} daqiqa</div>
                                    <div className="stat"><span>Sog'ayish:</span> {formData.recoveryDays} kun</div>
                                </div>
                            </div>

                            {/* Step 3: Anesthesia & Hospital */}
                            <div className="review-section">
                                <h5 className="review-section-title">🏥 Anesteziya va Shifoxona</h5>
                                <div className="review-grid">
                                    <div className="grid-item">
                                        <h5>Anesteziya</h5>
                                        <p>{formData.anesthesiaType}</p>
                                    </div>
                                    <div className="grid-item">
                                        <h5>Shifoxona</h5>
                                        <p>{formData.hospitalizationDays} kun ({formData.roomType})</p>
                                    </div>
                                    <div className="grid-item">
                                        <h5>ICU</h5>
                                        <p>{formData.requiresICU ? `Ha (${formData.icuDays} kun)` : 'Yo\'q'}</p>
                                    </div>
                                </div>
                                {formData.hospitalizationNotes && <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{formData.hospitalizationNotes}</p>}
                            </div>

                            {/* Step 4: Preparation */}
                            <div className="review-section">
                                <h5 className="review-section-title">📋 Tayyorgarlik</h5>
                                {(formData.requiredTests || []).length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Zaruriy tahlillar:</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                            {formData.requiredTests.map((t, i) => t && (
                                                <span key={i} style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {formData.preparationFasting && <p style={{ fontSize: 12 }}>🍽️ Ochlik: {formData.fastingHours} soat</p>}
                                {!formData.preparationFasting && (formData.requiredTests || []).length === 0 && <p style={{ fontSize: 12, color: '#94a3b8' }}>Ma'lumot kiritilmagan</p>}
                            </div>

                            {/* Step 5: Operation Details */}
                            <div className="review-section">
                                <h5 className="review-section-title">⚕️ Operatsiya Tafsilotlari</h5>
                                <div className="review-grid">
                                    <div className="grid-item">
                                        <h5>Murakkablik</h5>
                                        <p>{formData.complexity}</p>
                                    </div>
                                    <div className="grid-item">
                                        <h5>Xavf darajasi</h5>
                                        <p>{formData.riskLevel}</p>
                                    </div>
                                    <div className="grid-item">
                                        <h5>Jarroh tajribasi</h5>
                                        <p>{formData.minSurgeonExperience} yil</p>
                                    </div>
                                </div>
                                {formData.surgeonSpecialization && <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Mutaxassislik: {formData.surgeonSpecialization}</p>}
                            </div>

                            {/* Step 6: Post-operation */}
                            <div className="review-section">
                                <h5 className="review-section-title">🩺 Operatsiyadan Keyin</h5>
                                {formData.postOpImmediate?.monitoring && <p style={{ fontSize: 12 }}><strong>Monitoring:</strong> {formData.postOpImmediate.monitoring.substring(0, 100)}</p>}
                                {formData.postOpHome?.care && <p style={{ fontSize: 12 }}><strong>Uy parvarishi:</strong> {formData.postOpHome.care.substring(0, 100)}</p>}
                                {!formData.postOpImmediate?.monitoring && !formData.postOpHome?.care && <p style={{ fontSize: 12, color: '#94a3b8' }}>Ma'lumot kiritilmagan</p>}
                            </div>

                            {/* Step 7: Package */}
                            {(formData.packageIncluded || []).length > 0 && (
                                <div className="review-section">
                                    <h5 className="review-section-title">📦 Paket Tarkibi</h5>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {formData.packageIncluded.map((p, i) => p?.item && (
                                            <span key={i} style={{ fontSize: 11, background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: 6 }}>✅ {p.item}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="form-group" style={{ marginTop: 20 }}>
                            <label>Muvaffaqiyat ko'rsatkichi (%)</label>
                            <input
                                type="number"
                                value={formData.successRate}
                                onChange={(e) => handleFormChange('successRate', e.target.value)}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="surgical-form-wizard">
            <div className="wizard-sidebar">
                {SURGICAL_STEPS.map((s, i) => (
                    <div
                        key={i}
                        className={`step-nav-item ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}
                        onClick={() => setStep(i + 1)}
                    >
                        <div className="step-num">{i + 1}</div>
                        <div className="step-info">
                            <div className="step-title">{s.title}</div>
                            <div className="step-desc">{s.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="wizard-main">
                <div className="wizard-body">
                    {renderStepContent()}
                </div>

                <div className="wizard-footer">
                    <button className="btn-secondary" onClick={step === 1 ? onCancel : prevStep}>
                        {step === 1 ? 'Bekor qilish' : 'Orqaga'}
                    </button>
                    {step < 8 ? (
                        <button className="btn-primary" onClick={nextStep}>
                            Keyingisi <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button className="btn-save-final" onClick={onSave} disabled={saving}>
                            {saving ? <><Loader2 size={16} className="spin" /> Saqlanmoqda...</> : '🔥 Operatsiyani nashr etish'}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .surgical-form-wizard {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    height: 600px;
                    background: white;
                }
                .wizard-sidebar {
                    background: var(--bg-hover);
                    padding: 20px;
                    border-right: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .step-nav-item {
                    display: flex;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .step-nav-item.active {
                    background: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border-left: 4px solid var(--color-primary);
                }
                .step-num {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: var(--bg-card);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 13px;
                }
                .step-nav-item.active .step-num {
                    background: var(--color-primary);
                    color: white;
                }
                .step-title { font-weight: 600; font-size: 14px; }
                .step-desc { font-size: 11px; color: var(--text-muted); }
                
                .wizard-main {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .wizard-body {
                    flex: 1;
                    padding: 30px;
                    overflow-y: auto;
                }
                .wizard-footer {
                    padding: 20px 30px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                }
                .step-icon { width: 20px; height: 20px; vertical-align: middle; margin-right: 10px; color: var(--color-primary); }
                .btn-add-item {
                    background: none;
                    border: 1px dashed var(--color-primary);
                    color: var(--color-primary);
                    width: 100%;
                    padding: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 10px;
                }
                .array-input-row {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 8px;
                }
                .array-input-row input { flex: 1; }
                .array-input-row button {
                    background: var(--bg-hover);
                    border: none;
                    color: #e53935;
                    padding: 8px;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .review-summary {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }
                .summary-card h4 { font-size: 20px; margin-bottom: 5px; }
                .summary-stats { display: flex; gap: 20px; margin-top: 15px; }
                .stat span { font-weight: 700; color: var(--text-muted); }
                .review-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-top: 20px;
                }
                .grid-item h5 { font-size: 11px; text-transform: uppercase; color: var(--text-muted); }
                .review-section {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #e2e8f0;
                }
                .review-section-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 10px;
                }
                .summary-card {
                    padding-bottom: 12px;
                }
            `}</style>
        </div>
    );
};

export default SurgicalForm;
