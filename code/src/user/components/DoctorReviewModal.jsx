import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Star, Loader2, CheckCircle2, AlertTriangle, Sparkles,
} from 'lucide-react';
import api from '../../shared/api/axios';
import './doctor-review-modal.css';

const RATING_LABELS = {
    1: 'Yomon',
    2: 'O\'rtacha',
    3: 'Yaxshi',
    4: 'Juda yaxshi',
    5: 'Ajoyib',
};

export default function DoctorReviewModal({ appointmentId, open, onClose }) {
    const qc = useQueryClient();
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState('');

    const { data: eligibility, isLoading: checkingEligibility } = useQuery({
        queryKey: ['user', 'doctor-review-eligibility', appointmentId],
        queryFn: async () => (await api.get('/user/doctor-reviews/eligibility', {
            params: { appointmentId },
        })).data?.data,
        enabled: open && !!appointmentId,
    });

    const submit = useMutation({
        mutationFn: async () => (await api.post('/user/doctor-reviews', {
            appointmentId,
            rating,
            comment: comment.trim() || null,
        })).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['user', 'doctor-review-eligibility', appointmentId] });
            qc.invalidateQueries({ queryKey: ['public', 'doctor'] });
            qc.invalidateQueries({ queryKey: ['public', 'doctors'] });
            setTimeout(onClose, 1200);
        },
    });

    if (!open) return null;

    const display = hovered || rating;
    const doctor = eligibility?.doctor;

    return (
        <AnimatePresence>
            <motion.div
                className="drm-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="drm-card"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ y: 16, scale: 0.97, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 16, scale: 0.97, opacity: 0 }}
                >
                    <button className="drm-close" onClick={onClose}><X size={18} /></button>

                    {checkingEligibility ? (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <Loader2 size={24} className="drm-spin" color="#06b6d4" />
                        </div>
                    ) : !eligibility?.canReview ? (
                        <div className="drm-empty">
                            <AlertTriangle size={32} color="#94a3b8" />
                            <h3>Baho qoldira olmaysiz</h3>
                            <p>
                                {eligibility?.reason === 'already-reviewed'
                                    ? "Siz allaqachon baho qoldirgansiz"
                                    : eligibility?.reason === 'not-completed'
                                        ? "Faqat tugagan ko'rikdan keyin baho qoldira olasiz"
                                        : eligibility?.reason === 'no-doctor'
                                            ? "Bu bronga doktor biriktirilmagan"
                                            : "Baho qoldirib bo'lmaydi"}
                            </p>
                        </div>
                    ) : submit.isSuccess ? (
                        <div className="drm-success">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                            >
                                <CheckCircle2 size={56} color="#10b981" />
                            </motion.div>
                            <h3>Rahmat!</h3>
                            <p>Sizning fikringiz boshqalarga yordam beradi</p>
                        </div>
                    ) : (
                        <>
                            <div className="drm-head">
                                <div className="drm-icon">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <div className="drm-title">Doktorga baho</div>
                                    {doctor && (
                                        <div className="drm-subtitle">
                                            {doctor.firstName} {doctor.lastName}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="drm-stars">
                                {[1, 2, 3, 4, 5].map((v) => (
                                    <button
                                        key={v}
                                        className="drm-star-btn"
                                        onMouseEnter={() => setHovered(v)}
                                        onMouseLeave={() => setHovered(0)}
                                        onClick={() => setRating(v)}
                                        type="button"
                                    >
                                        <Star
                                            size={32}
                                            fill={v <= display ? '#fbbf24' : 'none'}
                                            color={v <= display ? '#fbbf24' : '#cbd5e1'}
                                        />
                                    </button>
                                ))}
                            </div>

                            <div className="drm-rating-label">
                                {display ? RATING_LABELS[display] : 'Bahoni tanlang'}
                            </div>

                            <div className="drm-field">
                                <label>Izoh (ixtiyoriy)</label>
                                <textarea
                                    rows={4}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Doktor haqida fikrlaringiz, tavsiyalaringiz..."
                                    maxLength={1000}
                                />
                                <div className="drm-counter">{comment.length}/1000</div>
                            </div>

                            {submit.isError && (
                                <div className="drm-error">
                                    <AlertTriangle size={14} />
                                    {submit.error?.response?.data?.message || "Yuborishda xato"}
                                </div>
                            )}

                            <div className="drm-foot">
                                <button className="drm-btn" onClick={onClose}>Bekor</button>
                                <button
                                    className="drm-btn drm-btn--primary"
                                    onClick={() => submit.mutate()}
                                    disabled={rating < 1 || submit.isPending}
                                >
                                    {submit.isPending ? <Loader2 size={14} className="drm-spin" /> : <Star size={14} />}
                                    Yuborish
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
