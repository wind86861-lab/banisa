import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import api from '../../shared/api/axios';
import './css/AppointmentMetadataInput.css';

export default function AppointmentMetadataInput({ appointmentId }) {
  const [values, setValues] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const queryClient = useQueryClient();

  const { data: requiredMetadata, isLoading } = useQuery({
    queryKey: ['clinic', 'appointments', appointmentId, 'required-metadata'],
    queryFn: async () => {
      const res = await api.get(`/clinic/appointments/${appointmentId}/required-metadata`);
      return res.data.data;
    },
    enabled: !!appointmentId,
  });

  useEffect(() => {
    if (requiredMetadata) {
      const initialValues = {};
      requiredMetadata.forEach((item) => {
        if (item.currentValue) {
          initialValues[item.template.id] = item.currentValue;
        }
      });
      setValues(initialValues);
    }
  }, [requiredMetadata]);

  const saveMutation = useMutation({
    mutationFn: async ({ templateId, value }) => {
      await api.post(`/clinic/appointments/${appointmentId}/metadata`, {
        templateId,
        value,
      });
    },
    onSuccess: (_, variables) => {
      setSaveStatus((prev) => ({ ...prev, [variables.templateId]: 'success' }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [variables.templateId]: null }));
      }, 2000);
      queryClient.invalidateQueries({
        queryKey: ['clinic', 'appointments', appointmentId, 'required-metadata'],
      });
    },
    onError: (error, variables) => {
      setSaveStatus((prev) => ({
        ...prev,
        [variables.templateId]: error.response?.data?.error?.message || 'Xatolik',
      }));
    },
  });

  const handleChange = (templateId, value) => {
    setValues((prev) => ({ ...prev, [templateId]: value }));
  };

  const handleSave = (template) => {
    const value = values[template.id];

    // Client-side validation
    if (template.validation?.required && !value) {
      setSaveStatus((prev) => ({ ...prev, [template.id]: 'Majburiy maydon' }));
      return;
    }

    if (template.inputType === 'NUMBER') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        setSaveStatus((prev) => ({ ...prev, [template.id]: 'Noto\'g\'ri raqam' }));
        return;
      }
      if (template.validation?.min && num < template.validation.min) {
        setSaveStatus((prev) => ({
          ...prev,
          [template.id]: `Min: ${template.validation.min}`,
        }));
        return;
      }
      if (template.validation?.max && num > template.validation.max) {
        setSaveStatus((prev) => ({
          ...prev,
          [template.id]: `Max: ${template.validation.max}`,
        }));
        return;
      }
    }

    setSaveStatus((prev) => ({ ...prev, [template.id]: 'saving' }));
    saveMutation.mutate({ templateId: template.id, value });
  };

  if (isLoading) {
    return (
      <div className="metadata-input-loading">
        <Loader size={24} className="spin" />
        <span>Yuklanmoqda...</span>
      </div>
    );
  }

  if (!requiredMetadata || requiredMetadata.length === 0) {
    return null;
  }

  return (
    <div className="appointment-metadata-section">
      <h3 className="metadata-section-title">Qo'shimcha ma'lumotlar</h3>
      <div className="metadata-fields">
        {requiredMetadata.map((item) => (
          <MetadataField
            key={item.template.id}
            template={item.template}
            isRequired={item.isRequired}
            value={values[item.template.id] || ''}
            onChange={(value) => handleChange(item.template.id, value)}
            onSave={() => handleSave(item.template)}
            saveStatus={saveStatus[item.template.id]}
          />
        ))}
      </div>
    </div>
  );
}

function MetadataField({ template, isRequired, value, onChange, onSave, saveStatus }) {
  const renderInput = () => {
    switch (template.inputType) {
      case 'NUMBER':
        return (
          <div className="input-with-unit">
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onSave}
              min={template.validation?.min}
              max={template.validation?.max}
              step="0.1"
              required={isRequired}
              className={saveStatus && saveStatus !== 'success' && saveStatus !== 'saving' ? 'error' : ''}
            />
            {template.unit && <span className="unit">{template.unit}</span>}
          </div>
        );

      case 'SELECT':
        return (
          <select
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setTimeout(onSave, 100);
            }}
            required={isRequired}
          >
            <option value="">Tanlang</option>
            {template.validation?.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            required={isRequired}
          />
        );

      case 'CHECKBOX':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => {
                onChange(e.target.checked ? 'true' : 'false');
                setTimeout(onSave, 100);
              }}
            />
            <span>Ha</span>
          </label>
        );

      case 'TEXTAREA':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            maxLength={template.validation?.maxLength}
            required={isRequired}
            rows={3}
          />
        );

      case 'TEXT':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            maxLength={template.validation?.maxLength}
            required={isRequired}
          />
        );
    }
  };

  return (
    <div className="metadata-field">
      <label>
        {template.labelUz}
        {isRequired && <span className="required">*</span>}
      </label>
      {renderInput()}
      {saveStatus && (
        <div className={`save-status ${saveStatus === 'success' ? 'success' : saveStatus === 'saving' ? 'saving' : 'error'}`}>
          {saveStatus === 'success' ? (
            <>
              <CheckCircle2 size={14} />
              <span>Saqlandi</span>
            </>
          ) : saveStatus === 'saving' ? (
            <>
              <Loader size={14} className="spin" />
              <span>Saqlanmoqda...</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} />
              <span>{saveStatus}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
