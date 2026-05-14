import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, AlertCircle, Search } from 'lucide-react';
import api from '../../shared/api/axios';
import './css/MetadataModals.css';

export default function LinkServiceModal({ template, onClose, onSuccess }) {
  const [serviceType, setServiceType] = useState('DIAGNOSTIC');
  const [selectedService, setSelectedService] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});

  const { data: services, isLoading } = useQuery({
    queryKey: ['admin', 'services', serviceType],
    queryFn: async () => {
      const endpoint =
        serviceType === 'DIAGNOSTIC'
          ? '/diagnostic'
          : serviceType === 'SURGICAL'
            ? '/surgical'
            : '/checkup-packages';
      const res = await api.get(endpoint);
      return res.data.data;
    },
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/metadata-templates/${template.id}/link-service`, {
        serviceType,
        serviceId: selectedService,
        isRequired,
      });
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
    if (!selectedService) {
      setErrors({ service: 'Xizmatni tanlang' });
      return;
    }
    linkMutation.mutate();
  };

  const filteredServices = services?.filter((s) =>
    s.nameUz?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Xizmatga bog'lash</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              {template.labelUz}
            </p>
          </div>
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
                <label>Xizmat turi</label>
                <select
                  value={serviceType}
                  onChange={(e) => {
                    setServiceType(e.target.value);
                    setSelectedService('');
                  }}
                >
                  <option value="DIAGNOSTIC">Diagnostika</option>
                  <option value="SURGICAL">Jarrohlik</option>
                  <option value="CHECKUP">Checkup</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Qidiruv</label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                    }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Xizmat nomini kiriting..."
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>
                  Xizmat <span className="required">*</span>
                </label>
                {isLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    Yuklanmoqda...
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                    }}
                  >
                    {filteredServices && filteredServices.length > 0 ? (
                      filteredServices.map((service) => (
                        <label
                          key={service.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                        >
                          <input
                            type="radio"
                            name="service"
                            value={service.id}
                            checked={selectedService === service.id}
                            onChange={(e) => setSelectedService(e.target.value)}
                            style={{ marginRight: '12px' }}
                          />
                          <span style={{ fontSize: '14px', color: '#1a1a2e' }}>
                            {service.nameUz}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        Xizmat topilmadi
                      </div>
                    )}
                  </div>
                )}
                {errors.service && <span className="error-text">{errors.service}</span>}
              </div>

              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                  />
                  Majburiy maydon (klinika to'ldirishi shart)
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
              disabled={linkMutation.isPending || !selectedService}
            >
              {linkMutation.isPending ? 'Bog\'lanmoqda...' : 'Bog\'lash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
