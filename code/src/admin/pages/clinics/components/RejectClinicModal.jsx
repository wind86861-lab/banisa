import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, XCircle, Loader2 } from 'lucide-react';

const PRESET_REASONS = [
    "Hujjatlar to'liq emas",
    "Litsenziya muddati tugagan",
    "Berilgan ma'lumotlar noto'g'ri",
    "Talab qilinadigan standartlarga javob bermaydi",
    "Duplikat ariza",
];

const RejectClinicModal = ({ open, clinicName, onConfirm, onClose, loading }) => {
    const [reason, setReason] = useState('');

    const handleClose = () => {
        setReason('');
        onClose();
    };

    const handleConfirm = () => {
        if (!reason.trim()) return;
        onConfirm(reason.trim());
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="modal-overlay" onClick={handleClose}>
                    <motion.div
                        className="form-modal"
                        style={{ maxWidth: 480 }}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="form-modal-header">
                            <h2 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <XCircle size={20} /> Arizani rad etish
                            </h2>
                            <button className="btn-close" onClick={handleClose}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '20px 24px' }}>
                            {clinicName && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: 10,
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    marginBottom: 16, fontSize: 14, fontWeight: 600, color: '#dc2626'
                                }}>
                                    🏥 {clinicName}
                                </div>
                            )}

                            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                                Rad etish sababini tanlang yoki o'zingiz kiriting:
                            </p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                                {PRESET_REASONS.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setReason(r)}
                                        style={{
                                            padding: '6px 12px', borderRadius: 20, fontSize: 12,
                                            border: `1.5px solid ${reason === r ? '#ef4444' : '#e5e7eb'}`,
                                            background: reason === r ? '#fef2f2' : 'white',
                                            color: reason === r ? '#dc2626' : '#374151',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="form-textarea"
                                rows={3}
                                placeholder="Rad etish sababini kiriting..."
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleClose}
                                style={{
                                    padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb',
                                    background: 'white', color: '#374151', cursor: 'pointer', fontSize: 14,
                                }}
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!reason.trim() || loading}
                                style={{
                                    padding: '10px 20px', borderRadius: 10, border: 'none',
                                    background: reason.trim() && !loading ? '#ef4444' : '#fca5a5',
                                    color: 'white', cursor: reason.trim() && !loading ? 'pointer' : 'not-allowed',
                                    fontSize: 14, fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}
                            >
                                {loading ? <><Loader2 size={15} className="spin" /> Yuborilmoqda...</> : <><XCircle size={15} /> Rad Etish</>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RejectClinicModal;
//   qwerty!Q@1 +998 12 345-67-84