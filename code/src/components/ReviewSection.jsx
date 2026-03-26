import { useState } from 'react';
import { Star, ThumbsUp, MessageSquare, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useServiceReviews, useMyReview, useSubmitReview } from '../hooks/useReviews';
import { useAuth } from '../hooks/useAuth';
import './ReviewSection.css';

function StarRating({ rating, onRate, readonly = false }) {
    const [hover, setHover] = useState(0);

    return (
        <div className="rs-stars">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={readonly ? 16 : 24}
                    className={`rs-star ${star <= (hover || rating) ? 'filled' : ''} ${readonly ? 'readonly' : ''}`}
                    onMouseEnter={() => !readonly && setHover(star)}
                    onMouseLeave={() => !readonly && setHover(0)}
                    onClick={() => !readonly && onRate && onRate(star)}
                    fill={star <= (hover || rating) ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );
}

function RatingDistribution({ stats }) {
    if (!stats || stats.totalReviews === 0) return null;

    const { ratingDistribution, totalReviews } = stats;

    return (
        <div className="rs-distribution">
            {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating] || 0;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                return (
                    <div key={rating} className="rs-dist-row">
                        <span className="rs-dist-label">{rating} <Star size={12} /></span>
                        <div className="rs-dist-bar">
                            <div className="rs-dist-fill" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="rs-dist-count">{count}</span>
                    </div>
                );
            })}
        </div>
    );
}

function ReviewCard({ review }) {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getUserName = () => {
        if (review.user?.firstName && review.user?.lastName) {
            return `${review.user.firstName} ${review.user.lastName}`;
        }
        if (review.user?.firstName) {
            return review.user.firstName;
        }
        return 'Foydalanuvchi';
    };

    return (
        <div className="rs-review-card">
            <div className="rs-review-header">
                <div className="rs-review-avatar">
                    {getUserName().charAt(0).toUpperCase()}
                </div>
                <div className="rs-review-meta">
                    <h4 className="rs-review-name">{getUserName()}</h4>
                    <div className="rs-review-rating">
                        <StarRating rating={review.rating} readonly />
                        <span className="rs-review-date">{formatDate(review.createdAt)}</span>
                    </div>
                </div>
            </div>
            {review.comment && (
                <p className="rs-review-comment">{review.comment}</p>
            )}
        </div>
    );
}

function ReviewForm({ serviceId, serviceType, onSuccess }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [showForm, setShowForm] = useState(false);
    const submitReview = useSubmitReview();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (rating === 0) {
            alert('Iltimos, baho bering');
            return;
        }

        try {
            await submitReview.mutateAsync({
                serviceId,
                serviceType,
                rating,
                comment: comment.trim() || undefined,
            });
            
            setRating(0);
            setComment('');
            setShowForm(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Sharh yuborishda xatolik yuz berdi';
            alert(errorMsg);
        }
    };

    if (!showForm) {
        return (
            <button className="rs-write-btn" onClick={() => setShowForm(true)}>
                <MessageSquare size={18} />
                Sharh qoldirish
            </button>
        );
    }

    return (
        <form className="rs-form" onSubmit={handleSubmit}>
            <h3 className="rs-form-title">Sharh qoldiring</h3>
            
            <div className="rs-form-group">
                <label className="rs-form-label">Baho *</label>
                <StarRating rating={rating} onRate={setRating} />
            </div>

            <div className="rs-form-group">
                <label className="rs-form-label">Izoh (ixtiyoriy)</label>
                <textarea
                    className="rs-form-textarea"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Xizmat haqida fikringizni yozing..."
                    rows={4}
                    minLength={10}
                    maxLength={1000}
                />
                {comment.length > 0 && (
                    <span className="rs-form-hint">{comment.length} / 1000</span>
                )}
            </div>

            <div className="rs-form-actions">
                <button
                    type="button"
                    className="rs-btn-secondary"
                    onClick={() => {
                        setShowForm(false);
                        setRating(0);
                        setComment('');
                    }}
                    disabled={submitReview.isPending}
                >
                    Bekor qilish
                </button>
                <button
                    type="submit"
                    className="rs-btn-primary"
                    disabled={submitReview.isPending || rating === 0}
                >
                    {submitReview.isPending ? (
                        <>
                            <Loader2 size={18} className="rs-spinner" />
                            Yuborilmoqda...
                        </>
                    ) : (
                        'Yuborish'
                    )}
                </button>
            </div>
        </form>
    );
}

export default function ReviewSection({ serviceId, serviceType }) {
    const { user } = useAuth();
    const { data: reviewsData, isLoading } = useServiceReviews(serviceId, serviceType);
    const { data: myReview } = useMyReview(serviceId, serviceType);

    if (isLoading) {
        return (
            <section className="rs-section">
                <div className="rs-container">
                    <div className="rs-loading">
                        <Loader2 size={32} className="rs-spinner" />
                        <p>Sharhlar yuklanmoqda...</p>
                    </div>
                </div>
            </section>
        );
    }

    const { reviews = [], stats = {} } = reviewsData || {};
    const { totalReviews = 0, averageRating = 0 } = stats;

    return (
        <section className="rs-section">
            <div className="rs-container">
                <div className="rs-header">
                    <h2 className="rs-title">
                        <Star size={28} />
                        Sharhlar va Baholash
                    </h2>
                </div>

                {/* Overall Rating Summary */}
                <div className="rs-summary">
                    <div className="rs-summary-left">
                        <div className="rs-avg-rating">{averageRating.toFixed(1)}</div>
                        <StarRating rating={Math.round(averageRating)} readonly />
                        <p className="rs-total-reviews">{totalReviews} ta sharh</p>
                    </div>
                    <div className="rs-summary-right">
                        <RatingDistribution stats={stats} />
                    </div>
                </div>

                {/* User's Review Status or Form */}
                {user ? (
                    <div className="rs-user-section">
                        {myReview ? (
                            <div className="rs-user-review-status">
                                {myReview.status === 'PENDING' && (
                                    <div className="rs-alert rs-alert-info">
                                        <AlertCircle size={20} />
                                        <div>
                                            <strong>Sharhingiz ko'rib chiqilmoqda</strong>
                                            <p>Moderatsiyadan o'tgandan keyin sharhingiz ko'rsatiladi.</p>
                                        </div>
                                    </div>
                                )}
                                {myReview.status === 'APPROVED' && (
                                    <div className="rs-alert rs-alert-success">
                                        <CheckCircle size={20} />
                                        <div>
                                            <strong>Sharhingiz tasdiqlandi</strong>
                                            <p>Rahmat! Sizning sharhingiz quyida ko'rsatilgan.</p>
                                        </div>
                                    </div>
                                )}
                                {myReview.status === 'REJECTED' && (
                                    <div className="rs-alert rs-alert-warning">
                                        <AlertCircle size={20} />
                                        <div>
                                            <strong>Sharhingiz rad etildi</strong>
                                            {myReview.rejectionReason && <p>{myReview.rejectionReason}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ReviewForm serviceId={serviceId} serviceType={serviceType} />
                        )}
                    </div>
                ) : (
                    <div className="rs-login-prompt">
                        <AlertCircle size={20} />
                        <p>Sharh qoldirish uchun <a href="/login">tizimga kiring</a></p>
                    </div>
                )}

                {/* Reviews List */}
                {reviews.length > 0 ? (
                    <div className="rs-reviews-list">
                        <h3 className="rs-reviews-title">
                            <ThumbsUp size={20} />
                            Foydalanuvchi sharhlari ({reviews.length})
                        </h3>
                        <div className="rs-reviews-grid">
                            {reviews.map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="rs-no-reviews">
                        <MessageSquare size={48} />
                        <h3>Hali sharhlar yo'q</h3>
                        <p>Birinchi bo'lib sharh qoldiring!</p>
                    </div>
                )}
            </div>
        </section>
    );
}
