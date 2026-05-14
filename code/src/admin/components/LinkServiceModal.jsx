import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, AlertCircle, Search, ChevronRight, ChevronDown } from 'lucide-react';
import api from '../../shared/api/axios';
import './css/MetadataModals.css';

export default function LinkServiceModal({ template, onClose, onSuccess }) {
  const [serviceType, setServiceType] = useState('DIAGNOSTIC');
  const [selectedService, setSelectedService] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Fetch categories for the selected service type
  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['admin', 'categories', serviceType],
    queryFn: async () => {
      const res = await api.get('/categories');
      const allCats = res.data.data || [];
      // Filter categories relevant to service type
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

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const selectedServiceName = services?.find(s => s.id === selectedService)?.nameUz || '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
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
              {/* Service Type */}
              <div className="form-group full-width">
                <label>Xizmat turi</label>
                <select
                  value={serviceType}
                  onChange={(e) => {
                    setServiceType(e.target.value);
                    setSelectedService('');
                    setSelectedCategory('');
                    setSelectedSubcategory('');
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

              {/* Selected Service Badge */}
              {selectedService && (
                <div className="form-group full-width">
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Tanlangan xizmat</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>{selectedServiceName}</div>
                    </div>
                    <button type="button" onClick={() => setSelectedService('')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>O'chirish</button>
                  </div>
                </div>
              )}

              {/* Service List with Categories */}
              <div className="form-group full-width">
                <label>
                  Xizmat <span className="required">*</span>
                  {filteredServices && (
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400', marginLeft: '8px' }}>
                      ({filteredServices.length} ta)
                    </span>
                  )}
                </label>

                {isLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Yuklanmoqda...</div>
                ) : (
                  <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '8px' }}>
                    {searchQuery.trim() ? (
                      // Search mode - flat list
                      filteredServices && filteredServices.length > 0 ? (
                        filteredServices.map((service) => {
                          const isSelected = selectedService === service.id;
                          return (
                            <div key={service.id} onClick={() => setSelectedService(service.id)} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', background: isSelected ? '#eff6ff' : 'white' }}>
                              <input type="radio" name="service" value={service.id} checked={isSelected} onChange={(e) => setSelectedService(e.target.value)} style={{ marginRight: '10px', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: isSelected ? '600' : '400', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.nameUz}</div>
                                {service.priceRecommended && <div style={{ fontSize: '11px', color: '#6b7280' }}>{service.priceRecommended.toLocaleString()} so'm</div>}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                          <div>"{searchQuery}" bo'yicha xizmat topilmadi</div>
                          <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', marginTop: '8px' }}>Qidiruvni tozalash</button>
                        </div>
                      )
                    ) : (
                      // Category mode - hierarchical
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
                                  userSelect: 'none',
                                }}
                              >
                                {isExpanded ? <ChevronDown size={16} style={{ marginRight: '6px', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ marginRight: '6px', flexShrink: 0 }} />}
                                <span style={{ flex: 1 }}>{cat.nameUz}</span>
                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '400' }}>{catServices.length} ta</span>
                              </div>

                              {/* Services under this category */}
                              {isExpanded && catServices.map((service) => {
                                const isSelected = selectedService === service.id;
                                return (
                                  <div key={service.id} onClick={() => setSelectedService(service.id)} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px 9px 36px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', background: isSelected ? '#eff6ff' : 'white' }}>
                                    <input type="radio" name="service" value={service.id} checked={isSelected} onChange={(e) => setSelectedService(e.target.value)} style={{ marginRight: '10px', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '14px', fontWeight: isSelected ? '600' : '400', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.nameUz}</div>
                                      {service.priceRecommended && <div style={{ fontSize: '11px', color: '#6b7280' }}>{service.priceRecommended.toLocaleString()} so'm</div>}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Subcategories */}
                              {isExpanded && cat.children && cat.children.map((sub) => {
                                const subServices = servicesByCategory[sub.id] || [];
                                if (subServices.length === 0) return null;
                                return (
                                  <div key={sub.id}>
                                    <div style={{ padding: '7px 14px 7px 40px', fontSize: '12px', fontWeight: 600, color: '#4b5563', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                                      {sub.icon} {sub.nameUz}
                                    </div>
                                    {subServices.map((service) => {
                                      const isSelected = selectedService === service.id;
                                      return (
                                        <div key={service.id} onClick={() => setSelectedService(service.id)} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px 9px 56px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', background: isSelected ? '#eff6ff' : 'white' }}>
                                          <input type="radio" name="service" value={service.id} checked={isSelected} onChange={(e) => setSelectedService(e.target.value)} style={{ marginRight: '10px', flexShrink: 0 }} />
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '14px', fontWeight: isSelected ? '600' : '400', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.nameUz}</div>
                                            {service.priceRecommended && <div style={{ fontSize: '11px', color: '#6b7280' }}>{service.priceRecommended.toLocaleString()} so'm</div>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : (
                        // Flat fallback when no categories
                        filteredServices && filteredServices.length > 0 ? (
                          filteredServices.map((service) => {
                            const isSelected = selectedService === service.id;
                            return (
                              <div key={service.id} onClick={() => setSelectedService(service.id)} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', background: isSelected ? '#eff6ff' : 'white' }}>
                                <input type="radio" name="service" value={service.id} checked={isSelected} onChange={(e) => setSelectedService(e.target.value)} style={{ marginRight: '10px', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '14px', fontWeight: isSelected ? '600' : '400', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.nameUz}</div>
                                  {service.priceRecommended && <div style={{ fontSize: '11px', color: '#6b7280' }}>{service.priceRecommended.toLocaleString()} so'm</div>}
                                </div>
                              </div>
                            );
                          })
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
            <button type="submit" className="btn-primary" disabled={linkMutation.isPending || !selectedService}>
              {linkMutation.isPending ? 'Bog\'lanmoqda...' : 'Bog\'lash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
