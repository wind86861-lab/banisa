import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, AlertCircle, Search, ChevronRight, ChevronDown } from 'lucide-react';
import api from '../../shared/api/axios';
import './css/MetadataModals.css';

export default function LinkServiceModal({ template, onClose, onSuccess }) {
  const [serviceType, setServiceType] = useState('DIAGNOSTIC');
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [isRequired, setIsRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Already linked service IDs from template
  const alreadyLinkedIds = useMemo(() => {
    const links = template?.serviceLinks || [];
    return new Set(links.map(l => l.serviceId));
  }, [template]);

  // Fetch categories
  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['admin', 'categories', serviceType],
    queryFn: async () => {
      const res = await api.get('/categories');
      const allCats = res.data.data || [];
      if (serviceType === 'DIAGNOSTIC') {
        return allCats.filter(c => c.nameUz?.toLowerCase().includes('diagnos') || c.slug?.includes('diagnostic'));
      }
      if (serviceType === 'SURGICAL') {
        return allCats.filter(c => c.nameUz?.toLowerCase().includes('operat') || c.slug?.includes('surgical'));
      }
      return allCats;
    },
    enabled: serviceType !== 'CHECKUP',
  });

  // Fetch all services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['admin', 'services', serviceType],
    queryFn: async () => {
      const endpoint =
        serviceType === 'DIAGNOSTIC'
          ? '/diagnostics?limit=1000'
          : serviceType === 'SURGICAL'
            ? '/surgical?limit=1000'
            : '/checkup-packages?limit=1000';
      const res = await api.get(endpoint);
      return res.data.data || [];
    },
  });

  const isLoading = catsLoading || servicesLoading;

  // Group services by category
  const servicesByCategory = useMemo(() => {
    if (!services || !categories) return {};
    const map = {};
    services.forEach(s => {
      const catId = s.categoryId;
      if (!map[catId]) map[catId] = [];
      map[catId].push(s);
    });
    return map;
  }, [services, categories]);

  // Filter services by search
  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchQuery.trim()) return services;
    return services.filter(s =>
      s.nameUz?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const toggleService = (serviceId) => {
    if (alreadyLinkedIds.has(serviceId)) return;
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const linkMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedServices).map(serviceId =>
        api.post(`/admin/metadata-templates/${template.id}/link-service`, {
          serviceType,
          serviceId,
          isRequired,
        })
      );
      await Promise.all(promises);
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
    if (selectedServices.size === 0) {
      setErrors({ service: 'Kamida bitta xizmatni tanlang' });
      return;
    }
    linkMutation.mutate();
  };

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const selectedCount = selectedServices.size;

  // Render one service row
  const ServiceRow = ({ service, indent = 0 }) => {
    const isLinked = alreadyLinkedIds.has(service.id);
    const isSelected = selectedServices.has(service.id) || isLinked;
    const paddingLeft = 14 + indent;
    return (
      <div
        key={service.id}
        onClick={() => toggleService(service.id)}
        style={{
          display: 'grid',
          gridTemplateColumns: '24px 1fr',
          alignItems: 'center',
          gap: '10px',
          padding: `9px 14px 9px ${paddingLeft}px`,
          cursor: isLinked ? 'default' : 'pointer',
          borderBottom: '1px solid #f3f4f6',
          background: isLinked ? '#f0fdf4' : isSelected ? '#eff6ff' : 'white',
          opacity: isLinked ? 0.85 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          disabled={isLinked}
          onChange={() => toggleService(service.id)}
        />
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: isSelected ? '600' : '400',
            color: isLinked ? '#166534' : '#1a1a2e',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {service.nameUz}
            {isLinked && (
              <span style={{
                fontSize: '10px',
                background: '#22c55e',
                color: 'white',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                Bog'langan
              </span>
            )}
          </div>
          {service.priceRecommended ? (
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              {service.priceRecommended.toLocaleString()} so'm
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Narx ko'rsatilmagan</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Xizmatga bog'lash</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              {template.labelUz} — {selectedCount > 0 ? `${selectedCount} ta yangi tanlandi` : 'Xizmatlarni tanlang'}
            </p>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <div className="modal-body">
            {errors.submit && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{errors.submit}</span>
              </div>
            )}

            <div className="form-grid">
              {/* Service Type */}
              <div className="form-group full-width">
                <label>Xizmat turi</label>
                <select
                  value={serviceType}
                  onChange={(e) => {
                    setServiceType(e.target.value);
                    setSelectedServices(new Set());
                    setSearchQuery('');
                    setExpandedCategories(new Set());
                  }}
                >
                  <option value="DIAGNOSTIC">Diagnostika</option>
                  <option value="SURGICAL">Jarrohlik</option>
                  <option value="CHECKUP">Checkup</option>
                </select>
              </div>

              {/* Search */}
              <div className="form-group full-width">
                <label>Qidiruv</label>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Xizmat nomini kiriting..."
                    style={{ paddingLeft: '40px', paddingRight: searchQuery ? '32px' : '12px' }}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1, padding: 0, width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  )}
                </div>
              </div>

              {/* Service List */}
              <div className="form-group full-width">
                <label>
                  Xizmatlar
                  {filteredServices && (
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400', marginLeft: '8px' }}>
                      ({filteredServices.length} ta, {alreadyLinkedIds.size} ta bog'langan)
                    </span>
                  )}
                </label>

                {isLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Yuklanmoqda...</div>
                ) : (
                  <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', maxHeight: 'none', overflowY: 'visible' }}>
                    {searchQuery.trim() ? (
                      // Search mode
                      filteredServices && filteredServices.length > 0 ? (
                        filteredServices.map((service) => <ServiceRow key={service.id} service={service} />)
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                          <div>"{searchQuery}" bo'yicha xizmat topilmadi</div>
                          <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', marginTop: '8px' }}>Qidiruvni tozalash</button>
                        </div>
                      )
                    ) : (
                      // Category mode
                      categories && categories.length > 0 ? (
                        categories.map((cat) => {
                          const catServices = servicesByCategory[cat.id] || [];
                          if (catServices.length === 0 && (!cat.children || cat.children.length === 0)) return null;
                          const isExpanded = expandedCategories.has(cat.id);

                          return (
                            <div key={cat.id}>
                              {/* Category Header */}
                              <div
                                onClick={() => toggleCategory(cat.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  background: '#f3f4f6',
                                  borderBottom: '1px solid #e5e7eb',
                                  fontWeight: 600,
                                  fontSize: '13px',
                                  color: '#374151',
                                }}
                              >
                                {isExpanded ? <ChevronDown size={16} style={{ marginRight: '6px', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ marginRight: '6px', flexShrink: 0 }} />}
                                <span style={{ flex: 1 }}>{cat.nameUz}</span>
                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '400' }}>{catServices.length} ta</span>
                              </div>

                              {/* Direct services */}
                              {isExpanded && catServices.map((service) => (
                                <ServiceRow key={service.id} service={service} indent={22} />
                              ))}

                              {/* Subcategories */}
                              {isExpanded && cat.children && cat.children.map((sub) => {
                                const subServices = servicesByCategory[sub.id] || [];
                                if (subServices.length === 0) return null;
                                return (
                                  <div key={sub.id}>
                                    <div style={{ padding: '7px 14px 7px 40px', fontSize: '12px', fontWeight: 600, color: '#4b5563', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                                      {sub.nameUz}
                                    </div>
                                    {subServices.map((service) => (
                                      <ServiceRow key={service.id} service={service} indent={40} />
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : (
                        // Flat fallback
                        filteredServices && filteredServices.length > 0 ? (
                          filteredServices.map((service) => <ServiceRow key={service.id} service={service} />)
                        ) : (
                          <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>Xizmatlar mavjud emas</div>
                        )
                      )
                    )}
                  </div>
                )}
                {errors.service && <span className="error-text">{errors.service}</span>}
              </div>

              {/* Required checkbox */}
              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
                  Majburiy maydon (klinika to'ldirishi shart)
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Bekor qilish</button>
            <button type="submit" className="btn-primary" disabled={linkMutation.isPending || selectedServices.size === 0}>
              {linkMutation.isPending ? 'Bog\'lanmoqda...' : `Bog'lash (${selectedServices.size})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
