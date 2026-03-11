import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, Clock, MapPin, Phone, Mail, FileText, Loader2 } from 'lucide-react';
import StatusChip from './StatusChip';

const Field = ({ label, value }) => (
    <div className="reg-detail-item">
        <div className="reg-detail-label">{label}</div>
        <div className="reg-detail-value">{value || '—'}</div>
    </div>
);

const ReviewClinicModal = ({
    open,
    clinic,
    onClose,
    onApprove,
    onReject,
    approving,
    rejecting,
}) => {
    if (!clinic) return null;
    const isPending = clinic.status === 'PENDING' || clinic.status === 'IN_REVIEW';

    return (
        <AnimatePresence>
            {open && (
                <div className="modal-overlay" onClick={onClose}>
                    <motion.div
                        className="form-modal"
                        style={{ maxWidth: 700, maxHeight: '88vh', overflowY: 'auto' }}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="form-modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                🏥 {clinic.nameUz}
                                <StatusChip status={clinic.status} />
                            </h2>
                            <button className="btn-close" onClick={onClose}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '0 24px 20px' }}>
                            {clinic.rejectionReason && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: 10,
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    marginBottom: 16
                                }}>
                                    <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4, fontSize: 13 }}>
                                        ❌ Rad etish sababi:
                                    </div>
                                    <div style={{ color: '#7f1d1d', fontSize: 14 }}>{clinic.rejectionReason}</div>
                                </div>
                            )}

                            <div className="reg-detail-grid">
                                <Field label="Klinika nomi (UZ)" value={clinic.nameUz} />
                                <Field label="Klinika nomi (RU)" value={clinic.nameRu} />
                                <Field label="Tur" value={clinic.type} />
                                <Field label="Viloyat" value={clinic.region} />
                                <Field label="Tuman" value={clinic.district} />
                                <Field label="Ko'cha" value={clinic.street} />
                                <Field label="Admin ismi" value={`${clinic.adminLastName ?? ''} ${clinic.adminFirstName ?? ''}`.trim()} />
                                <Field label="Admin email" value={clinic.adminEmail} />
                                <Field label="Admin telefon" value={clinic.adminPhone} />
                                <Field label="Telefon(lar)" value={Array.isArray(clinic.phones) ? clinic.phones.join(', ') : clinic.phones} />
                                <Field label="Email(lar)" value={Array.isArray(clinic.emails) ? clinic.emails.join(', ') : clinic.emails} />
                                <Field label="Veb-sayt" value={clinic.website} />
                                <Field label="STIR (INN)" value={clinic.taxId} />
                                <Field label="Litsenziya raqami" value={clinic.licenseNumber} />
                                <Field label="Yuborilgan sana" value={clinic.submittedAt ? new Date(clinic.submittedAt).toLocaleDateString('uz-UZ') : null} />
                                {clinic.description && (
                                    <Field label="Tavsif" value={clinic.description} />
                                )}
                            </div>
                        </div>

                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid #e5e7eb',
                            display: 'flex', gap: 10, justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb',
                                    background: 'white', color: '#374151', cursor: 'pointer', fontSize: 14,
                                }}
                            >
                                Yopish
                            </button>
                            {isPending && (
                                <>
                                    <button
                                        onClick={onReject}
                                        disabled={rejecting}
                                        style={{
                                            padding: '10px 20px', borderRadius: 10, border: '1px solid #ef4444',
                                            background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
                                            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                        }}
                                    >
                                        {rejecting ? <Loader2 size={15} className="spin" /> : <XCircle size={15} />}
                                        Rad etish
                                    </button>
                                    <button
                                        onClick={onApprove}
                                        disabled={approving}
                                        style={{
                                            padding: '10px 20px', borderRadius: 10, border: 'none',
                                            background: approving ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #059669)',
                                            color: 'white', cursor: approving ? 'not-allowed' : 'pointer',
                                            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                        }}
                                    >
                                        {approving ? <><Loader2 size={15} className="spin" /> Tasdiqlanmoqda...</> : <><CheckCircle2 size={15} /> Tasdiqlash</>}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReviewClinicModal;
