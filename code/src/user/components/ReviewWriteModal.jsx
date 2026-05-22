import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, X, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../shared/api/axios';
import './ReviewWriteModal.css';

export default function ReviewWriteModal({ clinicId, clinicName, onClose, onSuccess }) {
    const qc = useQueryClient();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [success, setSuccess] = useState(false);

    const mut = useMutation({
        mutationFn: async () => {
            const res = await api.post('/user/reviews', {
                clinicId,
                rating,
                comment: comment.trim() || undefined,
            });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['user', 'reviews'] });
            qc.invalidateQueries({ queryKey: ['appointment'] });
            setSuccess(true);
            setTimeout(() => { onSuccess?.(); onClose?.(); }, 1600);
        },
    });

    const stars = [1, 2, 3, 4, 5];
    const submit = () => {
        if (rating < 1) return;
        mut.mutate();
    };
    const errMsg = mut.error?.response?.data?.error?.message || mut.error?.response?.data?.message;

    return (
        <div className="rw-overlay" onClick={onClose}>
            <div className="rw-modal" onClick={(e) => e.stopPropagation()}>
                <button className="rw-close" onClick={onClose}><X size={18} /></button>

                {success ? (
                    <div className="rw-done">
                        <CheckCircle2 size={48} className="rw-done-icon" />
                        <h3>Sharh qoldirildi</h3>
                        <p>Fikringiz uchun rahmat!</p>
                    </div>
                ) : (
                    <>
                        <h3>Klinikani baholang</h3>
                        <p className="rw-sub">{clinicName}</p>

                        <div className="rw-stars">
                            {stars.map(n => {
                                const active = (hover || rating) >= n;
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setRating(n)}
                                        onMouseEnter={() => setHover(n)}
                                        onMouseLeave={() => setHover(0)}
                                        className={`rw-star${active ? ' active' : ''}`}
                                        aria-label={`${n} yulduz`}
                                    >
                                        <Star size={32} fill={active ? '#facc15' : 'none'} />
                                    </button>
                                );
                            })}
                        </div>
                        {rating > 0 && (
                            <div className="rw-rating-label">
                                {['Yomon', 'Qoniqarsiz', "O'rtacha", 'Yaxshi', "Zo'r"][rating - 1]}
                            </div>
                        )}

                        <textarea
                            className="rw-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tajribangiz haqida fikr qoldiring (ixtiyoriy)"
                            maxLength={1000}
                            rows={4}
                        />
                        <div className="rw-char-count">{comment.length}/1000</div>

                        {errMsg && <div className="rw-err">{errMsg}</div>}

                        <div className="rw-actions">
                            <button className="rw-cancel" onClick={onClose}>Bekor qilish</button>
                            <button
                                className="rw-submit"
                                disabled={rating < 1 || mut.isPending}
                                onClick={submit}
                            >
                                {mut.isPending ? <Loader2 size={16} className="rw-spin" /> : null}
                                Yuborish
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
