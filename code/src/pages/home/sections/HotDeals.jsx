import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ShoppingCart, Check, Star, ArrowRight, Stethoscope } from 'lucide-react';
import { useCart } from '../../../contexts/CartContext';
import { useUserAuth } from '../../../shared/auth/UserAuthContext';

const fmt = (n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');

export default function HotDeals({ deals = [] }) {
    const navigate = useNavigate();
    const { user } = useUserAuth();
    const { addToCart } = useCart() || {};
    const [feedback, setFeedback] = useState({});

    if (!deals.length) return null;

    const handleAdd = async (e, deal) => {
        e.stopPropagation();
        if (!user) {
            navigate(`/user/login?redirect=/`);
            return;
        }
        if (!deal.clinic) return;
        const result = await addToCart?.(deal.clinic.id, deal.type, deal.id, 1);
        setFeedback((p) => ({ ...p, [deal.id]: result?.success ? 'added' : 'error' }));
        setTimeout(() => setFeedback((p) => { const n = { ...p }; delete n[deal.id]; return n; }), 2000);
    };

    return (
        <section className="hn-section" style={{ background: 'linear-gradient(180deg, #fff, #fff7ed 100%)' }}>
            <div className="hn-container">
                <div className="hn-section-head">
                    <div>
                        <h2 className="hn-section-title">
                            <Flame size={28} style={{ verticalAlign: '-4px', color: '#f97316' }} /> Aksiyalar va chegirmalar
                        </h2>
                        <p className="hn-section-sub">Eng yaxshi takliflar — bugun chegirma bilan</p>
                    </div>
                    <a className="hn-link-all" onClick={() => navigate('/xizmatlar?discount=true')} style={{ cursor: 'pointer' }}>
                        Hammasi <ArrowRight size={14} />
                    </a>
                </div>

                <div className="hn-deals-grid">
                    {deals.slice(0, 6).map((deal) => {
                        const fb = feedback[deal.id];
                        return (
                            <div
                                key={deal.id}
                                className="hn-svc-card"
                                onClick={() => navigate(`/xizmatlar/${deal.id}`)}
                            >
                                <div className="hn-svc-image">
                                    {deal.image ? (
                                        <img src={deal.image.startsWith('/') ? `https://banisa.uz${deal.image}` : deal.image} alt={deal.nameUz} />
                                    ) : (
                                        <div className="hn-svc-image-placeholder"><Stethoscope size={56} /></div>
                                    )}
                                    {deal.discountPercent > 0 && (
                                        <div className="hn-svc-discount-badge">-{deal.discountPercent}%</div>
                                    )}
                                </div>
                                <div className="hn-svc-body">
                                    <div className="hn-svc-cat-line">{deal.category || 'Diagnostika'}</div>
                                    <h3 className="hn-svc-name">{deal.nameUz}</h3>
                                    {deal.clinic && (
                                        <div className="hn-svc-clinic">
                                            <div className="hn-svc-clinic-logo">
                                                {deal.clinic.logo ? (
                                                    <img src={deal.clinic.logo.startsWith('/') ? `https://banisa.uz${deal.clinic.logo}` : deal.clinic.logo} alt="" />
                                                ) : <span style={{ fontSize: 12 }}>🏥</span>}
                                            </div>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {deal.clinic.nameUz}
                                            </span>
                                            {deal.clinic.rating > 0 && (
                                                <span className="hn-svc-rating">
                                                    <Star size={12} fill="#f59e0b" /> {Number(deal.clinic.rating).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="hn-svc-prices">
                                        {deal.originalPrice > deal.price && (
                                            <span className="hn-svc-price-old">{fmt(deal.originalPrice)} so'm</span>
                                        )}
                                        <span className="hn-svc-price-now">{fmt(deal.price)} so'm</span>
                                    </div>
                                </div>
                                <div className="hn-svc-actions">
                                    <button
                                        className={`hn-svc-cart-btn ${fb === 'added' ? 'success' : ''}`}
                                        title="Savatga"
                                        onClick={(e) => handleAdd(e, deal)}
                                    >
                                        {fb === 'added' ? <Check size={16} /> : <ShoppingCart size={16} />}
                                    </button>
                                    <button
                                        className="hn-svc-book-btn"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/xizmatlar/${deal.id}`); }}
                                    >
                                        Bron qilish
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
