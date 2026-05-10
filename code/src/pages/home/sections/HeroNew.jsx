import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronDown, Shield, Wallet, Clock } from 'lucide-react';
import { useHomeAutocomplete } from '../../../hooks/useHomeData';

const REGIONS = [
    { id: 'all', label: 'Butun O\'zbekiston' },
    { id: 'tashkent_city', label: 'Toshkent shahri' },
    { id: 'tashkent', label: 'Toshkent vil.' },
    { id: 'samarkand', label: 'Samarqand' },
    { id: 'bukhara', label: 'Buxoro' },
    { id: 'andijan', label: 'Andijon' },
    { id: 'fergana', label: 'Farg\'ona' },
    { id: 'namangan', label: 'Namangan' },
    { id: 'navoi', label: 'Navoiy' },
    { id: 'kashkadarya', label: 'Qashqadaryo' },
    { id: 'surkhandarya', label: 'Surxondaryo' },
    { id: 'jizzakh', label: 'Jizzax' },
    { id: 'syrdarya', label: 'Sirdaryo' },
    { id: 'khorezm', label: 'Xorazm' },
    { id: 'karakalpakstan', label: 'Qoraqalpog\'iston' },
];

const POPULAR_TAGS = [
    { label: 'MRT', q: 'MRT' },
    { label: 'UZI', q: 'UZI' },
    { label: 'Qon analizi', q: 'qon' },
    { label: 'Stomatologiya', q: 'stomat' },
    { label: 'Kardiologiya', q: 'kardio' },
];

export default function HeroNew({ stats }) {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [region, setRegion] = useState(REGIONS[0]);
    const [regionOpen, setRegionOpen] = useState(false);
    const [acOpen, setAcOpen] = useState(false);
    const wrapRef = useRef(null);

    const { data: ac } = useHomeAutocomplete(q);

    useEffect(() => {
        const onClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setAcOpen(false);
                setRegionOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (q.trim()) params.set('search', q.trim());
        if (region.id !== 'all') params.set('region', region.id);
        navigate(`/xizmatlar?${params.toString()}`);
    };

    const goToTag = (tagQ) => {
        navigate(`/xizmatlar?search=${encodeURIComponent(tagQ)}`);
    };

    const goToService = (svc) => {
        navigate(`/xizmatlar/${svc.id}`);
        setAcOpen(false);
    };

    const goToClinic = (cl) => {
        navigate(`/klinikalar/${cl.id}`);
        setAcOpen(false);
    };

    const clinicCount = stats?.clinicCount || 0;
    const serviceCount = stats?.serviceCount || 0;

    return (
        <section className="hn-hero">
            <div className="hn-container hn-hero-inner">
                <div className="hn-hero-badge">
                    <span className="hn-hero-badge-dot" />
                    O'zbekiston #1 onlayn tibbiyot platformasi
                </div>
                <h1 className="hn-hero-title">
                    Sog'liq sizning <br />
                    <span className="hn-grad">qo'lingizda</span>
                </h1>
                <p className="hn-hero-sub">
                    {serviceCount > 0 && clinicCount > 0
                        ? `${serviceCount.toLocaleString('uz-UZ')}+ xizmat · ${clinicCount}+ tasdiqlangan klinika · O'zbekiston bo'ylab`
                        : 'Klinika tanlang, xizmat bron qiling, istalgan usulda to\'lang — bir necha klikda'}
                </p>

                <div className="hn-search-wrap" ref={wrapRef}>
                    <div className="hn-search-bar">
                        <div className="hn-search-input">
                            <Search size={18} />
                            <input
                                type="text"
                                value={q}
                                onChange={(e) => { setQ(e.target.value); setAcOpen(true); }}
                                onFocus={() => setAcOpen(true)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Xizmat yoki klinika qidiring..."
                            />
                        </div>
                        <div className="hn-search-divider" />
                        <button
                            className="hn-search-region"
                            onClick={() => { setRegionOpen((v) => !v); setAcOpen(false); }}
                            type="button"
                        >
                            <MapPin size={16} />
                            <span>{region.label}</span>
                            <ChevronDown size={14} style={{ opacity: 0.6 }} />
                        </button>
                        <button className="hn-search-btn" onClick={handleSearch}>
                            <Search size={16} />
                            Qidirish
                        </button>
                    </div>

                    {/* Region dropdown */}
                    {regionOpen && (
                        <div className="hn-search-ac" style={{ left: 'auto', right: 0, width: 280 }}>
                            <div className="hn-search-ac-section">
                                {REGIONS.map((r) => (
                                    <button
                                        key={r.id}
                                        className="hn-search-ac-item"
                                        style={{ width: '100%', border: 'none', background: 'none' }}
                                        onClick={() => { setRegion(r); setRegionOpen(false); }}
                                    >
                                        <MapPin size={14} style={{ color: r.id === region.id ? '#1dbfc1' : '#94a3b8' }} />
                                        <span style={{ fontSize: 13, fontWeight: r.id === region.id ? 700 : 500, color: r.id === region.id ? '#1dbfc1' : '#1a103d' }}>
                                            {r.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Autocomplete */}
                    {acOpen && q.trim().length >= 2 && (ac?.services?.length > 0 || ac?.clinics?.length > 0) && (
                        <div className="hn-search-ac">
                            {ac.services?.length > 0 && (
                                <div className="hn-search-ac-section">
                                    <div className="hn-search-ac-label">Xizmatlar</div>
                                    {ac.services.map((s) => (
                                        <button
                                            key={`${s.type}-${s.id}`}
                                            className="hn-search-ac-item"
                                            style={{ width: '100%', border: 'none', background: 'none' }}
                                            onClick={() => goToService(s)}
                                        >
                                            <div className="hn-search-ac-icon">
                                                <Search size={14} />
                                            </div>
                                            <div className="hn-search-ac-text">
                                                <div className="hn-search-ac-name">{s.nameUz}</div>
                                                <div className="hn-search-ac-meta">
                                                    {s.category && <>{s.category} · </>}
                                                    {s.clinicCount} klinikada mavjud
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {ac.clinics?.length > 0 && (
                                <div className="hn-search-ac-section" style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <div className="hn-search-ac-label">Klinikalar</div>
                                    {ac.clinics.map((c) => (
                                        <button
                                            key={c.id}
                                            className="hn-search-ac-item"
                                            style={{ width: '100%', border: 'none', background: 'none' }}
                                            onClick={() => goToClinic(c)}
                                        >
                                            <div className="hn-search-ac-icon">
                                                {c.logo
                                                    ? <img src={c.logo.startsWith('/') ? `https://banisa.uz${c.logo}` : c.logo} alt="" />
                                                    : <span style={{ fontSize: 16 }}>🏥</span>}
                                            </div>
                                            <div className="hn-search-ac-text">
                                                <div className="hn-search-ac-name">{c.nameUz}</div>
                                                <div className="hn-search-ac-meta">
                                                    {c.district && <>{c.district} · </>}
                                                    ⭐ {Number(c.averageRating || 0).toFixed(1)} · {c.reviewCount} sharh
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="hn-hero-tags">
                    <span className="hn-hero-tag-label">Mashhur:</span>
                    {POPULAR_TAGS.map((t) => (
                        <button key={t.label} className="hn-hero-tag" onClick={() => goToTag(t.q)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="hn-hero-trust">
                    <span className="hn-hero-trust-item"><Wallet size={15} /> Barcha turdagi to'lovlar</span>
                    <span className="hn-hero-trust-item"><Clock size={15} /> Tezkor bron</span>
                    <span className="hn-hero-trust-item"><Shield size={15} /> Tasdiqlangan klinikalar</span>
                </div>
            </div>
        </section>
    );
}
