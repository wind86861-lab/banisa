import { useNavigate } from 'react-router-dom';
import { Star, MapPin, ArrowRight } from 'lucide-react';
import { imgUrl } from '../../../shared/utils/format';

const REGION_LABEL = {
    tashkent_city: 'Toshkent',
    tashkent: 'Toshkent vil.',
    samarkand: 'Samarqand',
    bukhara: 'Buxoro',
};

export default function TopClinics({ clinics = [] }) {
    const navigate = useNavigate();

    if (!clinics.length) return null;

    return (
        <section className="hn-section">
            <div className="hn-container">
                <div className="hn-section-head">
                    <div>
                        <h2 className="hn-section-title">⭐ Eng yaxshi klinikalar</h2>
                        <p className="hn-section-sub">Yuqori reyting va ko'plab sharhlar bilan</p>
                    </div>
                    <a className="hn-link-all" onClick={() => navigate('/klinikalar')} style={{ cursor: 'pointer' }}>
                        Hammasi <ArrowRight size={14} />
                    </a>
                </div>

                <div className="hn-clinics-grid">
                    {clinics.slice(0, 6).map((c) => {
                        const initial = (c.nameUz || 'K').charAt(0).toUpperCase();
                        const cover = imgUrl(c.coverImage);
                        const logo = imgUrl(c.logo);

                        return (
                            <div key={c.id} className="hn-clinic-card" onClick={() => navigate(`/klinikalar/${c.id}`)}>
                                <div className="hn-clinic-cover">
                                    {cover ? (
                                        <img src={cover} alt={c.nameUz} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1dbfc1, #0891b2)' }} />
                                    )}
                                    {c.isOpen !== null && (
                                        <span className={`hn-clinic-status ${c.isOpen ? '' : 'closed'}`}>
                                            <span className="dot" /> {c.isOpen ? 'Hozir ochiq' : 'Yopiq'}
                                        </span>
                                    )}
                                </div>
                                <div className="hn-clinic-body">
                                    <div className="hn-clinic-logo">
                                        {logo ? <img src={logo} alt={c.nameUz} /> : (
                                            <div className="hn-clinic-logo-fallback">{initial}</div>
                                        )}
                                    </div>
                                    <h3 className="hn-clinic-name">{c.nameUz}</h3>
                                    <div className="hn-clinic-meta">
                                        <span className="hn-clinic-rating">
                                            <Star size={13} fill="#f59e0b" className="star" />
                                            {Number(c.rating || 0).toFixed(1)}
                                        </span>
                                        <span className="hn-clinic-meta-item">· {c.reviewCount} sharh</span>
                                        {(c.district || c.region) && (
                                            <span className="hn-clinic-meta-item">
                                                <MapPin size={12} /> {c.district || REGION_LABEL[c.region] || c.region}
                                            </span>
                                        )}
                                    </div>
                                    {c.servicesCount > 0 && (
                                        <div className="hn-clinic-services-count">
                                            {c.servicesCount} ta xizmat mavjud
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
