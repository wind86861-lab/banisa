import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Trash2, Ban, Phone, Mail, MapPin, Star, FileText, ShieldCheck } from 'lucide-react';
import StatusChip, { SourceBadge } from './StatusChip';

const ClinicDetailsModal = ({
    clinic,
    onClose,
    onEdit,
    onDelete,
    onToggleBlock,
}) => {
    if (!clinic) return null;

    const phones = Array.isArray(clinic.phones) ? clinic.phones : [];
    const emails = Array.isArray(clinic.emails) ? clinic.emails : [];

    return (
        <AnimatePresence>
            {clinic && (
                <>
                    <motion.div
                        className="drawer-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="service-drawer"
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    >
                        <div className="drawer-header">
                            <h2>{clinic.nameUz}</h2>
                            <button className="btn-close" onClick={onClose}><X size={24} /></button>
                        </div>

                        <div className="drawer-body">
                            <div className="badge-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                <StatusChip status={clinic.status} size="lg" />
                                <SourceBadge source={clinic.source} />
                                {clinic.type && (
                                    <span className="cat-badge-lg">{clinic.type}</span>
                                )}
                            </div>

                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Viloyat</label>
                                    <span>{clinic.region || '—'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Tuman</label>
                                    <span>{clinic.district || '—'}</span>
                                </div>
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <label>Manzil</label>
                                    <span>{clinic.street || '—'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Reyting</label>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                                        {clinic.averageRating?.toFixed(1) ?? '0.0'}
                                        <small style={{ color: '#9ca3af' }}>({clinic.reviewCount ?? 0} sharh)</small>
                                    </span>
                                </div>
                                <div className="info-item">
                                    <label>Qo'shilgan</label>
                                    <span>{new Date(clinic.createdAt).toLocaleDateString('uz-UZ')}</span>
                                </div>
                            </div>

                            {(phones.length > 0 || emails.length > 0) && (
                                <div className="detail-section">
                                    <h4>Aloqa</h4>
                                    <div className="contact-list">
                                        {phones.map((p, i) => (
                                            <div key={i} className="contact-item">
                                                <Phone size={15} /> {p}
                                            </div>
                                        ))}
                                        {emails.map((e, i) => (
                                            <div key={i} className="contact-item">
                                                <Mail size={15} /> {e}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {clinic.description && (
                                <div className="detail-section">
                                    <h4>Tavsif</h4>
                                    <p className="desc-text">{clinic.description}</p>
                                </div>
                            )}

                            {(clinic.adminFirstName || clinic.adminEmail) && (
                                <div className="detail-section">
                                    <h4>Admin</h4>
                                    <div className="contact-list">
                                        {(clinic.adminFirstName || clinic.adminLastName) && (
                                            <div className="contact-item">
                                                👤 {clinic.adminFirstName} {clinic.adminLastName}
                                            </div>
                                        )}
                                        {clinic.adminEmail && (
                                            <div className="contact-item"><Mail size={15} /> {clinic.adminEmail}</div>
                                        )}
                                        {clinic.adminPhone && (
                                            <div className="contact-item"><Phone size={15} /> {clinic.adminPhone}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(clinic.licenseNumber || clinic.taxId) && (
                                <div className="detail-section">
                                    <h4>Hujjatlar</h4>
                                    <div className="contact-list">
                                        {clinic.licenseNumber && (
                                            <div className="contact-item"><FileText size={15} /> Litsenziya: {clinic.licenseNumber}</div>
                                        )}
                                        {clinic.taxId && (
                                            <div className="contact-item"><ShieldCheck size={15} /> INN: {clinic.taxId}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {clinic.rejectionReason && (
                                <div style={{
                                    padding: '12px 14px', borderRadius: 10,
                                    background: '#fef2f2', border: '1px solid #fecaca', marginTop: 12
                                }}>
                                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13, marginBottom: 4 }}>
                                        ❌ Rad etish sababi
                                    </div>
                                    <div style={{ fontSize: 14, color: '#7f1d1d' }}>{clinic.rejectionReason}</div>
                                </div>
                            )}
                        </div>

                        <div className="drawer-footer">
                            <button className="btn-edit-full" onClick={() => { onEdit(clinic); onClose(); }}>
                                <Edit3 size={18} /> Tahrirlash
                            </button>
                            {(clinic.status === 'APPROVED' || clinic.status === 'BLOCKED') && (
                                <button
                                    className="btn-edit-full"
                                    style={{
                                        background: clinic.status === 'BLOCKED' ? '#10b981' : '#f59e0b',
                                        color: '#fff', border: 'none'
                                    }}
                                    onClick={() => onToggleBlock(clinic)}
                                >
                                    <Ban size={18} />
                                    {clinic.status === 'BLOCKED' ? 'Faollashtirish' : 'Bloklash'}
                                </button>
                            )}
                            <button className="btn-delete" onClick={() => { onDelete(clinic.id); onClose(); }}>
                                <Trash2 size={18} /> O'chirish
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ClinicDetailsModal;
