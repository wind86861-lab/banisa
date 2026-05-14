import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
import api from '../../shared/api/axios';
import './css/MetadataModals.css';

export default function CreateTemplateModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    key: '',
    labelUz: '',
    labelRu: '',
    labelEn: '',
    inputType: 'NUMBER',
    unit: '',
    category: 'MEDICAL_INFO',
    validation: {
      required: false,
      min: '',
      max: '',
      maxLength: '',
      options: [],
    },
    visibleToPatient: true,
    editableBy: 'CLINIC',
  });

  const [errors, setErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Sanitize and validate
      const sanitized = {
        key: data.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        labelUz: data.labelUz.trim(),
        labelRu: data.labelRu?.trim() || null,
        labelEn: data.labelEn?.trim() || null,
        inputType: data.inputType,
        unit: data.unit?.trim() || null,
        category: data.category,
        validation: {},
        visibleToPatient: data.visibleToPatient,
        editableBy: data.editableBy,
      };

      // Build validation object
      if (data.inputType === 'NUMBER') {
        if (data.validation.min) sanitized.validation.min = parseFloat(data.validation.min);
        if (data.validation.max) sanitized.validation.max = parseFloat(data.validation.max);
      }
      if (data.inputType === 'SELECT' && data.validation.options.length > 0) {
        sanitized.validation.options = data.validation.options;
      }
      if (['TEXT', 'TEXTAREA'].includes(data.inputType) && data.validation.maxLength) {
        sanitized.validation.maxLength = parseInt(data.validation.maxLength);
      }
      sanitized.validation.required = data.validation.required;

      await api.post('/admin/metadata-templates', sanitized);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error?.message || 'Xatolik yuz berdi' });
    },
  });

  const validate = () => {
    const newErrors = {};

    if (!formData.key.trim()) newErrors.key = 'Key majburiy';
    if (!formData.labelUz.trim()) newErrors.labelUz = 'Uzbek label majburiy';

    if (formData.inputType === 'NUMBER') {
      if (formData.validation.min && formData.validation.max) {
        if (parseFloat(formData.validation.min) >= parseFloat(formData.validation.max)) {
          newErrors.validation = 'Min < Max bo\'lishi kerak';
        }
      }
    }

    if (formData.inputType === 'SELECT' && formData.validation.options.length === 0) {
      newErrors.options = 'Kamida 1 ta variant kerak';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      createMutation.mutate(formData);
    }
  };

  const handleOptionsChange = (value) => {
    const options = value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData({
      ...formData,
      validation: { ...formData.validation, options },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Yangi Metadata Template</h2>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.submit && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{errors.submit}</span>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label>
                  Key (unique) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="patient_weight"
                  className={errors.key ? 'error' : ''}
                />
                {errors.key && <span className="error-text">{errors.key}</span>}
                <small>Faqat kichik harflar, raqamlar va _ belgisi</small>
              </div>

              <div className="form-group">
                <label>
                  Label (UZ) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.labelUz}
                  onChange={(e) => setFormData({ ...formData, labelUz: e.target.value })}
                  placeholder="Bemor vazni"
                  className={errors.labelUz ? 'error' : ''}
                />
                {errors.labelUz && <span className="error-text">{errors.labelUz}</span>}
              </div>

              <div className="form-group">
                <label>Label (RU)</label>
                <input
                  type="text"
                  value={formData.labelRu}
                  onChange={(e) => setFormData({ ...formData, labelRu: e.target.value })}
                  placeholder="Вес пациента"
                />
              </div>

              <div className="form-group">
                <label>Label (EN)</label>
                <input
                  type="text"
                  value={formData.labelEn}
                  onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
                  placeholder="Patient Weight"
                />
              </div>

              <div className="form-group">
                <label>
                  Input Type <span className="required">*</span>
                </label>
                <select
                  value={formData.inputType}
                  onChange={(e) => setFormData({ ...formData, inputType: e.target.value })}
                >
                  <option value="NUMBER">Raqam</option>
                  <option value="TEXT">Matn</option>
                  <option value="SELECT">Tanlash</option>
                  <option value="CHECKBOX">Belgilash</option>
                  <option value="DATE">Sana</option>
                  <option value="TEXTAREA">Ko'p qatorli matn</option>
                </select>
              </div>

              {formData.inputType === 'NUMBER' && (
                <>
                  <div className="form-group">
                    <label>Birlik</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="kg, cm, ml"
                    />
                  </div>

                  <div className="form-group">
                    <label>Min qiymat</label>
                    <input
                      type="number"
                      value={formData.validation.min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          validation: { ...formData.validation, min: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Max qiymat</label>
                    <input
                      type="number"
                      value={formData.validation.max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          validation: { ...formData.validation, max: e.target.value },
                        })
                      }
                    />
                  </div>
                </>
              )}

              {formData.inputType === 'SELECT' && (
                <div className="form-group full-width">
                  <label>
                    Variantlar (vergul bilan ajratilgan) <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.validation.options.join(', ')}
                    onChange={(e) => handleOptionsChange(e.target.value)}
                    placeholder="O+, O-, A+, A-, B+, B-, AB+, AB-"
                    className={errors.options ? 'error' : ''}
                  />
                  {errors.options && <span className="error-text">{errors.options}</span>}
                </div>
              )}

              {['TEXT', 'TEXTAREA'].includes(formData.inputType) && (
                <div className="form-group">
                  <label>Max uzunlik</label>
                  <input
                    type="number"
                    value={formData.validation.maxLength}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validation: { ...formData.validation, maxLength: e.target.value },
                      })
                    }
                    placeholder="500"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Kategoriya</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="MEDICAL_INFO">Tibbiy ma'lumot</option>
                  <option value="PREPARATION">Tayyorgarlik</option>
                  <option value="RESTRICTION">Cheklov</option>
                  <option value="ADDITIONAL_INFO">Qo'shimcha</option>
                </select>
              </div>

              <div className="form-group">
                <label>Kim tahrirlaydi</label>
                <select
                  value={formData.editableBy}
                  onChange={(e) => setFormData({ ...formData, editableBy: e.target.value })}
                >
                  <option value="CLINIC">Faqat klinika</option>
                  <option value="OPERATOR">Faqat operator</option>
                  <option value="BOTH">Ikkalasi ham</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.validation.required}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validation: { ...formData.validation, required: e.target.checked },
                      })
                    }
                  />
                  Majburiy maydon
                </label>
              </div>

              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.visibleToPatient}
                    onChange={(e) =>
                      setFormData({ ...formData, visibleToPatient: e.target.checked })
                    }
                  />
                  Bemor ko'rishi mumkin
                </label>
              </div>
            </div>

            {errors.validation && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{errors.validation}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
