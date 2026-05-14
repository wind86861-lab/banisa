import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import api from '../../shared/api/axios';
import CreateTemplateModal from '../components/CreateTemplateModal';
import EditTemplateModal from '../components/EditTemplateModal';
import LinkServiceModal from '../components/LinkServiceModal';
import './css/MetadataTemplates.css';

export default function MetadataTemplates() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [linkingTemplate, setLinkingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['admin', 'metadata-templates'],
    queryFn: async () => {
      const res = await api.get('/admin/metadata-templates');
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/metadata-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'metadata-templates'] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (linkId) => {
      await api.delete(`/admin/metadata-templates/links/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'metadata-templates'] });
    },
  });

  const handleDelete = (template) => {
    if (window.confirm(`"${template.labelUz}" ni o'chirmoqchimisiz?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleUnlink = (linkId, serviceName) => {
    if (window.confirm(`"${serviceName}" dan uzmoqchimisiz?`)) {
      unlinkMutation.mutate(linkId);
    }
  };

  if (isLoading) {
    return (
      <div className="metadata-page">
        <div className="loading-state">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metadata-page">
        <div className="error-state">
          <AlertCircle size={48} />
          <p>Xatolik yuz berdi: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metadata-page">
      <div className="page-header">
        <div>
          <h1>Metadata Templates</h1>
          <p className="page-subtitle">
            Xizmatlar uchun qo'shimcha ma'lumotlar shablonlarini boshqaring
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={18} /> Yangi Template
        </button>
      </div>

      {templates && templates.length === 0 ? (
        <div className="empty-state">
          <p>Hozircha template yo'q</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={18} /> Birinchi template yarating
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {templates?.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => handleDelete(template)}
              onLink={() => setLinkingTemplate(template)}
              onUnlink={handleUnlink}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'metadata-templates'] });
          }}
        />
      )}

      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            setEditingTemplate(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'metadata-templates'] });
          }}
        />
      )}

      {linkingTemplate && (
        <LinkServiceModal
          template={linkingTemplate}
          onClose={() => setLinkingTemplate(null)}
          onSuccess={() => {
            setLinkingTemplate(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'metadata-templates'] });
          }}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete, onLink, onUnlink }) {
  const getInputTypeLabel = (type) => {
    const labels = {
      NUMBER: 'Raqam',
      TEXT: 'Matn',
      SELECT: 'Tanlash',
      CHECKBOX: 'Belgilash',
      DATE: 'Sana',
      TEXTAREA: 'Ko\'p qatorli matn',
    };
    return labels[type] || type;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      MEDICAL_INFO: 'Tibbiy ma\'lumot',
      PREPARATION: 'Tayyorgarlik',
      RESTRICTION: 'Cheklov',
      ADDITIONAL_INFO: 'Qo\'shimcha',
    };
    return labels[category] || category;
  };

  return (
    <div className={`template-card ${!template.isActive ? 'inactive' : ''}`}>
      <div className="template-header">
        <div>
          <h3>{template.labelUz}</h3>
          <span className="template-key">{template.key}</span>
        </div>
        <div className="template-actions">
          <button onClick={onEdit} title="Tahrirlash">
            <Edit2 size={16} />
          </button>
          <button onClick={onDelete} className="btn-danger" title="O'chirish">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="template-info">
        <div className="info-row">
          <span className="label">Turi:</span>
          <span className="value">{getInputTypeLabel(template.inputType)}</span>
        </div>
        {template.unit && (
          <div className="info-row">
            <span className="label">Birlik:</span>
            <span className="value">{template.unit}</span>
          </div>
        )}
        <div className="info-row">
          <span className="label">Kategoriya:</span>
          <span className="value">{getCategoryLabel(template.category)}</span>
        </div>
        <div className="info-row">
          <span className="label">Bemor ko'radi:</span>
          <span className="value">{template.visibleToPatient ? '✓ Ha' : '✗ Yo\'q'}</span>
        </div>
        {template.validation && (
          <div className="info-row">
            <span className="label">Majburiy:</span>
            <span className="value">
              {template.validation.required ? '✓ Ha' : '✗ Yo\'q'}
            </span>
          </div>
        )}
      </div>

      <div className="template-services">
        <div className="services-header">
          <span>Bog'langan xizmatlar ({template._count?.serviceLinks || 0})</span>
          <button onClick={onLink} className="btn-link">
            <LinkIcon size={14} /> Bog'lash
          </button>
        </div>
        {template.serviceLinks && template.serviceLinks.length > 0 && (
          <div className="services-list">
            {template.serviceLinks.slice(0, 3).map((link) => (
              <ServiceLinkBadge
                key={link.id}
                link={link}
                onUnlink={onUnlink}
              />
            ))}
            {template.serviceLinks.length > 3 && (
              <span className="more-services">
                +{template.serviceLinks.length - 3} ko'proq
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceLinkBadge({ link, onUnlink }) {
  // This will be populated by the backend with service details
  const serviceName = link.serviceName || `Service ${link.serviceId.slice(0, 8)}`;

  return (
    <div className="service-link-badge">
      <span className="service-name">{serviceName}</span>
      {link.isRequired && <span className="required-badge">*</span>}
      <button
        onClick={() => onUnlink(link.id, serviceName)}
        className="unlink-btn"
        title="Uzish"
      >
        ×
      </button>
    </div>
  );
}
