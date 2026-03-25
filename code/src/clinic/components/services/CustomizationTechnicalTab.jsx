import { Beaker, Clock, FileText, Award, Target } from 'lucide-react';

export default function CustomizationTechnicalTab({ formData, setFormData, service }) {
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCertificationChange = (index, value) => {
        const newCerts = [...(formData.certifications || [])];
        newCerts[index] = value;
        setFormData(prev => ({ ...prev, certifications: newCerts }));
    };

    const addCertification = () => {
        setFormData(prev => ({
            ...prev,
            certifications: [...(prev.certifications || []), '']
        }));
    };

    const removeCertification = (index) => {
        const newCerts = (formData.certifications || []).filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, certifications: newCerts }));
    };

    return (
        <div className="customization-tab-content">
            <div className="tab-section">
                <div className="section-header">
                    <Beaker size={20} />
                    <div>
                        <h3>Texnik parametrlar</h3>
                        <p className="section-desc">Sizning klinikangizda qo'llaniladigan texnik ko'rsatkichlar</p>
                    </div>
                </div>

                <div className="form-group row">
                    <div className="col">
                        <label>Namuna hajmi</label>
                        <small className="field-hint">Sizning klinikangiz qancha namuna oladi</small>
                        <input
                            type="text"
                            placeholder="5 ml"
                            value={formData.sampleVolume || ''}
                            onChange={(e) => handleChange('sampleVolume', e.target.value)}
                        />
                    </div>
                    <div className="col">
                        <label>Natija formati</label>
                        <small className="field-hint">Qanday formatda natija beriladi</small>
                        <input
                            type="text"
                            placeholder="PDF, Online kabinet, SMS"
                            value={formData.resultFormat || ''}
                            onChange={(e) => handleChange('resultFormat', e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-group row">
                    <div className="col">
                        <label>Natija vaqti (soat)</label>
                        <small className="field-hint">Sizning klinikangizda natija qancha vaqtda tayyor bo'ladi</small>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="24"
                            value={formData.resultTimeHours || ''}
                            onChange={(e) => handleChange('resultTimeHours', e.target.value ? parseFloat(e.target.value) : null)}
                        />
                    </div>
                    <div className="col">
                        <label>Davomiyligi (daqiqa)</label>
                        <small className="field-hint">Jarayon qancha vaqt davom etadi</small>
                        <input
                            type="number"
                            min="1"
                            placeholder="15"
                            value={formData.estimatedDurationMinutes || ''}
                            onChange={(e) => handleChange('estimatedDurationMinutes', e.target.value ? parseInt(e.target.value) : null)}
                        />
                    </div>
                </div>
            </div>

            <div className="tab-section">
                <div className="section-header">
                    <Target size={20} />
                    <div>
                        <h3>Uskunalar va sifat</h3>
                        <p className="section-desc">Sizning klinikangizda ishlatilayotgan uskunalar va sifat ko'rsatkichlari</p>
                    </div>
                </div>

                <div className="form-group">
                    <label>Uskunalar</label>
                    <small className="field-hint">Qanday uskunalar va analizatorlar ishlatiladi</small>
                    <input
                        type="text"
                        placeholder="Siemens Atellica 1500, Sysmex XN-1000"
                        value={formData.equipment || ''}
                        onChange={(e) => handleChange('equipment', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Aniqlik</label>
                    <small className="field-hint">Laboratoriyangizning aniqlik darajasi</small>
                    <input
                        type="text"
                        placeholder="99.5%"
                        value={formData.accuracy || ''}
                        onChange={(e) => handleChange('accuracy', e.target.value)}
                    />
                </div>
            </div>

            <div className="tab-section">
                <div className="section-header">
                    <Award size={20} />
                    <div>
                        <h3>Sertifikatlar va akkreditatsiyalar</h3>
                        <p className="section-desc">Sizning laboratoriyangiz ega bo'lgan sertifikatlar</p>
                    </div>
                </div>

                <div className="form-group">
                    <label>Sertifikatlar</label>
                    <small className="field-hint">Har bir sertifikatni alohida qo'shing</small>
                    
                    {(formData.certifications || []).map((cert, index) => (
                        <div key={index} className="input-with-remove" style={{ marginBottom: '8px' }}>
                            <input
                                type="text"
                                placeholder="ISO 15189, CAP, CLIA..."
                                value={cert}
                                onChange={(e) => handleCertificationChange(index, e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn-icon danger"
                                onClick={() => removeCertification(index)}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={addCertification}
                        style={{ marginTop: '8px' }}
                    >
                        + Sertifikat qo'shish
                    </button>
                </div>
            </div>

            <div className="info-box">
                <strong>💡 Maslahat:</strong> Zamonaviy uskunalar va yuqori aniqlik bemorlar ishonchini oshiradi. 
                Xalqaro sertifikatlar (ISO, CAP, CLIA) klinikangizning professionalligini ko'rsatadi.
            </div>
        </div>
    );
}
