import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, X, ChevronLeft, Clock, MapPin, ShoppingCart, SlidersHorizontal,
    Activity, Stethoscope, Leaf, Package, Loader2, Filter, Check,
} from 'lucide-react';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import { usePublicServices } from '../../hooks/usePublicServices';
import { useCart } from '../../contexts/CartContext';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import { imgUrl } from '../../shared/utils/format';
import './css/base.css';
import './css/XizmatlarCategoryPage.css';

const CATEGORY_META = {
    diagnostika: { id: 'diagnostika', label: 'Diagnostika Xizmatlari', short: 'Diagnostika', icon: Activity, color: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
    operatsiya: { id: 'operatsiya', label: 'Operatsiyalar', short: 'Operatsiyalar', icon: Stethoscope, color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' },
    sanatoriya: { id: 'sanatoriya', label: 'Sanatoriya', short: 'Sanatoriya', icon: Leaf, color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
    checkup: { id: 'checkup', label: 'Checkup Paketlar', short: 'Checkup', icon: Package, color: '#9333ea', gradient: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)' },
};

const SPECIALTY_LABELS = {
    kardiologiya: 'Kardiologiya',
    nevrologiya: 'Nevrologiya',
    ortopediya: 'Ortopediya',
    stomatologiya: 'Stomatologiya',
    dermatologiya: 'Dermatologiya',
    endokrinologiya: 'Endokrinologiya',
    oftalmologiya: 'Oftalmologiya',
    urologija: 'Urologiya',
    Umumiy: 'Umumiy',
    Jarrohlik: 'Jarrohlik',
    Sanatoriya: 'Sanatoriya',
    Checkup: 'Checkup',
};

const SORT_OPTIONS = [
    { value: 'popular', label: "Mashhurligi bo'yicha" },
    { value: 'price_asc', label: 'Narx: past → yuqori' },
    { value: 'price_desc', label: 'Narx: yuqori → past' },
    { value: 'rating', label: "Reyting bo'yicha" },
];

const FALLBACK_IMAGES = {
    diagnostika: '/images/default-diagnostika.svg',
    operatsiya: '/images/default-operatsiya.svg',
    sanatoriya: '/images/default-sanatoriya.svg',
    checkup: '/images/default-checkup.svg',
};

function fmt(n) { return (n || 0).toLocaleString('uz-UZ'); }

function ServiceCard({ service, onAddToCart, inCart, busy }) {
    let imgSrc = (service.images?.[0]) || FALLBACK_IMAGES[service.category] || FALLBACK_IMAGES.diagnostika;
    imgSrc = imgUrl(imgSrc) || imgSrc;
    const rating = typeof service.rating === 'number' ? service.rating : 0;

    return (
        <Link to={`/xizmatlar/${service.id}`} className="xc-card">
            <div className="xc-card-img">
                <img
                    src={imgSrc}
                    alt={service.title}
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGES[service.category] || FALLBACK_IMAGES.diagnostika; }}
                />
                {service.discountPercent ? (
                    <span className="xc-card-discount-badge">-{service.discountPercent}%</span>
                ) : null}
            </div>
            <div className="xc-card-body">
                <h3 className="xc-card-title">{service.title}</h3>
                {service.clinic?.name && (
                    <div className="xc-card-clinic">
                        <MapPin size={11} />
                        <span>{service.clinic.name}</span>
                    </div>
                )}
                <div className="xc-card-meta">
                    {rating > 0 && (
                        <span className="xc-card-rating">
                            <span className="xc-star">★</span>
                            {rating.toFixed(1)}
                        </span>
                    )}
                    {service.duration && (
                        <span className="xc-card-duration"><Clock size={11} /> {service.duration}</span>
                    )}
                </div>
            </div>
            <div className="xc-card-footer">
                <div className="xc-card-price">
                    {service.originalPrice ? (
                        <span className="xc-card-price-old">{fmt(service.originalPrice)}</span>
                    ) : null}
                    <span className="xc-card-price-num">{fmt(service.price)} <span>so'm</span></span>
                </div>
                <button
                    className={`xc-card-cart-btn${inCart ? ' in-cart' : ''}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!busy) onAddToCart(service); }}
                    disabled={busy}
                    aria-label={inCart ? 'Savatda mavjud' : "Savatga qo'shish"}
                    title={inCart ? 'Savatda mavjud' : "Savatga qo'shish"}
                >
                    {busy ? <Loader2 size={16} className="xc-spin" />
                        : inCart ? <Check size={16} />
                        : <ShoppingCart size={16} />}
                </button>
            </div>
        </Link>
    );
}

export default function XizmatlarCategoryPage() {
    const { category } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { waitForUser } = useUserAuth();
    const { addToCart, cart } = useCart();
    const [pendingServiceId, setPendingServiceId] = useState(null);

    // Match in-cart by (clinicId, serviceId) — a checkup package can be
    // offered by multiple clinics with the same serviceId, so keying on
    // serviceId alone made adding to clinic A flash the ✓ check on clinic
    // B's identical-looking card too.
    const cartServiceKeys = useMemo(() => {
        const keys = new Set();
        (cart || []).forEach(g => {
            const clinicId = g.clinic?.id;
            if (!clinicId) return;
            (g.items || []).forEach(it => {
                const sid = it.service?.id ?? it.serviceId;
                if (sid) keys.add(`${clinicId}:${sid}`);
            });
        });
        return keys;
    }, [cart]);

    const isInCart = (service) => {
        const sid = service.serviceId || service.id;
        const cid = service.clinic?.id;
        return cid && sid && cartServiceKeys.has(`${cid}:${sid}`);
    };

    const meta = CATEGORY_META[category];
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSub, setSelectedSub] = useState(searchParams.get('sub') || 'all');
    const [sortBy, setSortBy] = useState('popular');
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [minRating, setMinRating] = useState(0);
    const [selectedRegions, setSelectedRegions] = useState([]);

    const { data: ALL_SERVICES = [], isLoading } = usePublicServices();

    useEffect(() => { if (!meta) navigate('/xizmatlar', { replace: true }); }, [meta, navigate]);
    useEffect(() => { window.scrollTo(0, 0); }, [category]);

    useEffect(() => {
        if (selectedSub === 'all') {
            if (searchParams.get('sub')) setSearchParams({}, { replace: true });
        } else {
            setSearchParams({ sub: selectedSub }, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSub]);

    const categoryPool = useMemo(
        () => ALL_SERVICES.filter(s => s.category === category),
        [ALL_SERVICES, category]
    );

    const subcategories = useMemo(() => {
        const map = {};
        categoryPool.forEach(s => { map[s.specialty] = (map[s.specialty] || 0) + 1; });
        return [
            { id: 'all', label: 'Barchasi', count: categoryPool.length },
            ...Object.entries(map)
                .map(([id, count]) => ({ id, label: SPECIALTY_LABELS[id] || id, count }))
                .sort((a, b) => b.count - a.count),
        ];
    }, [categoryPool]);

    const dynamicRegions = useMemo(() => {
        const map = {};
        categoryPool.forEach(s => {
            const r = s.clinic?.region;
            if (r) map[r] = (map[r] || 0) + 1;
        });
        return Object.entries(map).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
    }, [categoryPool]);

    const filtered = useMemo(() => {
        let list = [...categoryPool];
        if (selectedSub !== 'all') list = list.filter(s => s.specialty === selectedSub);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s =>
                s.title.toLowerCase().includes(q) ||
                (s.desc || '').toLowerCase().includes(q)
            );
        }
        if (minRating > 0) list = list.filter(s => (s.rating || 0) >= minRating);
        if (selectedRegions.length) list = list.filter(s => selectedRegions.includes(s.clinic?.region));

        switch (sortBy) {
            case 'price_asc': list.sort((a, b) => a.price - b.price); break;
            case 'price_desc': list.sort((a, b) => b.price - a.price); break;
            case 'rating': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            default: list.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        }
        return list;
    }, [categoryPool, selectedSub, searchQuery, sortBy, minRating, selectedRegions]);

    const showToast = (text, tone = 'success') => {
        const n = document.createElement('div');
        n.className = `xc-toast xc-toast--${tone}`;
        n.textContent = text;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('show'), 10);
        setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 2400);
    };

    const handleAddToCart = async (service) => {
        const resolved = await waitForUser();
        if (!resolved) { navigate('/user/login'); return; }
        let serviceType = 'DIAGNOSTIC';
        if (service.category === 'operatsiya') serviceType = 'SURGICAL';
        else if (service.category === 'sanatoriya') serviceType = 'SANATORIUM';
        else if (service.category === 'checkup') serviceType = 'CHECKUP';
        const clinicId = service.clinic?.id;
        if (!clinicId) { showToast('Klinika topilmadi', 'error'); return; }

        setPendingServiceId(service.id);
        try {
            const result = await addToCart(clinicId, serviceType, service.serviceId || service.id, 1);
            if (result.success) showToast("✓ Savatga qo'shildi");
            else showToast(result.message || "Qo'shib bo'lmadi", 'error');
        } finally {
            setPendingServiceId(null);
        }
    };

    const toggleRegion = (r) => {
        setSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    };

    if (!meta) return null;

    const Icon = meta.icon;
    const activeFiltersCount = (minRating > 0 ? 1 : 0) + selectedRegions.length;

    return (
        <div className="xc-page" style={{ '--cat-color': meta.color, '--cat-gradient': meta.gradient }}>
            <TopBar />
            <Navigation />

            <div className="xc-header">
                <button className="xc-header-back" onClick={() => navigate('/xizmatlar')} aria-label="Orqaga">
                    <ChevronLeft size={22} />
                </button>
                <div className="xc-header-title-wrap">
                    <div className="xc-header-icon"><Icon size={16} /></div>
                    <h1 className="xc-header-title">{meta.short}</h1>
                </div>
                <button className="xc-header-cart" onClick={() => navigate('/cart')} aria-label="Savat">
                    <ShoppingCart size={20} />
                </button>
            </div>

            <div className="xc-hero">
                <div className="xc-hero-blob" />
                <div className="xc-hero-inner">
                    <div className="xc-hero-icon"><Icon size={28} /></div>
                    <div className="xc-hero-text">
                        <h2 className="xc-hero-title">{meta.label}</h2>
                        <p className="xc-hero-sub">
                            {categoryPool.length} ta xizmat • {dynamicRegions.length} ta hududda
                        </p>
                    </div>
                </div>
            </div>

            <div className="xc-search-wrap">
                <div className="xc-search">
                    <Search size={18} className="xc-search-icon" />
                    <input
                        type="text"
                        placeholder={`${meta.short} bo'yicha qidirish...`}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="xc-search-clear" onClick={() => setSearchQuery('')} aria-label="Tozalash">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {subcategories.length > 1 && (
                <div className="xc-subs-bar">
                    <div className="xc-subs-inner">
                        {subcategories.map(sub => (
                            <button
                                key={sub.id}
                                className={`xc-sub-chip${selectedSub === sub.id ? ' active' : ''}`}
                                onClick={() => setSelectedSub(sub.id)}
                            >
                                {sub.label}
                                <span className="xc-sub-count">{sub.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="xc-toolbar">
                <span className="xc-results">
                    <strong>{filtered.length}</strong> ta xizmat topildi
                </span>
                <div className="xc-toolbar-right">
                    <button className="xc-filter-btn" onClick={() => setFilterDrawerOpen(true)}>
                        <SlidersHorizontal size={14} />
                        Filtr
                        {activeFiltersCount > 0 && <span className="xc-filter-badge">{activeFiltersCount}</span>}
                    </button>
                    <select className="xc-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="xc-content">
                {isLoading ? (
                    <div className="xc-empty">
                        <Loader2 size={32} className="xc-spin" />
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="xc-empty">
                        <div className="xc-empty-icon"><Icon size={32} /></div>
                        <h3>Xizmat topilmadi</h3>
                        <p>Filterlarni o'zgartirib qaytadan urinib ko'ring</p>
                        <Link to="/xizmatlar" className="xc-empty-btn">Boshqa kategoriyalar</Link>
                    </div>
                ) : (
                    <div className="xc-grid">
                        {filtered.map(s => (
                            <ServiceCard
                                key={s.id}
                                service={s}
                                onAddToCart={handleAddToCart}
                                inCart={isInCart(s)}
                                busy={pendingServiceId === s.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {filterDrawerOpen && (
                <div className="xc-drawer-backdrop" onClick={() => setFilterDrawerOpen(false)}>
                    <div className="xc-drawer" onClick={e => e.stopPropagation()}>
                        <div className="xc-drawer-handle" />
                        <div className="xc-drawer-header">
                            <h3><Filter size={16} /> Filterlar</h3>
                            <button className="xc-drawer-close-btn" onClick={() => setFilterDrawerOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="xc-drawer-section">
                            <h4>Minimal reyting</h4>
                            <div className="xc-rating-row">
                                {[0, 3, 4, 5].map(r => (
                                    <button
                                        key={r}
                                        className={`xc-rating-btn${minRating === r ? ' active' : ''}`}
                                        onClick={() => setMinRating(r)}
                                    >
                                        {r === 0 ? 'Barchasi' : `${r}★+`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {dynamicRegions.length > 0 && (
                            <div className="xc-drawer-section">
                                <h4>Hudud</h4>
                                <div className="xc-region-list">
                                    {dynamicRegions.map(r => (
                                        <label key={r.id} className="xc-region-row">
                                            <input
                                                type="checkbox"
                                                checked={selectedRegions.includes(r.id)}
                                                onChange={() => toggleRegion(r.id)}
                                            />
                                            <span>{r.id}</span>
                                            <span className="xc-region-count">{r.count}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="xc-drawer-actions">
                            <button
                                className="xc-drawer-clear"
                                onClick={() => { setMinRating(0); setSelectedRegions([]); }}
                            >
                                Tozalash
                            </button>
                            <button
                                className="xc-drawer-apply"
                                onClick={() => setFilterDrawerOpen(false)}
                            >
                                {filtered.length} ta xizmatni ko'rish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
