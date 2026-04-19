import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Search, SlidersHorizontal, X, ChevronDown, ChevronRight,
    LayoutGrid, List, Star, Users, Clock, MapPin, ArrowUpRight,
    Stethoscope, Activity, Leaf, Package, Home, ChevronLeft,
    Filter, Loader2, ShoppingCart
} from 'lucide-react';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import { usePublicServices } from '../../hooks/usePublicServices';
import { useCart } from '../../contexts/CartContext';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
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
    return num.toLocaleString('uz-UZ');
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

function ServiceCard({ service, listView, onAddToCart, isLoggedIn }) {
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

function FilterGroup({ title, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="xp-filter-group">
            <div
                className={`xp-filter-group-title${!open ? ' collapsed' : ''}`}
                onClick={() => setOpen(!open)}
            >
                {title}
                <ChevronDown size={14} />
            </div>
            {open && children}
        </div>
    );
}

const ITEMS_PER_PAGE = 9;

export default function XizmatlarPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useUserAuth();
    const { addToCart } = useCart();
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState([]);
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [minRating, setMinRating] = useState(0);
    const [priceMax, setPriceMax] = useState(null); // null = use pool max
    const [sortBy, setSortBy] = useState('popular');
    const [viewMode, setViewMode] = useState('grid');
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLocations, setSelectedLocations] = useState([]);

    // Fetch real services data
    const { data: SERVICES_DATA = [], isLoading, error } = usePublicServices();

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
            // Show success notification
            const notification = document.createElement('div');
            notification.className = 'xp-cart-notification';
            notification.innerHTML = `
                <div class="xp-cart-notification-content">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Savatga qo'shildi!</span>
                </div>
            `;
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

    /* Effective priceMax — resets to pool max when null or when pool changes */
    const effectivePriceMax = priceMax ?? poolPriceRange.max;

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

    /* ── When category changes: drop stale selections & reset price ── */
    const handleCategoryChange = (id) => {
        const newPool = id === 'all' ? SERVICES_DATA : SERVICES_DATA.filter(s => s.category === id);
        const validSpecialties = new Set(newPool.map(s => s.specialty));
        const validAvailability = new Set(newPool.flatMap(s => s.availability));
        const validLocations = new Set(newPool.map(s => s.clinic?.region).filter(Boolean));
        setSelectedSpecialties(prev => prev.filter(x => validSpecialties.has(x)));
        setSelectedAvailability(prev => prev.filter(x => validAvailability.has(x)));
        setSelectedLocations(prev => prev.filter(x => validLocations.has(x)));
        setPriceMax(null);
        setMinRating(0);
        setActiveCategory(id);
        setCurrentPage(1);
    };

    /* ── FILTERED + SORTED result list ── */
    const filtered = useMemo(() => {
        let list = [...categoryPool];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s =>
                s.title.toLowerCase().includes(q) ||
                s.desc.toLowerCase().includes(q) ||
                (SPECIALTY_LABELS[s.specialty] || s.specialty).toLowerCase().includes(q)
            );
        }
        if (selectedSpecialties.length) {
            list = list.filter(s => selectedSpecialties.includes(s.specialty));
        }
        if (selectedAvailability.length) {
            list = list.filter(s =>
                s.availability.some(a => selectedAvailability.includes(a))
            );
        }
        if (selectedLocations.length) {
            list = list.filter(s => s.clinic?.region && selectedLocations.includes(s.clinic.region));
        }
        if (minRating > 0) {
            list = list.filter(s => s.rating >= minRating);
        }
        list = list.filter(s => s.price <= effectivePriceMax);

        switch (sortBy) {
            case 'price_asc': list.sort((a, b) => a.price - b.price); break;
            case 'price_desc': list.sort((a, b) => b.price - a.price); break;
            case 'rating': list.sort((a, b) => b.rating - a.rating); break;
            case 'name': list.sort((a, b) => a.title.localeCompare(b.title)); break;
            default: list.sort((a, b) => b.reviews - a.reviews);
        }
        return list;
    }, [categoryPool, searchQuery, selectedSpecialties, selectedAvailability, selectedLocations, minRating, effectivePriceMax, sortBy]);

    /* ── pagination ── */
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
    if (minRating > 0) activeFilters.push({ id: 'rating', label: `${minRating}+ yulduz`, onRemove: () => { setMinRating(0); setCurrentPage(1); } });
    if (priceMax !== null && priceMax < poolPriceRange.max) activeFilters.push({ id: 'price', label: `≤ ${formatPrice(priceMax)} so'm`, onRemove: () => { setPriceMax(null); setCurrentPage(1); } });

    const clearSidebarFilters = () => {
        setSearchQuery('');
        setSelectedSpecialties([]);
        setSelectedAvailability([]);
        setSelectedLocations([]);
        setMinRating(0);
        setPriceMax(null);
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

    /* ── Rating counts from pool (before rating filter) ── */
    const ratingCounts = useMemo(() => {
        const poolBeforeRating = categoryPool.filter(s => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                if (!s.title.toLowerCase().includes(q) && !s.desc.toLowerCase().includes(q) &&
                    !(SPECIALTY_LABELS[s.specialty] || s.specialty).toLowerCase().includes(q)) return false;
            }
            if (selectedSpecialties.length && !selectedSpecialties.includes(s.specialty)) return false;
            if (selectedAvailability.length && !s.availability.some(a => selectedAvailability.includes(a))) return false;
            return s.price <= effectivePriceMax;
        });
        return {
            5: poolBeforeRating.filter(s => s.rating >= 5).length,
            4: poolBeforeRating.filter(s => s.rating >= 4).length,
            3: poolBeforeRating.filter(s => s.rating >= 3).length,
            0: poolBeforeRating.length,
        };
    }, [categoryPool, searchQuery, selectedSpecialties, selectedAvailability, effectivePriceMax]);

    const SidebarContent = () => (
        <>
            <div className="xp-filter-header">
                <h3><Filter size={16} /> Filtrlar</h3>
                {activeFilters.length > 0 && (
                    <button className="xp-filter-clear" onClick={clearSidebarFilters}>Tozalash</button>
                )}
            </div>

            {/* ── Mutaxassislik — only shows specialties present in current pool ── */}
            <FilterGroup title={`Mutaxassislik (${dynamicSpecialties.length})`}>
                <div className="xp-filter-options">
                    {dynamicSpecialties.map(sp => (
                        <label key={sp.id} className="xp-filter-option">
                            <input
                                type="checkbox"
                                checked={selectedSpecialties.includes(sp.id)}
                                onChange={() => toggleSpecialty(sp.id)}
                            />
                            <span className="xp-filter-option-label">{sp.label}</span>
                            <span className="xp-filter-option-count">{sp.count}</span>
                        </label>
                    ))}
                </div>
            </FilterGroup>

            {/* ── Ko'rinish Turi — only shows types present in current pool ── */}
            <FilterGroup title="Ko'rinish Turi">
                <div className="xp-filter-options">
                    {dynamicAvailability.map(av => (
                        <label key={av.id} className="xp-filter-option">
                            <input
                                type="checkbox"
                                checked={selectedAvailability.includes(av.id)}
                                onChange={() => toggleAvailability(av.id)}
                            />
                            <span className="xp-filter-option-label">{av.label}</span>
                            <span className="xp-filter-option-count">{av.count}</span>
                        </label>
                    ))}
                </div>
            </FilterGroup>

            {/* ── Joylashuv — region filter from real clinic data ── */}
            {dynamicLocations.length > 0 && (
                <FilterGroup title="Joylashuv (Viloyat)">
                    <div className="xp-filter-options">
                        {dynamicLocations.map(loc => (
                            <label key={loc.id} className="xp-filter-option">
                                <input
                                    type="checkbox"
                                    checked={selectedLocations.includes(loc.id)}
                                    onChange={() => toggleLocation(loc.id)}
                                />
                                <span className="xp-filter-option-label">
                                    <MapPin size={11} style={{ marginRight: 4, flexShrink: 0 }} />
                                    {loc.label}
                                </span>
                                <span className="xp-filter-option-count">{loc.count}</span>
                            </label>
                        ))}
                    </div>
                </FilterGroup>
            )}

            {/* ── Narx Diapazoni — bounds adapt to current pool ── */}
            <FilterGroup title="Narx Diapazoni">
                <div className="xp-price-range">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7a99', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>{formatPrice(poolPriceRange.min)} so'm</span>
                        <span style={{ fontWeight: 700, color: '#031B4E' }}>{formatPrice(effectivePriceMax)} so'm</span>
                    </div>
                    <input
                        type="range"
                        className="xp-price-slider"
                        min={poolPriceRange.min}
                        max={poolPriceRange.max}
                        step={Math.max(10000, Math.round((poolPriceRange.max - poolPriceRange.min) / 50))}
                        value={effectivePriceMax}
                        style={{ '--pct': `${pricePct}%` }}
                        onChange={e => { setPriceMax(Number(e.target.value)); setCurrentPage(1); }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#b0bdd0', marginTop: 6 }}>
                        <span>Min: {formatPrice(poolPriceRange.min)}</span>
                        <span>Max: {formatPrice(poolPriceRange.max)}</span>
                    </div>
                </div>
            </FilterGroup>

            {/* ── Minimal Reyting — with live counts ── */}
            <FilterGroup title="Minimal Reyting">
                <div className="xp-rating-options">
                    {[5, 4, 3, 0].map(r => (
                        <label key={r} className="xp-rating-option">
                            <input
                                type="radio"
                                name="rating"
                                checked={minRating === r}
                                onChange={() => { setMinRating(r); setCurrentPage(1); }}
                            />
                            {r > 0 ? (
                                <>
                                    <StarRating rating={r} />
                                    <span className="xp-rating-label">va yuqori</span>
                                    <span className="xp-filter-option-count">{ratingCounts[r]}</span>
                                </>
                            ) : (
                                <>
                                    <span className="xp-rating-label">Barchasi</span>
                                    <span className="xp-filter-option-count">{ratingCounts[0]}</span>
                                </>
                            )}
                        </label>
                    ))}
                </div>
            </FilterGroup>
        </>
    );

    return (
        <div className="xp-page">
            <TopBar />
            <Navigation />

            {/* ── HERO ── */}
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

            {/* ── TABS BAR ── */}
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

            {/* ── MAIN ── */}
            <div className="xp-main">
                {/* Sidebar — desktop */}
                <aside className="xp-sidebar">
                    <SidebarContent />
                </aside>

                {/* Content */}
                <div className="xp-content">
                    {/* Toolbar */}
                    <div className="xp-toolbar">
                        <span className="xp-results-count">
                            <strong>{filtered.length}</strong> ta xizmat topildi
                        </span>
                        <div className="xp-toolbar-right">
                            <button
                                className="xp-mobile-filter-btn"
                                onClick={() => setMobileFilterOpen(true)}
                            >
                                <SlidersHorizontal size={16} />
                                Filtrlar
                                {activeFilters.length > 0 && (
                                    <span style={{
                                        background: '#00BDE0', color: '#fff',
                                        borderRadius: '50%', width: 18, height: 18,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700
                                    }}>{activeFilters.length}</span>
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
                                    title="Grid ko'rinish"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    className={`xp-view-btn${viewMode === 'list' ? ' active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                    title="List ko'rinish"
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

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
                            </div>
                        ) : paginated.length > 0 ? (
                            paginated.map((service, idx) => (
                                <ServiceCard
                                    key={`${service.id}-${service.clinic?.id || idx}`}
                                    service={service}
                                    listView={viewMode === 'list'}
                                    onAddToCart={handleAddToCart}
                                    isLoggedIn={!!user}
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
                        <div className="xp-pagination">
                            <button
                                className={`xp-page-btn${currentPage === 1 ? ' disabled' : ''}`}
                                onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    className={`xp-page-btn${p === currentPage ? ' active' : ''}`}
                                    onClick={() => setCurrentPage(p)}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                className={`xp-page-btn${currentPage === totalPages ? ' disabled' : ''}`}
                                onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
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
