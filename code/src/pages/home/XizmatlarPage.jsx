import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Search, SlidersHorizontal, X, ChevronDown, ChevronRight,
    LayoutGrid, List, Star, Users, Clock, MapPin, ArrowUpRight,
    Stethoscope, Activity, Leaf, Package, Home, ChevronLeft,
    Filter, Loader2, ShoppingCart, Heart
} from 'lucide-react';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import BanisaLoader from '../../shared/components/BanisaLoader';
import { usePublicServices } from '../../hooks/usePublicServices';
import { useCart } from '../../contexts/CartContext';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import { useFavoriteIds, useToggleFavorite } from '../../user/hooks/useFavorites';
import './css/base.css';
import './css/XizmatlarPage.css';

/* ─── DATA ─── */
const CATEGORIES = [
    { id: 'all', label: 'Barcha Xizmatlar', icon: LayoutGrid, color: '#00BDE0' },
    { id: 'diagnostika', label: 'Diagnostika Xizmatlari', icon: Activity, color: '#00BDE0' },
    { id: 'operatsiya', label: 'Operatsiyalar', icon: Stethoscope, color: '#e74c3c' },
    { id: 'sanatoriya', label: 'Sanatoriya', icon: Leaf, color: '#27ae60' },
    { id: 'checkup', label: 'Checkup Paketlar', icon: Package, color: '#9b59b6' },
];

/* Specialty label map — used to render human-readable names */
const SPECIALTY_LABELS = {
    kardiologiya: 'Kardiologiya',
    nevrologiya: 'Nevrologiya',
    ortopediya: 'Ortopediya',
    stomatologiya: 'Stomatologiya',
    dermatologiya: 'Dermatologiya',
    endokrinologiya: 'Endokrinologiya',
    oftalmologiya: 'Oftalmologiya',
    urologija: 'Urologiya',
};

const AVAILABILITY_LABELS = {
    online: 'Online Konsultatsiya',
    offline: 'Klinigada',
    home: 'Uyga Chiqish',
};


const SORT_OPTIONS = [
    { value: 'popular', label: 'Mashhurligi bo\'yicha' },
    { value: 'price_asc', label: 'Narx: past → yuqori' },
    { value: 'price_desc', label: 'Narx: yuqori → past' },
    { value: 'rating', label: 'Reyting bo\'yicha' },
    { value: 'name', label: 'Nomi bo\'yicha (A→Z)' },
];

function formatPrice(num) {
    return Number(num || 0).toLocaleString('uz-UZ');
}

function StarRating({ rating }) {
    return (
        <div className="xp-stars">
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`xp-star${i <= Math.floor(rating) ? '' : i - rating < 1 ? '' : ' empty'}`}>
                    ★
                </span>
            ))}
        </div>
    );
}

const FALLBACK_IMAGES = {
    diagnostika: '/images/default-diagnostika.svg',
    operatsiya: '/images/default-operatsiya.svg',
    sanatoriya: '/images/default-sanatoriya.svg',
    checkup: '/images/default-checkup.svg',
};

function ServiceCard({ service, listView, onAddToCart, isLoggedIn, favoriteIds, onToggleFavorite }) {
    const cat = CATEGORIES.find(c => c.id === service.category);

    // Fix image URL - add backend base URL if it's a relative path
    let imgSrc = (service.images && service.images.length > 0)
        ? service.images[0]
        : (FALLBACK_IMAGES[service.category] || FALLBACK_IMAGES.diagnostika);

    if (imgSrc && imgSrc.startsWith('/uploads')) {
        imgSrc = `https://banisa.uz${imgSrc}`;
    }

    const rating = typeof service.rating === 'number' ? service.rating : 0;

    return (
        <Link to={`/xizmatlar/${service.id}`} className={`xp-card xp-card-link`}>
            <div className="xp-card-img">
                <img
                    src={imgSrc}
                    alt={service.title}
                    className="xp-card-real-img"
                    onError={(e) => {
                        const fallback = FALLBACK_IMAGES[service.category] || FALLBACK_IMAGES.diagnostika;
                        e.currentTarget.src = fallback;
                    }}
                />
                <span className={`xp-card-badge ${service.category}`}>
                    {cat && <cat.icon size={11} />}
                    {cat?.label?.split(' ')[0]}
                </span>
                {isLoggedIn && (() => {
                    const stype = service.category === 'jarrohlik' ? 'SURGICAL' : 'DIAGNOSTIC';
                    const isFav = favoriteIds?.has(`${stype}:${service.serviceId || service.id}`);
                    return (
                        <button
                            className={`xp-card-fav${isFav ? ' active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleFavorite?.({ serviceType: stype, serviceId: service.serviceId || service.id });
                            }}
                            title={isFav ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
                            aria-label="Sevimli"
                        >
                            <Heart size={16} fill={isFav ? '#ef4444' : 'none'} />
                        </button>
                    );
                })()}
            </div>
            <div className="xp-card-body">
                <h3 className="xp-card-title">{service.title}</h3>
                <p className="xp-card-desc">{service.desc}</p>
                {service.clinic?.name && (
                    <div className="xp-clinic-name-large">{service.clinic.name}</div>
                )}
                <div className="xp-card-meta">
                    {service.duration && (
                        <div className="xp-card-meta-item">
                            <Clock size={12} />
                            {service.duration}
                        </div>
                    )}
                    {rating > 0 && (
                        <div className="xp-card-rating">
                            <span className="xp-star">★</span>
                            <span className="xp-card-rating-num">{rating.toFixed(1)}</span>
                            <span className="xp-card-rating-count">({service.reviews})</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="xp-card-footer">
                <div className="xp-card-price">
                    <span className="xp-card-price-from">Boshlanish narxi</span>
                    <span className="xp-card-price-num">
                        {formatPrice(service.price)} <span>so'm</span>
                    </span>
                </div>
                <div className="xp-card-actions">
                    {isLoggedIn && (
                        <button
                            className="xp-card-cart-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAddToCart(service);
                            }}
                            title="Savatga qo'shish"
                        >
                            <ShoppingCart size={18} />
                        </button>
                    )}
                    <span className="xp-card-book-btn">Batafsil →</span>
                </div>
            </div>
        </Link>
    );
}

// Compact page list with ellipses. Returns [1, '...', 4, 5, 6, '...', 12].
function compactPages(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current, current - 1, current + 1]);
    if (current <= 3) [2, 3, 4].forEach(p => pages.add(p));
    if (current >= total - 2) [total - 1, total - 2, total - 3].forEach(p => pages.add(p));
    const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
        result.push(sorted[i]);
        if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) result.push('…');
    }
    return result;
}

// Pill button with a floating popover. Click outside or Esc to close.
function FilterDropdown({ label, count = 0, icon = null, children, width = 280, align = 'start' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);
    return (
        <div className="xp-fd" ref={ref}>
            <button
                type="button"
                className={`xp-fd-btn${count > 0 ? ' has-count' : ''}${open ? ' open' : ''}`}
                onClick={() => setOpen(v => !v)}
            >
                {icon}
                <span>{label}</span>
                {count > 0 && <span className="xp-fd-count">{count}</span>}
                <ChevronDown size={14} className={`xp-fd-chev${open ? ' open' : ''}`} />
            </button>
            {open && (
                <div className={`xp-fd-pop xp-fd-pop--${align}`} style={{ width }}>
                    {children}
                </div>
            )}
        </div>
    );
}

function FilterGroup({ title, count, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="xp-filter-group">
            <div
                className={`xp-filter-group-title${!open ? ' collapsed' : ''}`}
                onClick={() => setOpen(!open)}
            >
                <span className="xp-fg-title-text">{title}</span>
                {count > 0 && <span className="xp-fg-active-badge">{count}</span>}
                <ChevronDown size={14} className="xp-fg-chev" />
            </div>
            {open && <div className="xp-fg-body">{children}</div>}
        </div>
    );
}

// Reusable checkbox filter list with optional search + show-more, keeping
// the user-selected items pinned to the top regardless of the search query.
function CheckboxFilterList({ options, selected, onToggle, searchable = false, initialLimit = 6, renderLabel }) {
    const [q, setQ] = useState('');
    const [expanded, setExpanded] = useState(false);
    const norm = q.trim().toLowerCase();
    const filtered = norm ? options.filter(o => (o.label || o.value || '').toLowerCase().includes(norm)) : options;
    const sorted = [...filtered].sort((a, b) => {
        const aSel = selected.includes(a.id ?? a.value) ? 0 : 1;
        const bSel = selected.includes(b.id ?? b.value) ? 0 : 1;
        if (aSel !== bSel) return aSel - bSel;
        return (b.count || 0) - (a.count || 0);
    });
    const showSearch = searchable && options.length > initialLimit;
    const showAll = expanded || !!norm || sorted.length <= initialLimit;
    const visible = showAll ? sorted : sorted.slice(0, initialLimit);
    const hiddenCount = sorted.length - visible.length;

    return (
        <>
            {showSearch && (
                <div className="xp-fg-search">
                    <Search size={12} />
                    <input
                        type="text"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Qidirish..."
                    />
                    {q && (
                        <button onClick={() => setQ('')} aria-label="Tozalash">
                            <X size={12} />
                        </button>
                    )}
                </div>
            )}
            <div className="xp-filter-options">
                {visible.map(opt => {
                    const id = opt.id ?? opt.value;
                    const checked = selected.includes(id);
                    const off = (opt.count === 0) && !checked;
                    return (
                        <label key={id} className="xp-filter-option" style={off ? { opacity: 0.4 } : undefined}>
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={off}
                                onChange={() => onToggle(id)}
                            />
                            <span className="xp-filter-option-label">
                                {renderLabel ? renderLabel(opt) : (opt.label || opt.value)}
                            </span>
                            <span className="xp-filter-option-count">{opt.count}</span>
                        </label>
                    );
                })}
                {!norm && hiddenCount > 0 && (
                    <button className="xp-fg-more" onClick={() => setExpanded(true)}>
                        +{hiddenCount} ko'proq ko'rsatish
                    </button>
                )}
                {expanded && sorted.length > initialLimit && (
                    <button className="xp-fg-more" onClick={() => setExpanded(false)}>
                        Yopish
                    </button>
                )}
                {norm && visible.length === 0 && (
                    <div className="xp-fg-empty">Hech narsa topilmadi</div>
                )}
            </div>
        </>
    );
}

// Clickable star rating filter — pick exact min rating like Booking.com.
function StarRatingFilter({ value, onChange, counts = {} }) {
    const opts = [
        { val: 5, label: '5★' },
        { val: 4, label: '4★+' },
        { val: 3, label: '3★+' },
        { val: 0, label: 'Barchasi' },
    ];
    return (
        <div className="xp-rating-pills">
            {opts.map(o => {
                const active = value === o.val;
                return (
                    <button
                        key={o.val}
                        type="button"
                        className={`xp-rating-pill${active ? ' active' : ''}`}
                        onClick={() => onChange(o.val)}
                    >
                        <span>{o.label}</span>
                        <span className="xp-rating-pill-count">{counts[o.val] || 0}</span>
                    </button>
                );
            })}
        </div>
    );
}

// Dual-thumb price range slider — keeps min and max independent.
function DualRangeSlider({ min, max, value, step, onChange }) {
    const lo = value.lo ?? min;
    const hi = value.hi ?? max;
    const pctLo = max > min ? ((lo - min) / (max - min)) * 100 : 0;
    const pctHi = max > min ? ((hi - min) / (max - min)) * 100 : 100;
    return (
        <div className="xp-dual-range">
            <div className="xp-dual-track">
                <div className="xp-dual-fill" style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }} />
            </div>
            <input
                type="range" min={min} max={max} step={step} value={lo}
                onChange={e => onChange({ lo: Math.min(Number(e.target.value), hi), hi })}
                className="xp-dual-thumb"
            />
            <input
                type="range" min={min} max={max} step={step} value={hi}
                onChange={e => onChange({ lo, hi: Math.max(Number(e.target.value), lo) })}
                className="xp-dual-thumb"
            />
        </div>
    );
}

const hasBound = (v) => v != null && v !== '';

/* Debounced numeric range inputs for a metadata facet — local state keeps
   typing smooth; the parent filter state (which re-filters the whole list)
   is committed only 300ms after the last keystroke. */
function MetaRangeInputs({ lo, hi, value, onCommit }) {
    const [local, setLocal] = useState({ min: value.min ?? '', max: value.max ?? '' });
    useEffect(() => { setLocal({ min: value.min ?? '', max: value.max ?? '' }); }, [value.min, value.max]);
    const timer = useRef();
    useEffect(() => () => clearTimeout(timer.current), []);
    const change = (bound, v) => {
        setLocal(p => ({ ...p, [bound]: v }));
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onCommit(bound, v), 300);
    };
    return (
        <div className="xp-meta-range">
            <input type="number" inputMode="numeric" placeholder={`Min ${lo}`}
                value={local.min} onChange={e => change('min', e.target.value)} />
            <span>–</span>
            <input type="number" inputMode="numeric" placeholder={`Max ${hi}`}
                value={local.max} onChange={e => change('max', e.target.value)} />
        </div>
    );
}

const ITEMS_PER_PAGE = 9;

/* ── auto-scroll hook ── */
function useAutoScroll(ref, interval = 3000, step = 180) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let dir = 1;
        const timer = setInterval(() => {
            const max = el.scrollWidth - el.clientWidth;
            if (max <= 0) return;
            let next = el.scrollLeft + dir * step;
            if (next >= max) { next = max; dir = -1; }
            if (next <= 0) { next = 0; dir = 1; }
            el.scrollTo({ left: next, behavior: 'smooth' });
        }, interval);
        const stop = () => clearInterval(timer);
        el.addEventListener('touchstart', stop, { once: true });
        el.addEventListener('mousedown', stop, { once: true });
        return () => clearInterval(timer);
    }, [ref, interval, step]);
}

const CLINIC_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#dbeafe'/><stop offset='100%' stop-color='#bfdbfe'/>
      </linearGradient></defs>
      <rect width='200' height='150' fill='url(#g)'/>
      <g fill='#2563eb' transform='translate(100,75)'>
        <rect x='-22' y='-24' width='44' height='48' rx='4' fill='#fff' stroke='#2563eb' stroke-width='2'/>
        <rect x='-4' y='-14' width='8' height='8' fill='#2563eb'/>
        <rect x='-4' y='6' width='8' height='14' fill='#2563eb'/>
        <path d='M-3,-22 L3,-22 L3,-18 L7,-18 L7,-12 L3,-12 L3,-8 L-3,-8 L-3,-12 L-7,-12 L-7,-18 L-3,-18 Z' fill='#2563eb'/>
      </g>
    </svg>`
);

/* ── HUB CAROUSELS (mobile-only shortcuts: clinics / discount / top) ── */
function HubCarousels({ services, isLoggedIn, onAddToCart }) {
    const clinics = useMemo(() => {
        const map = new Map();
        services.forEach(s => {
            const c = s.clinic;
            if (!c?.id) return;
            if (!map.has(c.id)) {
                map.set(c.id, { ...c, serviceCount: 0, ratingSum: 0, ratingCount: 0 });
            }
            const entry = map.get(c.id);
            entry.serviceCount += 1;
            if (s.rating) { entry.ratingSum += s.rating; entry.ratingCount += 1; }
        });
        return Array.from(map.values())
            .map(c => ({ ...c, avgRating: c.ratingCount ? +(c.ratingSum / c.ratingCount).toFixed(1) : 0 }))
            .sort((a, b) => b.serviceCount - a.serviceCount)
            .slice(0, 10);
    }, [services]);
    const discounted = useMemo(
        () => services.filter(s => s.discountPercent && s.discountPercent > 0).slice(0, 8),
        [services]
    );
    const topRated = useMemo(
        () => [...services].filter(s => (s.rating || 0) >= 4).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8),
        [services]
    );

    const clinicRef = useRef(null);
    const discountRef = useRef(null);
    const topRef = useRef(null);
    useAutoScroll(clinicRef, 3500, 180);
    useAutoScroll(discountRef, 3200, 180);
    useAutoScroll(topRef, 3800, 180);

    const renderCarousel = (title, emoji, list, color, trackRef) => {
        if (!list.length) return null;
        return (
            <div className="xp-hub-carousel">
                <div className="xp-hub-carousel-head">
                    <h3 className="xp-hub-carousel-title">
                        <span className="xp-hub-carousel-emoji" style={{ background: color + '20', color }}>{emoji}</span>
                        {title}
                    </h3>
                    <span className="xp-hub-carousel-count">{list.length}</span>
                </div>
                <div className="xp-hub-carousel-track" ref={trackRef}>
                    {list.map(s => {
                        let img = (s.images?.[0]) || FALLBACK_IMAGES[s.category] || FALLBACK_IMAGES.diagnostika;
                        if (img?.startsWith('/uploads')) img = `https://banisa.uz${img}`;
                        return (
                            <Link key={s.id} to={`/xizmatlar/${s.id}`} className="xp-hub-mini-card">
                                <div className="xp-hub-mini-img">
                                    <img src={img} alt={s.title} onError={e => { e.currentTarget.src = FALLBACK_IMAGES[s.category] || FALLBACK_IMAGES.diagnostika; }} />
                                    {s.discountPercent ? (
                                        <span className="xp-hub-mini-discount">-{s.discountPercent}%</span>
                                    ) : null}
                                </div>
                                <div className="xp-hub-mini-body">
                                    <h4 className="xp-hub-mini-title">{s.title}</h4>
                                    {s.clinic?.name && <span className="xp-hub-mini-clinic">{s.clinic.name}</span>}
                                    <div className="xp-hub-mini-bottom">
                                        <span className="xp-hub-mini-price">{(s.price || 0).toLocaleString('uz-UZ')} so'm</span>
                                        {s.rating > 0 && (
                                            <span className="xp-hub-mini-rating">★ {s.rating.toFixed(1)}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderClinicCarousel = () => {
        if (!clinics.length) return null;
        return (
            <div className="xp-hub-carousel">
                <div className="xp-hub-carousel-head">
                    <h3 className="xp-hub-carousel-title">
                        <span className="xp-hub-carousel-emoji" style={{ background: '#2563eb20', color: '#2563eb' }}>🏥</span>
                        Klinikalar
                    </h3>
                    <span className="xp-hub-carousel-count">{clinics.length}</span>
                </div>
                <div className="xp-hub-carousel-track" ref={clinicRef}>
                    {clinics.map(c => {
                        // Clinic logo / cover only — never fall back to a service image
                        let img = c.logo || c.coverImage || CLINIC_PLACEHOLDER;
                        if (img?.startsWith('/uploads')) img = `https://banisa.uz${img}`;
                        const hasLogo = !!c.logo;
                        return (
                            <Link key={c.id} to={`/klinikalar/${c.id}`} className="xp-hub-mini-card">
                                <div className={`xp-hub-mini-img${hasLogo ? ' xp-hub-mini-img-logo' : ''}`}>
                                    <img src={img} alt={c.name} onError={e => { if (e.currentTarget.src !== CLINIC_PLACEHOLDER) e.currentTarget.src = CLINIC_PLACEHOLDER; }} />
                                </div>
                                <div className="xp-hub-mini-body">
                                    <h4 className="xp-hub-mini-title">{c.name}</h4>
                                    {c.region && <span className="xp-hub-mini-clinic">{c.region}</span>}
                                    <div className="xp-hub-mini-bottom">
                                        <span className="xp-hub-mini-price">{c.serviceCount} ta xizmat</span>
                                        {c.avgRating > 0 && <span className="xp-hub-mini-rating">★ {c.avgRating}</span>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="xp-hub-carousels">
            {renderClinicCarousel()}
            {renderCarousel('Chegirma bilan', '💰', discounted, '#16a34a', discountRef)}
            {renderCarousel('Yuqori reytingdagi', '⭐', topRated, '#f59e0b', topRef)}
        </div>
    );
}

export default function XizmatlarPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useUserAuth();
    const { set: favoriteIds } = useFavoriteIds();
    const toggleFavMut = useToggleFavorite();
    const { addToCart } = useCart();
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState([]);
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [minRating, setMinRating] = useState(0);
    const [priceMax, setPriceMax] = useState(null); // null = use pool max
    const [priceMin, setPriceMin] = useState(null); // null = use pool min
    const [metaFilters, setMetaFilters] = useState({}); // { [templateKey]: string[] }
    const [sortBy, setSortBy] = useState('popular');
    const [viewMode, setViewMode] = useState('grid');
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLocations, setSelectedLocations] = useState([]);

    // Fetch real services data
    const { data: SERVICES_DATA = [], isLoading, error, refetch } = usePublicServices();

    // Handle add to cart
    const handleAddToCart = async (service) => {
        if (!user) {
            navigate('/user/login', { state: { from: location.pathname } });
            return;
        }

        // Determine service type based on category
        let serviceType = 'DIAGNOSTIC';
        if (service.category === 'operatsiya') serviceType = 'SURGICAL';
        else if (service.category === 'sanatoriya') serviceType = 'SANATORIUM';
        else if (service.category === 'checkup') serviceType = 'CHECKUP';

        // Get clinic ID from service
        const clinicId = service.clinic?.id;
        if (!clinicId) {
            alert('Klinika ma\'lumoti topilmadi');
            return;
        }

        const result = await addToCart(clinicId, serviceType, service.serviceId || service.id, 1);
        if (result.success) {
            // Build toast nodes via the DOM API instead of innerHTML to avoid
            // any HTML injection if class names / messages ever come from data.
            const notification = document.createElement('div');
            notification.className = 'xp-cart-notification';
            const inner = document.createElement('div');
            inner.className = 'xp-cart-notification-content';
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('width', '20'); svg.setAttribute('height', '20');
            svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
            const poly = document.createElementNS(svgNS, 'polyline');
            poly.setAttribute('points', '20 6 9 17 4 12');
            svg.appendChild(poly);
            const span = document.createElement('span');
            span.textContent = "Savatga qo'shildi!";
            inner.appendChild(svg); inner.appendChild(span);
            notification.appendChild(inner);
            document.body.appendChild(notification);
            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        } else {
            alert(result.message || 'Xatolik yuz berdi');
        }
    };

    // Handle navigation state - auto-select subcategory if passed from home page
    useEffect(() => {
        if (location.state?.selectedSubcategory) {
            const subcategory = location.state.selectedSubcategory;
            setSelectedSpecialties([subcategory]);
            // Clear the state to prevent re-triggering
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Read ?search= and ?category= from the URL so links from the hero / nav /
    // anywhere actually pre-fill the filter state instead of being ignored.
    useEffect(() => {
        const p = new URLSearchParams(location.search);
        const s = p.get('search');
        const cat = p.get('category');
        if (s) {
            setSearchQuery(s);
            setCurrentPage(1);
        }
        if (cat && CATEGORIES.some(c => c.id === cat)) {
            setActiveCategory(cat);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    /* ── category tab counts (fixed totals, no filter applied) ── */
    const categoryCounts = useMemo(() => {
        const counts = { all: SERVICES_DATA.length };
        SERVICES_DATA.forEach(s => {
            counts[s.category] = (counts[s.category] || 0) + 1;
        });
        return counts;
    }, [SERVICES_DATA]);

    /* ── POOL: services in the active category (before sidebar filters) ──
       This is the base for computing all dynamic filter options & counts. */
    const categoryPool = useMemo(() =>
        activeCategory === 'all'
            ? SERVICES_DATA
            : SERVICES_DATA.filter(s => s.category === activeCategory)
        , [activeCategory, SERVICES_DATA]);

    /* ── Dynamic price bounds from current pool ── */
    const poolPriceRange = useMemo(() => {
        if (!categoryPool.length) return { min: 0, max: 5000000 };
        return {
            min: Math.min(...categoryPool.map(s => s.price)),
            max: Math.max(...categoryPool.map(s => s.price)),
        };
    }, [categoryPool]);

    /* Effective price bounds — null falls back to pool bounds */
    const effectivePriceMax = priceMax ?? poolPriceRange.max;
    const effectivePriceMin = priceMin ?? poolPriceRange.min;

    /* ── Dynamic specialty options from pool ── */
    const dynamicSpecialties = useMemo(() => {
        const map = {};
        categoryPool.forEach(s => {
            map[s.specialty] = (map[s.specialty] || 0) + 1;
        });
        return Object.entries(map)
            .map(([id, count]) => ({ id, label: SPECIALTY_LABELS[id] || id, count }))
            .sort((a, b) => b.count - a.count);
    }, [categoryPool]);

    /* ── Dynamic availability options from pool ── */
    const dynamicAvailability = useMemo(() => {
        const map = {};
        categoryPool.forEach(s => {
            s.availability.forEach(a => {
                map[a] = (map[a] || 0) + 1;
            });
        });
        return Object.entries(map)
            .map(([id, count]) => ({ id, label: AVAILABILITY_LABELS[id] || id, count }))
            .sort((a, b) => b.count - a.count);
    }, [categoryPool]);

    /* ── Dynamic metadata filter facets from pool (clinic-entered attributes) ── */
    const dynamicMetadata = useMemo(() => {
        // key -> { key, label, unit, inputType, ranges: [lo,hi][], values: Map(value->count) }
        const map = new Map();
        categoryPool.forEach(s => {
            (s.metadata || []).forEach(m => {
                if (!m?.key || m.value == null || m.value === '') return;
                if (!map.has(m.key)) {
                    map.set(m.key, { key: m.key, label: m.label, unit: m.unit, inputType: m.inputType, values: new Map(), ranges: [] });
                }
                const entry = map.get(m.key);
                if (m.inputType === 'NUMBER') {
                    const lo = Number(m.value);
                    const hi = m.valueMax != null && m.valueMax !== '' ? Number(m.valueMax) : lo;
                    if (!Number.isNaN(lo) && !Number.isNaN(hi)) entry.ranges.push([Math.min(lo, hi), Math.max(lo, hi)]);
                } else {
                    entry.values.set(m.value, (entry.values.get(m.value) || 0) + 1);
                }
            });
        });
        return [...map.values()]
            .map(e => {
                const isBoolean = e.inputType === 'CHECKBOX';
                if (e.inputType === 'NUMBER') {
                    if (e.ranges.length === 0) return null;
                    const lo = Math.min(...e.ranges.map(r => r[0]));
                    const hi = Math.max(...e.ranges.map(r => r[1]));
                    return { ...e, kind: 'patient-value', bounds: { lo, hi }, options: [] };
                }
                return {
                    ...e,
                    kind: isBoolean ? 'boolean' : 'enum',
                    bounds: null,
                    options: [...e.values.entries()]
                        .map(([value, count]) => ({ value, count }))
                        .sort((a, b) => String(a.value).localeCompare(String(b.value))),
                };
            })
            .filter(Boolean)
            .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }, [categoryPool]);

    const toggleMeta = (key, value) => {
        setMetaFilters(prev => {
            const cur = Array.isArray(prev[key]) ? prev[key] : [];
            const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
            const updated = { ...prev, [key]: next };
            if (next.length === 0) delete updated[key];
            return updated;
        });
        setCurrentPage(1);
    };

    // Patient enters a single value for a NUMBER (range) template.
    // We store it under { value: ... } so the existing facet engine can detect non-empty.
    const setMetaValue = (key, value) => {
        setMetaFilters(prev => {
            const updated = { ...prev };
            if (value == null || value === '') {
                delete updated[key];
            } else {
                updated[key] = { value };
            }
            return updated;
        });
        setCurrentPage(1);
    };

    /* ── Dynamic location options from pool ── */
    const dynamicLocations = useMemo(() => {
        const map = {};
        categoryPool.forEach(s => {
            const region = s.clinic?.region;
            if (region) map[region] = (map[region] || 0) + 1;
        });
        return Object.entries(map)
            .map(([id, count]) => ({ id, label: id, count }))
            .sort((a, b) => b.count - a.count);
    }, [categoryPool]);

    /* ── Faceted (cross-filter) engine ─────────────────────────────────
       One pure predicate per filter dimension. `passes(s, skipDim,
       skipMetaKey)` = the service matches every active filter EXCEPT the
       one being counted, so a group's own selection never shrinks its own
       counts ("OR within a group, AND across groups"). Every option count
       below is computed leave-one-out, so the numbers always reflect what
       you'd actually get — no dead-end (0-result) combinations. */
    const metaKeys = useMemo(() => Object.keys(metaFilters).filter(k => {
        const f = metaFilters[k];
        if (Array.isArray(f)) return f.length > 0;
        return hasBound(f?.value) || hasBound(f?.min) || hasBound(f?.max);
    }), [metaFilters]);

    // Count of distinct dynamic-metadata filters currently active. Drives the
    // "Kengaytirilgan filtrlar" pill badge.
    const dynamicMetaActiveCount = metaKeys.length;

    const preds = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const metaPred = (s, key) => {
            const entry = (s.metadata || []).find(m => m.key === key);
            if (!entry) return false;
            const f = metaFilters[key];
            if (Array.isArray(f)) return f.includes(entry.value);
            // Range template: clinic stored value=min, valueMax=max. Patient sent {value}.
            if (hasBound(f?.value)) {
                const patientVal = Number(f.value);
                const clinicMin = Number(entry.value);
                const clinicMax = entry.valueMax != null && entry.valueMax !== '' ? Number(entry.valueMax) : clinicMin;
                if (Number.isNaN(patientVal) || Number.isNaN(clinicMin)) return false;
                return patientVal >= clinicMin && patientVal <= clinicMax;
            }
            // Legacy {min, max} (kept for backward compat)
            const num = Number(entry.value);
            if (Number.isNaN(num)) return false;
            if (hasBound(f?.min) && num < Number(f.min)) return false;
            if (hasBound(f?.max) && num > Number(f.max)) return false;
            return true;
        };
        return {
            search: s => !q ||
                s.title.toLowerCase().includes(q) ||
                s.desc.toLowerCase().includes(q) ||
                (SPECIALTY_LABELS[s.specialty] || s.specialty).toLowerCase().includes(q),
            specialty: s => !selectedSpecialties.length || selectedSpecialties.includes(s.specialty),
            availability: s => !selectedAvailability.length || s.availability.some(a => selectedAvailability.includes(a)),
            location: s => !selectedLocations.length || (s.clinic?.region && selectedLocations.includes(s.clinic.region)),
            rating: s => minRating <= 0 || s.rating >= minRating,
            price: s => s.price >= effectivePriceMin && s.price <= effectivePriceMax,
            metaPred,
        };
    }, [searchQuery, selectedSpecialties, selectedAvailability, selectedLocations, minRating, effectivePriceMax, effectivePriceMin, metaFilters]);

    const passes = useMemo(() => (s, skipDim, skipMetaKey) => {
        if (skipDim !== 'search' && !preds.search(s)) return false;
        if (skipDim !== 'specialty' && !preds.specialty(s)) return false;
        if (skipDim !== 'availability' && !preds.availability(s)) return false;
        if (skipDim !== 'location' && !preds.location(s)) return false;
        if (skipDim !== 'rating' && !preds.rating(s)) return false;
        if (skipDim !== 'price' && !preds.price(s)) return false;
        for (const k of metaKeys) {
            if (k === skipMetaKey) continue;
            if (!preds.metaPred(s, k)) return false;
        }
        return true;
    }, [preds, metaKeys]);

    const facetCounts = useMemo(() => {
        const tally = (skipDim, pick) => {
            const m = {};
            for (const s of categoryPool) {
                if (!passes(s, skipDim, null)) continue;
                for (const v of pick(s)) m[v] = (m[v] || 0) + 1;
            }
            return m;
        };
        const specialty = tally('specialty', s => [s.specialty]);
        const availability = tally('availability', s => s.availability);
        const location = tally('location', s => (s.clinic?.region ? [s.clinic.region] : []));

        const ratingBase = categoryPool.filter(s => passes(s, 'rating', null));
        const rating = {
            5: ratingBase.filter(s => s.rating >= 5).length,
            4: ratingBase.filter(s => s.rating >= 4).length,
            3: ratingBase.filter(s => s.rating >= 3).length,
            0: ratingBase.length,
        };

        const meta = {};
        for (const md of dynamicMetadata) {
            const counts = {};
            let total = 0;
            for (const s of categoryPool) {
                if (!passes(s, null, md.key)) continue;
                const entry = (s.metadata || []).find(x => x.key === md.key);
                if (!entry) continue;
                counts[entry.value] = (counts[entry.value] || 0) + 1;
                total++;
            }
            meta[md.key] = { counts, total };
        }
        return { specialty, availability, location, rating, meta };
    }, [categoryPool, passes, dynamicMetadata]);

    const specialtyOptions = dynamicSpecialties.map(o => ({ ...o, count: facetCounts.specialty[o.id] || 0 }));
    const availabilityOptions = dynamicAvailability.map(o => ({ ...o, count: facetCounts.availability[o.id] || 0 }));
    const locationOptions = dynamicLocations.map(o => ({ ...o, count: facetCounts.location[o.id] || 0 }));
    const ratingCounts = facetCounts.rating;

    /* ── When category changes: drop stale selections & reset price ── */
    const handleCategoryChange = (id) => {
        const newPool = id === 'all' ? SERVICES_DATA : SERVICES_DATA.filter(s => s.category === id);
        const validSpecialties = new Set(newPool.map(s => s.specialty));
        const validAvailability = new Set(newPool.flatMap(s => s.availability));
        const validLocations = new Set(newPool.map(s => s.clinic?.region).filter(Boolean));
        setSelectedSpecialties(prev => prev.filter(x => validSpecialties.has(x)));
        setSelectedAvailability(prev => prev.filter(x => validAvailability.has(x)));
        setSelectedLocations(prev => prev.filter(x => validLocations.has(x)));
        setMetaFilters({});
        setPriceMax(null);
        setMinRating(0);
        setActiveCategory(id);
        setCurrentPage(1);
    };

    /* ── FILTERED + SORTED result list ── */
    const filtered = useMemo(() => {
        // `.filter` returns a fresh array, so the in-place sort is safe.
        const list = categoryPool.filter(s => passes(s, null, null));
        switch (sortBy) {
            case 'price_asc': list.sort((a, b) => a.price - b.price); break;
            case 'price_desc': list.sort((a, b) => b.price - a.price); break;
            case 'rating': list.sort((a, b) => b.rating - a.rating); break;
            case 'name': list.sort((a, b) => a.title.localeCompare(b.title)); break;
            default: list.sort((a, b) => b.reviews - a.reviews);
        }
        return list;
    }, [categoryPool, passes, sortBy]);

    /* ── pagination ── */
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    /* ── Check if user is actively searching/filtering ── */
    const isSearchingOrFiltering = !!(
        searchQuery.trim() ||
        selectedSpecialties.length > 0 ||
        selectedAvailability.length > 0 ||
        selectedLocations.length > 0 ||
        minRating > 0 ||
        (priceMin !== null && priceMin > poolPriceRange.min) ||
        (priceMax !== null && priceMax < poolPriceRange.max) ||
        dynamicMetaActiveCount > 0
    );

    /* ── Active filter chips ── */
    const activeFilters = [];
    if (searchQuery) activeFilters.push({ id: 'search', label: `"${searchQuery}"`, onRemove: () => { setSearchQuery(''); setCurrentPage(1); } });
    selectedSpecialties.forEach(s => {
        activeFilters.push({ id: `sp-${s}`, label: SPECIALTY_LABELS[s] || s, onRemove: () => { setSelectedSpecialties(prev => prev.filter(x => x !== s)); setCurrentPage(1); } });
    });
    selectedAvailability.forEach(a => {
        activeFilters.push({ id: `av-${a}`, label: AVAILABILITY_LABELS[a] || a, onRemove: () => { setSelectedAvailability(prev => prev.filter(x => x !== a)); setCurrentPage(1); } });
    });
    selectedLocations.forEach(loc => {
        activeFilters.push({ id: `loc-${loc}`, label: loc, onRemove: () => { setSelectedLocations(prev => prev.filter(x => x !== loc)); setCurrentPage(1); } });
    });
    Object.entries(metaFilters).forEach(([key, f]) => {
        const meta = dynamicMetadata.find(m => m.key === key);
        const unit = meta?.unit ? ' ' + meta.unit : '';
        if (Array.isArray(f)) {
            f.forEach(val => {
                const isBool = meta?.kind === 'boolean';
                activeFilters.push({
                    id: `meta-${key}-${val}`,
                    label: isBool ? (meta?.label || key) : `${meta?.label || key}: ${val}${unit}`,
                    onRemove: () => toggleMeta(key, val),
                });
            });
        } else if (f && hasBound(f.value)) {
            activeFilters.push({
                id: `meta-${key}-value`,
                label: `${meta?.label || key}: ${f.value}${unit}`,
                onRemove: () => setMetaFilters(prev => { const u = { ...prev }; delete u[key]; return u; }),
            });
        } else if (f && (f.min != null && f.min !== '' || f.max != null && f.max !== '')) {
            const lo = (f.min != null && f.min !== '') ? f.min : '…';
            const hi = (f.max != null && f.max !== '') ? f.max : '…';
            activeFilters.push({
                id: `meta-${key}-range`,
                label: `${meta?.label || key}: ${lo}–${hi}${unit}`,
                onRemove: () => setMetaFilters(prev => { const u = { ...prev }; delete u[key]; return u; }),
            });
        }
    });
    if (minRating > 0) activeFilters.push({ id: 'rating', label: `${minRating}+ yulduz`, onRemove: () => { setMinRating(0); setCurrentPage(1); } });
    if ((priceMin !== null && priceMin > poolPriceRange.min) || (priceMax !== null && priceMax < poolPriceRange.max)) {
        const lbl = `${formatPrice(effectivePriceMin)}–${formatPrice(effectivePriceMax)} so'm`;
        activeFilters.push({ id: 'price', label: lbl, onRemove: () => { setPriceMin(null); setPriceMax(null); setCurrentPage(1); } });
    }

    const clearSidebarFilters = () => {
        setSearchQuery('');
        setSelectedSpecialties([]);
        setSelectedAvailability([]);
        setSelectedLocations([]);
        setMetaFilters({});
        setMinRating(0);
        setPriceMax(null);
        setPriceMin(null);
        setCurrentPage(1);
    };

    const toggleLocation = (id) => {
        setSelectedLocations(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        setCurrentPage(1);
    };

    const clearAll = () => {
        clearSidebarFilters();
        setActiveCategory('all');
    };

    const toggleSpecialty = (id) => {
        setSelectedSpecialties(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        setCurrentPage(1);
    };

    const toggleAvailability = (id) => {
        setSelectedAvailability(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        setCurrentPage(1);
    };

    const pricePct = Math.round((effectivePriceMax / poolPriceRange.max) * 100);

    /* ratingCounts is now derived leave-one-out in facetCounts (see above). */

    const SidebarContent = () => (
        <>
            <div className="xp-filter-header">
                <h3><Filter size={16} /> Filtrlar</h3>
                {activeFilters.length > 0 && (
                    <button className="xp-filter-clear" onClick={clearSidebarFilters}>Tozalash</button>
                )}
            </div>

            {/* ── Mutaxassislik ── */}
            <FilterGroup title="Mutaxassislik" count={selectedSpecialties.length}>
                <CheckboxFilterList
                    options={specialtyOptions}
                    selected={selectedSpecialties}
                    onToggle={toggleSpecialty}
                    searchable
                    initialLimit={6}
                />
            </FilterGroup>

            {/* ── Ko'rinish Turi ── */}
            <FilterGroup title="Ko'rinish Turi" count={selectedAvailability.length}>
                <CheckboxFilterList
                    options={availabilityOptions}
                    selected={selectedAvailability}
                    onToggle={toggleAvailability}
                    initialLimit={10}
                />
            </FilterGroup>

            {/* ── Joylashuv ── */}
            {locationOptions.length > 0 && (
                <FilterGroup title="Joylashuv" count={selectedLocations.length}>
                    <CheckboxFilterList
                        options={locationOptions}
                        selected={selectedLocations}
                        onToggle={toggleLocation}
                        searchable
                        initialLimit={6}
                        renderLabel={(opt) => (
                            <>
                                <MapPin size={11} style={{ marginRight: 4, flexShrink: 0, opacity: 0.5 }} />
                                {opt.label}
                            </>
                        )}
                    />
                </FilterGroup>
            )}

            {/* ── Xizmat xususiyatlari — clinic-entered, filterable metadata ── */}
            {dynamicMetadata.map(meta => {
                const sel = metaFilters[meta.key];
                const range = (sel && !Array.isArray(sel)) ? sel : {};
                const selArr = Array.isArray(sel) ? sel : [];
                const fc = facetCounts.meta[meta.key] || { counts: {}, total: 0 };
                const activeCount = Array.isArray(sel) ? sel.length : (hasBound(range.value) ? 1 : 0);
                return (
                    <FilterGroup
                        key={meta.key}
                        title={`${meta.label}${meta.unit ? ` (${meta.unit})` : ''}`}
                        count={activeCount}
                    >
                        {meta.kind === 'patient-value' ? (
                            <div className="xp-patient-value">
                                <input
                                    type="number"
                                    className="xp-patient-value-input"
                                    placeholder={`Sizning ${meta.label.toLowerCase()}ingiz`}
                                    value={range.value ?? ''}
                                    min={meta.bounds?.lo}
                                    max={meta.bounds?.hi}
                                    onChange={(e) => setMetaValue(meta.key, e.target.value)}
                                />
                                {meta.unit && <span className="xp-patient-value-unit">{meta.unit}</span>}
                                <div className="xp-patient-value-hint">
                                    Klinikalar oraliq: {meta.bounds.lo}–{meta.bounds.hi} {meta.unit || ''}
                                </div>
                            </div>
                        ) : meta.kind === 'boolean' ? (
                            <div className="xp-filter-options">
                                {(() => {
                                    const c = fc.counts['true'] || 0;
                                    const checked = selArr.includes('true');
                                    const off = c === 0 && !checked;
                                    return (
                                        <label className="xp-filter-option" style={off ? { opacity: 0.4 } : undefined}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={off}
                                                onChange={() => toggleMeta(meta.key, 'true')}
                                            />
                                            <span className="xp-filter-option-label">Bor</span>
                                            <span className="xp-filter-option-count">{c}</span>
                                        </label>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="xp-filter-options">
                                {meta.options.map(opt => {
                                    const c = fc.counts[opt.value] || 0;
                                    const checked = selArr.includes(opt.value);
                                    const off = c === 0 && !checked;
                                    return (
                                        <label key={opt.value} className="xp-filter-option" style={off ? { opacity: 0.4 } : undefined}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={off}
                                                onChange={() => toggleMeta(meta.key, opt.value)}
                                            />
                                            <span className="xp-filter-option-label">{opt.value}</span>
                                            <span className="xp-filter-option-count">{c}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </FilterGroup>
                );
            })}

            {/* ── Narx (dual-thumb) ── */}
            <FilterGroup title="Narx" count={(priceMin !== null && priceMin > poolPriceRange.min) || (priceMax !== null && priceMax < poolPriceRange.max) ? 1 : 0}>
                <div className="xp-price-range">
                    <div className="xp-price-display">
                        <div>
                            <span className="xp-price-label">Min</span>
                            <strong>{formatPrice(effectivePriceMin)} so'm</strong>
                        </div>
                        <div className="xp-price-divider">–</div>
                        <div>
                            <span className="xp-price-label">Max</span>
                            <strong>{formatPrice(effectivePriceMax)} so'm</strong>
                        </div>
                    </div>
                    <DualRangeSlider
                        min={poolPriceRange.min}
                        max={poolPriceRange.max}
                        value={{ lo: effectivePriceMin, hi: effectivePriceMax }}
                        step={Math.max(10000, Math.round((poolPriceRange.max - poolPriceRange.min) / 50))}
                        onChange={({ lo, hi }) => {
                            setPriceMin(lo);
                            setPriceMax(hi);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </FilterGroup>

            {/* ── Reyting (pills) ── */}
            <FilterGroup title="Reyting" count={minRating > 0 ? 1 : 0}>
                <StarRatingFilter
                    value={minRating}
                    onChange={(r) => { setMinRating(r); setCurrentPage(1); }}
                    counts={ratingCounts}
                />
            </FilterGroup>
        </>
    );

    // Loading guard placed AFTER all hooks (useState/useEffect/useMemo) so the
    // hook order is identical on every render — an early return above the hooks
    // caused React error #310 ("rendered more hooks than previous render").
    if (isLoading) {
        return <BanisaLoader message="Xizmatlar yuklanmoqda..." />;
    }

    return (
        <div className="xp-page">
            <TopBar />
            <Navigation />

            {/* ── MOBILE APP HEADER (mobile only) ── */}
            <div className="xp-mobile-header">
                <button
                    className="xp-mobile-back"
                    onClick={() => navigate(-1)}
                    aria-label="Orqaga"
                >
                    <ChevronLeft size={22} />
                </button>
                <div style={{ flex: 1 }}></div>
                <button
                    className="xp-mobile-cart"
                    onClick={() => navigate('/cart')}
                    aria-label="Savat"
                >
                    <ShoppingCart size={20} />
                </button>
            </div>

            {/* ── MOBILE SEARCH & FILTER (mobile only) ── */}
            <div className="xp-mobile-search-wrap">
                <div className="xp-mobile-search">
                    <Search size={18} className="xp-mobile-search-icon" />
                    <input
                        type="text"
                        placeholder="Xizmat yoki kasallik nomi..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                    {searchQuery && (
                        <button
                            className="xp-mobile-search-clear"
                            onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                            aria-label="Tozalash"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button
                    className="xp-mobile-filter-btn-top"
                    onClick={() => setMobileFilterOpen(true)}
                >
                    <SlidersHorizontal size={16} />
                    Filtrlar
                    {activeFilters.length > 0 && (
                        <span className="xp-fd-count">{activeFilters.length}</span>
                    )}
                </button>
            </div>

            {/* ── MOBILE CATEGORY CARDS (mobile only) — Hidden when searching/filtering ── */}
            {!isSearchingOrFiltering && (
                <div className="xp-mobile-cats-section">
                    <h2 className="xp-mobile-section-title">Kategoriyalar</h2>
                    <div className="xp-mobile-cats-grid">
                        {CATEGORIES.filter(cat => cat.id !== 'all').map(cat => (
                            <Link
                                key={cat.id}
                                to={`/xizmatlar/category/${cat.id}`}
                                className={`xp-mcat-card xp-mcat-${cat.id}`}
                            >
                                <div className="xp-mcat-icon-wrap">
                                    <cat.icon size={26} />
                                </div>
                                <div className="xp-mcat-text">
                                    <span className="xp-mcat-label">{cat.label}</span>
                                    <span className="xp-mcat-count">{categoryCounts[cat.id] || 0} ta xizmat</span>
                                </div>
                                <ChevronRight size={16} className="xp-mcat-arrow" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── HOME CAROUSELS (mobile only — quick discovery shortcuts) — Hidden when searching/filtering ── */}
            {!isSearchingOrFiltering && (
                <HubCarousels services={SERVICES_DATA} isLoggedIn={!!user} onAddToCart={handleAddToCart} />
            )}

            {/* ── HERO (desktop) ── */}
            <section className="xp-hero">
                <div className="xp-hero-inner">
                    <div className="xp-breadcrumb">
                        <Home size={13} />
                        <Link to="/">Bosh Sahifa</Link>
                        <ChevronRight size={12} />
                        <strong>Xizmatlar</strong>
                    </div>
                    <h1 className="xp-hero-title">
                        BANISA <em>Tibbiy Xizmatlar</em>
                    </h1>
                    <p className="xp-hero-sub">
                        Diagnostikadan operatsiyagacha — barcha tibbiy xizmatlar bir joyda. Kerakli xizmatni toping va darhol bron qiling.
                    </p>
                    <div className="xp-hero-search">
                        <Search size={18} className="xp-hero-search-icon" />
                        <input
                            type="text"
                            placeholder="Xizmat, mutaxassis yoki kasallik nomini kiriting..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                        <button className="xp-hero-search-btn">Qidirish</button>
                    </div>
                    <div className="xp-hero-stats">
                        <div className="xp-hero-stat">
                            <strong>26+</strong>
                            <span>Xizmat turi</span>
                        </div>
                        <div className="xp-hero-stat">
                            <strong>120+</strong>
                            <span>Mutaxassis shifokor</span>
                        </div>
                        <div className="xp-hero-stat">
                            <strong>15 000+</strong>
                            <span>Mamnun bemor</span>
                        </div>
                        <div className="xp-hero-stat">
                            <strong>4.8 ★</strong>
                            <span>O'rtacha reyting</span>
                        </div>
                    </div>
                </div>
            </section>



            {/* ── TABS BAR (desktop sticky tabs) ── */}
            <div className="xp-tabs-bar">
                <div className="xp-tabs-inner">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`xp-cat-tab${activeCategory === cat.id ? ' active' : ''}`}
                            onClick={() => handleCategoryChange(cat.id)}
                        >
                            <cat.icon size={15} />
                            {cat.label}
                            <span className="xp-cat-tab-count">{categoryCounts[cat.id]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MOBILE STICKY CHIPS (mobile only — appears after scroll) ── */}
            <div className="xp-mobile-chips-bar">
                <div className="xp-mobile-chips-inner">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`xp-mchip${activeCategory === cat.id ? ' active' : ''}`}
                            onClick={() => handleCategoryChange(cat.id)}
                        >
                            <cat.icon size={13} />
                            <span>{cat.label.split(' ')[0]}</span>
                            <span className="xp-mchip-count">{categoryCounts[cat.id] || 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MAIN (full-width, horizontal filter bar) ── */}
            <div className="xp-main xp-main--wide">
                <div className="xp-content">
                    {/* ── Search (above filter bar) ── */}
                    <div className="xp-search-row">
                        <div className="xp-search-input-wrap">
                            <Search size={18} className="xp-search-icon" />
                            <input
                                type="text"
                                placeholder="Xizmat yoki kasallik nomi..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            />
                            {searchQuery && (
                                <button
                                    className="xp-search-clear"
                                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    aria-label="Tozalash"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <div className="xp-search-count">
                            <strong>{filtered.length}</strong> ta xizmat
                        </div>
                    </div>

                    {/* ── Horizontal filter bar — desktop ── */}
                    <div className="xp-fbar">
                        <div className="xp-fbar-left">
                            <FilterDropdown
                                label="Mutaxassislik"
                                count={selectedSpecialties.length}
                                width={300}
                            >
                                <CheckboxFilterList
                                    options={specialtyOptions}
                                    selected={selectedSpecialties}
                                    onToggle={toggleSpecialty}
                                    searchable
                                    initialLimit={8}
                                />
                            </FilterDropdown>

                            {locationOptions.length > 0 && (
                                <FilterDropdown
                                    label="Joylashuv"
                                    count={selectedLocations.length}
                                    width={260}
                                >
                                    <CheckboxFilterList
                                        options={locationOptions}
                                        selected={selectedLocations}
                                        onToggle={toggleLocation}
                                        searchable
                                        initialLimit={8}
                                        renderLabel={(opt) => (
                                            <>
                                                <MapPin size={11} style={{ marginRight: 4, flexShrink: 0, opacity: 0.5 }} />
                                                {opt.label}
                                            </>
                                        )}
                                    />
                                </FilterDropdown>
                            )}

                            <FilterDropdown
                                label="Narx"
                                count={(priceMin !== null && priceMin > poolPriceRange.min) || (priceMax !== null && priceMax < poolPriceRange.max) ? 1 : 0}
                                width={320}
                            >
                                <div className="xp-price-range" style={{ padding: 4 }}>
                                    <div className="xp-price-display">
                                        <div>
                                            <span className="xp-price-label">Min</span>
                                            <strong>{formatPrice(effectivePriceMin)} so'm</strong>
                                        </div>
                                        <div className="xp-price-divider">–</div>
                                        <div>
                                            <span className="xp-price-label">Max</span>
                                            <strong>{formatPrice(effectivePriceMax)} so'm</strong>
                                        </div>
                                    </div>
                                    <DualRangeSlider
                                        min={poolPriceRange.min}
                                        max={poolPriceRange.max}
                                        value={{ lo: effectivePriceMin, hi: effectivePriceMax }}
                                        step={Math.max(10000, Math.round((poolPriceRange.max - poolPriceRange.min) / 50))}
                                        onChange={({ lo, hi }) => { setPriceMin(lo); setPriceMax(hi); setCurrentPage(1); }}
                                    />
                                </div>
                            </FilterDropdown>

                            <FilterDropdown
                                label="Reyting"
                                count={minRating > 0 ? 1 : 0}
                                width={240}
                            >
                                <StarRatingFilter
                                    value={minRating}
                                    onChange={(r) => { setMinRating(r); setCurrentPage(1); }}
                                    counts={ratingCounts}
                                />
                            </FilterDropdown>

                            <FilterDropdown
                                label="Ko'rinish"
                                count={selectedAvailability.length}
                                width={220}
                            >
                                <CheckboxFilterList
                                    options={availabilityOptions}
                                    selected={selectedAvailability}
                                    onToggle={toggleAvailability}
                                    initialLimit={10}
                                />
                            </FilterDropdown>

                            {dynamicMetadata.length > 0 && (
                                <button
                                    type="button"
                                    className={`xp-adv-btn${advancedOpen ? ' open' : ''}${dynamicMetaActiveCount > 0 ? ' has-count' : ''}`}
                                    onClick={() => setAdvancedOpen(v => !v)}
                                >
                                    <SlidersHorizontal size={14} />
                                    Kengaytirilgan filtrlar
                                    {dynamicMetaActiveCount > 0 && (
                                        <span className="xp-fd-count">{dynamicMetaActiveCount}</span>
                                    )}
                                    <ChevronDown size={14} className={`xp-fd-chev${advancedOpen ? ' open' : ''}`} />
                                </button>
                            )}
                        </div>

                        <div className="xp-fbar-right">
                            <button
                                className="xp-mobile-filter-btn"
                                onClick={() => setMobileFilterOpen(true)}
                            >
                                <SlidersHorizontal size={16} />
                                Filtrlar
                                {activeFilters.length > 0 && (
                                    <span className="xp-fd-count">{activeFilters.length}</span>
                                )}
                            </button>
                            <select
                                className="xp-sort-select"
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                            >
                                {SORT_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <div className="xp-view-btns">
                                <button
                                    className={`xp-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Grid"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    className={`xp-view-btn${viewMode === 'list' ? ' active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                    title="List"
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Advanced filters panel (metadata) ── */}
                    {advancedOpen && dynamicMetadata.length > 0 && (
                        <div className="xp-adv-panel">
                            <div className="xp-adv-header">
                                <h4>Xizmat xususiyatlari</h4>
                                <button className="xp-adv-close" onClick={() => setAdvancedOpen(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="xp-adv-grid">
                                {dynamicMetadata.map(meta => {
                                    const sel = metaFilters[meta.key];
                                    const range = (sel && !Array.isArray(sel)) ? sel : {};
                                    const selArr = Array.isArray(sel) ? sel : [];
                                    const fc = facetCounts.meta[meta.key] || { counts: {}, total: 0 };
                                    // Width hint — many options → wider card so chips fit.
                                    const optsCount = meta.options?.length || 0;
                                    const sizeCls = meta.kind === 'patient-value' ? 'sm'
                                        : optsCount > 8 ? 'lg'
                                            : optsCount > 4 ? 'md'
                                                : 'sm';
                                    const isActive = (Array.isArray(sel) ? sel.length > 0 : hasBound(range.value));
                                    return (
                                        <div className={`xp-adv-card xp-adv-card--${sizeCls}${isActive ? ' xp-adv-card--active' : ''}`} key={meta.key}>
                                            <div className="xp-adv-card-title">
                                                {meta.label}{meta.unit ? ` (${meta.unit})` : ''}
                                            </div>
                                            {meta.kind === 'patient-value' ? (
                                                <div className="xp-patient-value">
                                                    <input
                                                        type="number"
                                                        className="xp-patient-value-input"
                                                        placeholder={`Sizning ${meta.label.toLowerCase()}ingiz`}
                                                        value={range.value ?? ''}
                                                        min={meta.bounds?.lo}
                                                        max={meta.bounds?.hi}
                                                        onChange={(e) => setMetaValue(meta.key, e.target.value)}
                                                    />
                                                    {meta.unit && <span className="xp-patient-value-unit">{meta.unit}</span>}
                                                    <div className="xp-patient-value-hint">
                                                        Oraliq: {meta.bounds.lo}–{meta.bounds.hi} {meta.unit || ''}
                                                    </div>
                                                </div>
                                            ) : meta.kind === 'boolean' ? (
                                                <div className="xp-filter-options">
                                                    {(() => {
                                                        const c = fc.counts['true'] || 0;
                                                        const checked = selArr.includes('true');
                                                        const off = c === 0 && !checked;
                                                        return (
                                                            <label className="xp-filter-option" style={off ? { opacity: 0.4 } : undefined}>
                                                                <input type="checkbox" checked={checked} disabled={off} onChange={() => toggleMeta(meta.key, 'true')} />
                                                                <span className="xp-filter-option-label">Bor</span>
                                                                <span className="xp-filter-option-count">{c}</span>
                                                            </label>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <CheckboxFilterList
                                                    options={meta.options.map(opt => ({ value: opt.value, label: opt.value, count: fc.counts[opt.value] || 0 }))}
                                                    selected={selArr}
                                                    onToggle={(val) => toggleMeta(meta.key, val)}
                                                    initialLimit={5}
                                                    searchable={meta.options.length > 6}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Active filter chips */}
                    {activeFilters.length > 0 && (
                        <div className="xp-active-filters">
                            {activeFilters.map(f => (
                                <span key={f.id} className="xp-active-filter-chip">
                                    {f.label}
                                    <button className="xp-chip-remove" onClick={f.onRemove}>
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            <button className="xp-clear-all-btn" onClick={clearAll}>
                                Barchasini tozalash
                            </button>
                        </div>
                    )}

                    {/* Grid */}
                    <div className={`xp-grid${viewMode === 'list' ? ' list-view' : ''}`}>
                        {isLoading ? (
                            <div className="xp-empty">
                                <div className="xp-empty-icon">
                                    <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                                <h3>Xizmatlar yuklanmoqda...</h3>
                                <p>Iltimos kuting</p>
                            </div>
                        ) : error ? (
                            <div className="xp-empty">
                                <div className="xp-empty-icon" style={{ background: '#fee', color: '#e74c3c' }}>
                                    <X size={32} />
                                </div>
                                <h3>Xatolik yuz berdi</h3>
                                <p>Xizmatlarni yuklashda muammo yuz berdi. Iltimos qaytadan urinib ko'ring.</p>
                                {error?.message && (
                                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{error.message}</p>
                                )}
                                <button
                                    className="xp-empty-reset"
                                    onClick={() => refetch()}
                                    style={{ marginTop: 16 }}
                                >
                                    Qayta yuklash
                                </button>
                            </div>
                        ) : paginated.length > 0 ? (
                            paginated.map((service, idx) => (
                                <ServiceCard
                                    key={`${service.id}-${service.clinic?.id || idx}`}
                                    service={service}
                                    listView={viewMode === 'list'}
                                    onAddToCart={handleAddToCart}
                                    isLoggedIn={!!user}
                                    favoriteIds={favoriteIds}
                                    onToggleFavorite={(args) => toggleFavMut.mutate(args)}
                                />
                            ))
                        ) : (
                            <div className="xp-empty">
                                <div className="xp-empty-icon">
                                    <Search size={32} />
                                </div>
                                <h3>Xizmat topilmadi</h3>
                                <p>Qidiruv shartlarini o'zgartiring yoki filtrlarni tozalang</p>
                                <button className="xp-empty-reset" onClick={clearAll}>
                                    Barcha filtrlarni tozalash
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <nav className="xp-pagination" aria-label="Sahifalar">
                            <div className="xp-pagination-info">
                                <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong>
                                –
                                <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</strong>
                                <span> / {filtered.length}</span>
                            </div>
                            <div className="xp-pagination-controls">
                                <button
                                    className="xp-page-btn xp-page-nav"
                                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={currentPage === 1}
                                    aria-label="Oldingi"
                                >
                                    <ChevronLeft size={16} />
                                    <span>Oldingi</span>
                                </button>
                                <div className="xp-page-numbers">
                                    {compactPages(currentPage, totalPages).map((p, i) => (
                                        p === '…' ? (
                                            <span key={`gap-${i}`} className="xp-page-gap">…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                className={`xp-page-btn${p === currentPage ? ' active' : ''}`}
                                                onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                aria-current={p === currentPage ? 'page' : undefined}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}
                                </div>
                                <button
                                    className="xp-page-btn xp-page-nav"
                                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={currentPage === totalPages}
                                    aria-label="Keyingi"
                                >
                                    <span>Keyingi</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </nav>
                    )}
                </div>
            </div>

            {/* ── MOBILE FILTER DRAWER ── */}
            <div
                className={`xp-sidebar-overlay${mobileFilterOpen ? ' open' : ''}`}
                onClick={e => e.target === e.currentTarget && setMobileFilterOpen(false)}
            >
                <div className="xp-sidebar-drawer">
                    <div className="xp-drawer-close">
                        <h3>Filtrlar</h3>
                        <button className="xp-drawer-close-btn" onClick={() => setMobileFilterOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <SidebarContent />
                    <button
                        style={{
                            width: '100%', padding: '14px', background: '#00BDE0',
                            color: '#fff', border: 'none', borderRadius: 12,
                            fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16
                        }}
                        onClick={() => setMobileFilterOpen(false)}
                    >
                        {filtered.length} ta natijani ko'rsatish
                    </button>
                </div>
            </div>

            <Footer />
        </div>
    );
}
