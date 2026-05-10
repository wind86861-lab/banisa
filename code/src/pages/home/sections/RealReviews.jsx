import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RealReviews({ reviews = [] }) {
    const navigate = useNavigate();

    if (!reviews.length) return null;

    return (
        <section className="hn-section" style={{ background: 'linear-gradient(180deg, #fff, #f8fbff)' }}>
            <div className="hn-container">
                <div className="hn-section-head" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 className="hn-section-title">Foydalanuvchilar fikri</h2>
                    <p className="hn-section-sub">Haqiqiy bemorlardan haqiqiy sharhlar</p>
                </div>

                <div className="hn-reviews-grid">
                    {reviews.slice(0, 6).map((r) => {
                        const initial = (r.user?.name || 'B').charAt(0).toUpperCase();
                        const filled = Math.round(r.rating || 0);
                        return (
                            <div key={r.id} className="hn-review-card">
                                <div className="hn-review-stars">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <Star
                                            key={n}
                                            size={15}
                                            fill={n <= filled ? '#f59e0b' : '#e2e8f0'}
                                            color={n <= filled ? '#f59e0b' : '#e2e8f0'}
                                            style={{ verticalAlign: '-2px' }}
                                        />
                                    ))}
                                </div>
                                <p className="hn-review-text">"{r.comment}"</p>
                                <div className="hn-review-foot">
                                    <div className="hn-review-avatar">{initial}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="hn-review-author">{r.user?.name || 'Bemor'}</div>
                                        {r.clinic && (
                                            <button
                                                className="hn-review-clinic"
                                                onClick={() => navigate(`/klinikalar/${r.clinic.id}`)}
                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                                            >
                                                {r.clinic.nameUz}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
