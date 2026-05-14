import { useState } from 'react';
import { useMutation } from '@tantml:query';
import { X, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import './css/MetadataModals.css';

export default function EditTemplateModal({ template, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    labelUz: template.labelUz || '',
    labelRu: template.labelRu || '',
    labelEn: template.labelEn || '',
    unit: template.unit || '',
    category: template.category || 'MEDICAL_INFO',
    visibleToPatient: template.visibleToPatient !== false,
    editableBy: template.editableBy || 'CLINIC',
    isActive: template.isActive !== false,
  });

  const [errors, setErrors] = useState({});

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await api.put(`/admin/metadata-templates/${template.id}`, data);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.error?.message || 'Xatolik yuz berdi' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.labelUz.trim()) {
      setErrors({ labelUz: 'Uzbek label majburiy' });
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Template tahrirlash</h2>
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
              <div className="form-group full-width">
                <label>
                  Key <small>(o'zgartirib bo'lmaydi)</small>
                </label>
                <input type="text" value={template.key} disabled />
              </div>

              <div className="form-group">
                <label>
                  Label (UZ) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.labelUz}
                  onChange={(e) => setFormData({ ...formData, labelUz: e.target.value })}
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
                />
              </div>

              <div className="form-group">
                <label>Label (EN)</label>
                <input
                  type="text"
                  value={formData.labelEn}
                  onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Birlik</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

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
                    checked={formData.visibleToPatient}
                    onChange={(e) =>
                      setFormData({ ...formData, visibleToPatient: e.target.checked })
                    }
                  />
                  Bemor ko'rishi mumkin
                </label>
              </div>

              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Faol
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
