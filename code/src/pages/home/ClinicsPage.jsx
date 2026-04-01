import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Grid3X3, List, ChevronRight, MapPin, Star, CalendarCheck, LayoutDashboard } from 'lucide-react';
import { usePublicClinics } from '../../hooks/usePublicClinics';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import { useAuth } from '../../shared/auth/AuthContext';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import './css/ClinicsPage.css';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const CLINIC_TYPE_LABELS = {
    GENERAL: 'Umumiy klinika',
    SPECIALIZED: 'Ixtisoslashgan',
    DIAGNOSTIC: 'Diagnostika',
    DENTAL: 'Tish klinikasi',
    MATERNITY: "Tug'ruqxona",
    REHABILITATION: 'Reabilitatsiya',
    PHARMACY: 'Dorixona',
    OTHER: 'Boshqa',
};

const CATEGORY_TABS = [
    { id: '', label: 'Barchasi' },
    { id: 'GENERAL', label: 'Umumiy' },
    { id: 'SPECIALIZED', label: 'Ixtisoslashgan' },
    { id: 'DIAGNOSTIC', label: 'Diagnostika' },
    { id: 'DENTAL', label: 'Stomatologiya' },
    { id: 'MATERNITY', label: "Tug'ruqxona" },
    { id: 'REHABILITATION', label: 'Reabilitatsiya' },
];

const CITIES = [
    "Toshkent", "Samarqand", "Buxoro", "Namangan", "Andijon",
    "Farg'ona", "Navoiy", "Qarshi", "Nukus", "Urganch",
];

const RATING_OPTIONS = [
    { value: null, label: 'Barchasi' },
    { value: 3, label: '3+ yulduz' },
    { value: 4, label: '4+ yulduz' },
    { value: 4.5, label: '4.5+ yulduz' },
];

function imgUrl(src) {
    if (!src) return null;
    if (src.startsWith('/uploads')) return `http://localhost:5000${src}`;
    return src;
}

// Handles both { schedule: { monday:... } } nested format and flat format
function computeIsOpen(workingHours) {
    if (!workingHours) return null;
    const wh = workingHours.schedule ?? workingHours;
    if (Object.keys(wh).length === 0) return null;
    const now = new Date();
    const todayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const day = wh[todayKey];
    if (!day) return null;
    const isDayOff = day.isDayOff !== undefined ? day.isDayOff : (day.isWorking !== undefined ? !day.isWorking : false);
    if (isDayOff) return false;
    const openStr = day.open ?? day.start ?? '08:00';
    const closeStr = day.close ?? day.end ?? '18:00';
    const [oh, om] = openStr.split(':').map(Number);
    const [ch, cm] = closeStr.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

// ── CLINIC CARD (Grid) ────────────────────────────────────────────────────────

function ClinicCard({ clinic, onClick, isPatient, onBook }) {
    const logo = imgUrl(clinic.logo);
    const cover = imgUrl(clinic.coverImage);

    return (
        <div className="cp-card" onClick={onClick}>
            <div className="cp-card-cover">
                {cover ? (
                    <img src={cover} alt={clinic.nameUz} />
                ) : (
                    <div className="cp-card-cover-gradient">
                        {clinic.nameUz?.slice(0, 2).toUpperCase()}
                    </div>
                )}
                {logo ? (
                    <img src={logo} alt="" className="cp-card-logo" />
                ) : (
                    <div className="cp-card-logo-placeholder">{clinic.nameUz?.[0]}</div>
                )}
                <span className="cp-card-type-badge" style={{ color: '#1a103d' }}>
                    {CLINIC_TYPE_LABELS[clinic.type] || clinic.type}
                </span>
            </div>

            <div className="cp-card-body">
                <div className="cp-card-name">{clinic.nameUz}</div>
                <div className="cp-card-rating">
                    <span className="star">★</span>
                    <span className="val">{(clinic.averageRating || 0).toFixed(1)}</span>
                    <span>({clinic.reviewCount || 0} sharh)</span>
                </div>
                <div className="cp-card-address">
                    <MapPin size={12} />
                    {[clinic.district, clinic.region].filter(Boolean).join(', ')}
                </div>
                <div className="cp-card-tags">
                    {clinic.serviceCount > 0 && (
                        <span className="cp-card-tag diagnostic">🔬 {clinic.serviceCount} xizmat</span>
                    )}
                    {clinic.hasEmergency && <span className="cp-card-tag surgical">🚑 Tez yordam</span>}
                    {clinic.hasOnlineBooking && <span className="cp-card-tag checkup">🌐 Onlayn bron</span>}
                </div>
            </div>

            <div className="cp-card-footer">
                {(() => {
                    const open = computeIsOpen(clinic.workingHours) ?? clinic.isOpen;
                    return (
                        <span className={open ? 'cp-open-badge' : 'cp-closed-badge'}>
                            {open ? 'Hozir ochiq' : 'Yopiq'}
                        </span>
                    );
                })()}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {isPatient && clinic.hasOnlineBooking && (
                        <button
                            className="cp-book-btn"
                            onClick={e => { e.stopPropagation(); onBook(clinic.id); }}
                        >
                            <CalendarCheck size={13} /> Bron
                        </button>
                    )}
                    <button className="cp-details-btn">
                        Batafsil <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── CLINIC LIST ITEM ──────────────────────────────────────────────────────────

function ClinicListItem({ clinic, onClick }) {
    const logo = imgUrl(clinic.logo);

    return (
        <div className="cp-list-item" onClick={onClick}>
            {logo ? (
                <img src={logo} alt={clinic.nameUz} className="cp-list-logo" />
            ) : (
                <div className="cp-list-logo-placeholder">{clinic.nameUz?.slice(0, 2)}</div>
            )}

            <div className="cp-list-body">
                <div className="cp-list-name">{clinic.nameUz}</div>
                <div className="cp-list-meta">
                    <span><span className="star" style={{ color: '#f59e0b' }}>★</span> {(clinic.averageRating || 0).toFixed(1)} ({clinic.reviewCount || 0} sharh)</span>
                    <span><MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {[clinic.district, clinic.region].filter(Boolean).join(', ')}</span>
                    <span>🏥 {CLINIC_TYPE_LABELS[clinic.type] || clinic.type}</span>
                </div>
                <div className="cp-list-tags">
                    {clinic.serviceCount > 0 && <span className="cp-card-tag diagnostic">🔬 {clinic.serviceCount} xizmat</span>}
                    {clinic.hasEmergency && <span className="cp-card-tag surgical">🚑 Tez yordam</span>}
                    {clinic.hasOnlineBooking && <span className="cp-card-tag checkup">🌐 Onlayn bron</span>}
                </div>
            </div>

            <div className="cp-list-right">
                {(() => {
                    const open = computeIsOpen(clinic.workingHours) ?? clinic.isOpen;
                    return (
                        <span className={open ? 'cp-open-badge' : 'cp-closed-badge'}>
                            {open ? 'Hozir ochiq' : 'Yopiq'}
                        </span>
                    );
                })()}
                <button className="cp-list-detail-btn">Batafsil →</button>
            </div>
        </div>
    );
}

// ── SKELETON ──────────────────────────────────────────────────────────────────

function SkeletonGrid() {
    return (
        <div className="cp-skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="cp-skeleton-card">
                    <div className="cp-skeleton-cover" />
                    <div className="cp-skeleton-body">
                        <div className="cp-skeleton-line medium" />
                        <div className="cp-skeleton-line short" />
                        <div className="cp-skeleton-line medium" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── SIDEBAR FILTERS ───────────────────────────────────────────────────────────

function Sidebar({ filters, updateFilter, clearAllFilters }) {
    return (
        <div className="cp-sidebar-card">
            <div className="cp-sidebar-header">
                <span className="cp-sidebar-title">🔍 Filterlar</span>
                <button className="cp-clear-btn" onClick={clearAllFilters}>Tozalash</button>
            </div>

            {/* City */}
            <div className="cp-filter-group">
                <div className="cp-filter-group-title">Shahar / Viloyat</div>
                <select
                    value={filters.city}
                    onChange={e => updateFilter('city', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'Poppins, sans-serif', color: '#374151', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="">Barcha shaharlar</option>
                    {CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
            </div>

            {/* Clinic type */}
            <div className="cp-filter-group">
                <div className="cp-filter-group-title">Klinika turi</div>
                <div className="cp-filter-options">
                    {Object.entries(CLINIC_TYPE_LABELS).map(([key, label]) => (
                        <label key={key} className="cp-filter-option">
                            <input
                                type="checkbox"
                                checked={filters.type === key}
                                onChange={e => updateFilter('type', e.target.checked ? key : '')}
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Rating */}
            <div className="cp-filter-group">
                <div className="cp-filter-group-title">Reyting</div>
                <div className="cp-filter-options">
                    {RATING_OPTIONS.map(opt => (
                        <label key={String(opt.value)} className="cp-filter-option">
                            <input
                                type="radio"
                                name="rating"
                                checked={filters.rating === opt.value}
                                onChange={() => updateFilter('rating', opt.value)}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Toggles */}
            <div className="cp-filter-group">
                <div className="cp-filter-group-title">Qo'shimcha</div>
                <div className="cp-filter-options">
                    {[
                        { key: 'isOpen', label: 'Hozir ochiq' },
                        { key: 'hasEmergency', label: 'Tez yordam bor' },
                    ].map(({ key, label }) => (
                        <div key={key} className="cp-filter-toggle" onClick={() => updateFilter(key, !filters[key])}>
                            <span>{label}</span>
                            <div className={`cp-toggle-switch ${filters[key] ? 'on' : ''}`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function ClinicsPage() {
    const navigate = useNavigate();
    const { user: patientUser } = useUserAuth();
    const { user: clinicUser } = useAuth();
    const isPatient = !!patientUser;
    const isClinicAdmin = clinicUser?.role === 'CLINIC_ADMIN';
    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        city: '',
        type: '',
        rating: null,
        isOpen: false,
        hasEmergency: false,
        sort: 'rating',
        page: 1,
        limit: 12,
    });
    const [viewMode, setViewMode] = useState('grid');
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const { data, isLoading } = usePublicClinics(filters);
    const clinics = data?.data ?? [];
    const meta = data?.meta ?? {};

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    const clearAllFilters = () => {
        setFilters(prev => ({
            ...prev,
            search: '', city: '', type: '',
            rating: null, isOpen: false, hasEmergency: false,
            page: 1,
        }));
        setSearchInput('');
    };

    // Active filter chips
    const chips = [
        filters.search && { id: 'search', label: `"${filters.search}"`, onRemove: () => { setSearchInput(''); updateFilter('search', ''); } },
        filters.city && { id: 'city', label: filters.city, onRemove: () => updateFilter('city', '') },
        filters.type && { id: 'type', label: CLINIC_TYPE_LABELS[filters.type], onRemove: () => updateFilter('type', '') },
        filters.rating != null && { id: 'rating', label: `${filters.rating}+ yulduz`, onRemove: () => updateFilter('rating', null) },
        filters.isOpen && { id: 'isOpen', label: 'Hozir ochiq', onRemove: () => updateFilter('isOpen', false) },
        filters.hasEmergency && { id: 'emergency', label: 'Tez yordam', onRemove: () => updateFilter('hasEmergency', false) },
    ].filter(Boolean);

    // Pagination
    const totalPages = meta.totalPages || 1;
    const currentPage = filters.page;

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const pages = [];
        for (let i = 1; i <= Math.min(totalPages, 7); i++) pages.push(i);
        return (
            <div className="cp-pagination">
                <button
                    className="cp-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => updateFilter('page', currentPage - 1)}
                >
                    ‹
                </button>
                {pages.map(p => (
                    <button
                        key={p}
                        className={`cp-page-btn ${p === currentPage ? 'active' : ''}`}
                        onClick={() => updateFilter('page', p)}
                    >
                        {p}
                    </button>
                ))}
                {totalPages > 7 && <span style={{ color: '#9ca3af', padding: '0 4px' }}>...</span>}
                {totalPages > 7 && (
                    <button
                        className={`cp-page-btn ${totalPages === currentPage ? 'active' : ''}`}
                        onClick={() => updateFilter('page', totalPages)}
                    >
                        {totalPages}
                    </button>
                )}
                <button
                    className="cp-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => updateFilter('page', currentPage + 1)}
                >
                    ›
                </button>
            </div>
        );
    };

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />

            {/* ── HERO ── */}
            <section className="cp-hero">
                <div className="home-container">
                    <div className="cp-hero-inner">
                        <div className="cp-breadcrumb">
                            <Link to="/">Bosh sahifa</Link>
                            <ChevronRight size={14} />
                            <span>Klinikalar</span>
                        </div>
                        <h1 className="cp-hero-title">O'zbekistondagi Eng Yaxshi Klinikalar</h1>
                        <p className="cp-hero-subtitle">Tasdiqlangan klinikalar, haqiqiy sharhlar, ishonchli xizmatlar</p>

                        <div className="cp-hero-search">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Klinika nomi yoki manzilni kiriting..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                            />
                            <button className="cp-hero-search-btn">Qidirish</button>
                        </div>

                        <div className="cp-hero-stats">
                            <div className="cp-hero-stat">
                                <span className="cp-hero-stat-num">{meta.total || '...'}</span>
                                <span className="cp-hero-stat-label">Klinika</span>
                            </div>
                            <div className="cp-hero-stat">
                                <span className="cp-hero-stat-num">4.8★</span>
                                <span className="cp-hero-stat-label">O'rtacha reyting</span>
                            </div>
                            <div className="cp-hero-stat">
                                <span className="cp-hero-stat-num">50,000+</span>
                                <span className="cp-hero-stat-label">Bemor</span>
                            </div>
                            <div className="cp-hero-stat">
                                <span className="cp-hero-stat-num">24/7</span>
                                <span className="cp-hero-stat-label">Yordam</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CATEGORY TABS ── */}
            <div className="cp-tabs-bar">
                <div className="home-container">
                    <div className="cp-tabs-inner">
                        {CATEGORY_TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`cp-cat-tab ${filters.type === tab.id ? 'active' : ''}`}
                                onClick={() => updateFilter('type', tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="cp-main">
                <div className="home-container">
                    <div className="cp-layout">

                        {/* ── SIDEBAR ── */}
                        <aside className="cp-sidebar">
                            <Sidebar
                                filters={filters}
                                updateFilter={updateFilter}
                                clearAllFilters={clearAllFilters}
                            />
                        </aside>

                        {/* ── CONTENT ── */}
                        <div className="cp-content">

                            {/* Toolbar */}
                            <div className="cp-toolbar">
                                <span className="cp-total-label">
                                    <strong>{isLoading ? '...' : (meta.total || 0)}</strong> ta klinika topildi
                                </span>
                                <div className="cp-toolbar-right">
                                    {/* Mobile filter button */}
                                    <button
                                        className="cp-mobile-filter-btn"
                                        onClick={() => setMobileFilterOpen(true)}
                                    >
                                        <SlidersHorizontal size={16} /> Filterlar
                                        {chips.length > 0 && (
                                            <span style={{
                                                background: '#00BDE0', color: 'white',
                                                borderRadius: '50%', width: 18, height: 18,
                                                display: 'inline-flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: 11, fontWeight: 700,
                                            }}>
                                                {chips.length}
                                            </span>
                                        )}
                                    </button>

                                    <select
                                        className="cp-sort-select"
                                        value={filters.sort}
                                        onChange={e => updateFilter('sort', e.target.value)}
                                    >
                                        <option value="rating">Reyting</option>
                                        <option value="name">Nomi A-Z</option>
                                        <option value="newest">Yangi</option>
                                    </select>

                                    <div className="cp-view-toggle">
                                        <button
                                            className={`cp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                            onClick={() => setViewMode('grid')}
                                            title="Grid"
                                        >
                                            <Grid3X3 size={16} />
                                        </button>
                                        <button
                                            className={`cp-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                            onClick={() => setViewMode('list')}
                                            title="List"
                                        >
                                            <List size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Role banner ── */}
                            {(isPatient || isClinicAdmin) && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 16px', marginBottom: 16,
                                    borderRadius: 10, fontSize: 13, fontWeight: 500,
                                    background: isClinicAdmin ? 'rgba(109,40,217,0.06)' : 'rgba(29,191,193,0.07)',
                                    border: `1px solid ${isClinicAdmin ? 'rgba(109,40,217,0.2)' : 'rgba(29,191,193,0.25)'}`,
                                    color: isClinicAdmin ? '#6d28d9' : '#0891b2',
                                }}>
                                    <span>
                                        {isClinicAdmin
                                            ? `🏥 Klinika admin sifatida ko'rmoqdasiz`
                                            : `👋 Xush kelibsiz, ${patientUser.firstName}! Klinikalarni ko'rib chiqing.`
                                        }
                                    </span>
                                    {isClinicAdmin && (
                                        <Link
                                            to="/clinic/dashboard"
                                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#6d28d9', textDecoration: 'none' }}
                                        >
                                            <LayoutDashboard size={14} /> Paneliga o'tish
                                        </Link>
                                    )}
                                </div>
                            )}

                            {/* Active filter chips */}
                            {chips.length > 0 && (
                                <div className="cp-filter-chips">
                                    {chips.map(chip => (
                                        <span key={chip.id} className="cp-chip">
                                            {chip.label}
                                            <button className="cp-chip-remove" onClick={chip.onRemove}>×</button>
                                        </span>
                                    ))}
                                    <button className="cp-clear-btn" onClick={clearAllFilters}>
                                        Hammasini tozalash
                                    </button>
                                </div>
                            )}

                            {/* Content */}
                            {isLoading ? (
                                <SkeletonGrid />
                            ) : clinics.length === 0 ? (
                                <div className="cp-empty">
                                    <div className="cp-empty-icon">🏥</div>
                                    <h3>Klinika topilmadi</h3>
                                    <p>Qidiruv parametrlarini o'zgartiring yoki filterni tozalang</p>
                                    <button className="cp-empty-btn" onClick={clearAllFilters}>
                                        Filterni tozalash
                                    </button>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="cp-grid">
                                    {clinics.map(clinic => (
                                        <ClinicCard
                                            key={clinic.id}
                                            clinic={clinic}
                                            onClick={() => navigate(`/klinikalar/${clinic.id}`)}
                                            isPatient={isPatient}
                                            onBook={(id) => navigate(`/klinikalar/${id}`)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="cp-list">
                                    {clinics.map(clinic => (
                                        <ClinicListItem
                                            key={clinic.id}
                                            clinic={clinic}
                                            onClick={() => navigate(`/klinikalar/${clinic.id}`)}
                                        />
                                    ))}
                                </div>
                            )}

                            {!isLoading && renderPagination()}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />

            {/* ── MOBILE FILTER DRAWER ── */}
            {mobileFilterOpen && (
                <>
                    <div className="cp-mobile-overlay" onClick={() => setMobileFilterOpen(false)} />
                    <div className="cp-mobile-drawer open">
                        <div className="cp-mobile-drawer-header">
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a103d' }}>Filterlar</span>
                            <button
                                onClick={() => setMobileFilterOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <Sidebar
                            filters={filters}
                            updateFilter={(k, v) => { updateFilter(k, v); }}
                            clearAllFilters={() => { clearAllFilters(); setMobileFilterOpen(false); }}
                        />
                        <div style={{ marginTop: 20 }}>
                            <button
                                onClick={() => setMobileFilterOpen(false)}
                                style={{
                                    width: '100%', padding: '14px', background: '#00BDE0',
                                    color: 'white', border: 'none', borderRadius: 50, fontSize: 15,
                                    fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                Ko'rsatish ({meta.total || 0})
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
