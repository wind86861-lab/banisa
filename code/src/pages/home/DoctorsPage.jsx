import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, SlidersHorizontal, Star, MapPin, Award,
    Stethoscope, Building2, ChevronRight, X, Sparkles,
    Loader2, ArrowDownAZ,
} from 'lucide-react';
import api from '../../shared/api/axios';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import './css/DoctorsPage.css';

const fmtPrice = (n) => (Number(n) || 0).toLocaleString('uz-UZ');

const REGIONS = [
    'Toshkent', 'Samarqand', 'Buxoro', 'Namangan', 'Andijon',
    "Farg'ona", 'Navoiy', 'Qarshi', 'Nukus', 'Urganch',
];

const SORT_OPTIONS = [
    { key: 'rating', label: 'Reyting bo\'yicha' },
    { key: 'experience', label: 'Tajriba bo\'yicha' },
    { key: 'price', label: 'Narx bo\'yicha' },
];

const RATING_MIN = [
    { value: 0, label: 'Barchasi' },
    { value: 3, label: '3+' },
    { value: 4, label: '4+' },
    { value: 4.5, label: '4.5+' },
];

function DoctorCard({ doctor }) {
    const initials = `${doctor.firstName[0]}${doctor.lastName[0]}`.toUpperCase();
    const priceLabel = doctor.priceFrom
        ? doctor.priceFrom === doctor.priceTo
            ? `${fmtPrice(doctor.priceFrom)} so'm`
            : `${fmtPrice(doctor.priceFrom)} — ${fmtPrice(doctor.priceTo)} so'm`
        : 'Narx kelishilgan';

    return (
        <motion.div
            className="docs-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            <Link to={`/doktorlar/${doctor.id}`} className="docs-card__inner">
                <div className="docs-card__head">
                    {doctor.photoUrl ? (
                        <img src={doctor.photoUrl} alt={doctor.firstName} className="docs-card__avatar" />
                    ) : (
                        <div className="docs-card__avatar docs-card__avatar--initials">{initials}</div>
                    )}
                    <div className="docs-card__title-block">
                        <div className="docs-card__name">{doctor.firstName} {doctor.lastName}</div>
                        <div className="docs-card__spec">
                            <Stethoscope size={11} /> {doctor.specialtyName || 'Doktor'}
                        </div>
                    </div>
                    <div className={`docs-card__rating ${doctor.reviewCount === 0 ? 'docs-card__rating--new' : ''}`}>
                        <Star size={11} fill={doctor.reviewCount > 0 ? '#fbbf24' : 'none'} color="#fbbf24" />
                        <span>{doctor.reviewCount > 0 ? doctor.averageRating.toFixed(1) : 'Yangi'}</span>
                    </div>
                </div>

                <div className="docs-card__meta">
                    {doctor.yearsExperience != null && (
                        <span className="docs-card__chip">
                            <Award size={11} /> {doctor.yearsExperience} yil tajriba
                        </span>
                    )}
                    <span className="docs-card__chip">
                        <Building2 size={11} /> {doctor.clinicCount} klinika
                    </span>
                    {doctor.reviewCount > 0 && (
                        <span className="docs-card__chip">
                            {doctor.reviewCount} ta sharh
                        </span>
                    )}
                </div>

                <div className="docs-card__price-row">
                    <div>
                        <div className="docs-card__price-lbl">Konsultatsiya</div>
                        <div className="docs-card__price-val">{priceLabel}</div>
                    </div>
                    <div className="docs-card__cta">
                        <span>Batafsil</span>
                        <ChevronRight size={14} />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

export default function DoctorsPage() {
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState(params.get('q') || '');
    const [showFilters, setShowFilters] = useState(false);

    const specialtyId = params.get('specialty') || '';
    const region = params.get('region') || '';
    const minRating = parseFloat(params.get('minRating') || '0') || 0;
    const sort = params.get('sort') || 'rating';
    const page = parseInt(params.get('page') || '1', 10) || 1;

    const setParam = (k, v) => {
        const next = new URLSearchParams(params);
        if (v == null || v === '' || v === 0) next.delete(k);
        else next.set(k, String(v));
        if (k !== 'page') next.delete('page'); // reset pagination on filter change
        setParams(next, { replace: true });
    };

    useEffect(() => {
        const t = setTimeout(() => setParam('q', search), 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const { data: specs = [] } = useQuery({
        queryKey: ['public', 'specialties'],
        queryFn: async () => (await api.get('/public/specialties')).data?.data?.items ?? [],
    });

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['public', 'doctors', { search, specialtyId, region, minRating, sort, page }],
        queryFn: async () => (await api.get('/public/doctors', {
            params: {
                search: search || undefined,
                specialtyId: specialtyId || undefined,
                region: region || undefined,
                minRating: minRating || undefined,
                sort,
                page,
                pageSize: 20,
            },
        })).data?.data,
        keepPreviousData: true,
    });

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const activeFilters = [
        specialtyId && specs.find((s) => s.id === specialtyId)?.nameUz,
        region && region,
        minRating > 0 && `${minRating}+ ⭐`,
    ].filter(Boolean);

    const clearAll = () => {
        setSearch('');
        setParams(new URLSearchParams(), { replace: true });
    };

    return (
        <div className="docs-page-wrap">
            <TopBar />
            <Navigation />

            <main className="docs-page">
                <motion.header
                    className="docs-hero"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="docs-hero__bg" />
                    <div className="docs-hero__inner">
                        <div>
                            <h1 className="docs-hero__title">Doktorlar katalogi</h1>
                            <p className="docs-hero__sub">
                                Tajribali shifokorlarni mutaxassislik va reyting bo'yicha tanlang
                            </p>
                        </div>
                        <div className="docs-hero__count">
                            <Sparkles size={14} /> {total} doktor
                        </div>
                    </div>
                </motion.header>

                <div className="docs-search-row">
                    <div className="docs-search">
                        <Search size={16} />
                        <input
                            placeholder="Ism, mutaxassislik..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="docs-search__clear">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        className={`docs-filter-btn ${showFilters ? 'docs-filter-btn--on' : ''}`}
                        onClick={() => setShowFilters((s) => !s)}
                    >
                        <SlidersHorizontal size={14} />
                        Filterlar
                        {activeFilters.length > 0 && <span className="docs-filter-badge">{activeFilters.length}</span>}
                    </button>
                    <select
                        className="docs-select"
                        value={sort}
                        onChange={(e) => setParam('sort', e.target.value)}
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            className="docs-filters"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="docs-filters__group">
                                <div className="docs-filters__label">Mutaxassislik</div>
                                <div className="docs-chips">
                                    <button
                                        className={`docs-chip ${!specialtyId ? 'docs-chip--on' : ''}`}
                                        onClick={() => setParam('specialty', '')}
                                    >
                                        Barchasi
                                    </button>
                                    {specs.map((s) => (
                                        <button
                                            key={s.id}
                                            className={`docs-chip ${specialtyId === s.id ? 'docs-chip--on' : ''}`}
                                            onClick={() => setParam('specialty', s.id)}
                                        >
                                            {s.nameUz}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="docs-filters__group">
                                <div className="docs-filters__label">Hudud</div>
                                <div className="docs-chips">
                                    <button
                                        className={`docs-chip ${!region ? 'docs-chip--on' : ''}`}
                                        onClick={() => setParam('region', '')}
                                    >
                                        Barchasi
                                    </button>
                                    {REGIONS.map((r) => (
                                        <button
                                            key={r}
                                            className={`docs-chip ${region === r ? 'docs-chip--on' : ''}`}
                                            onClick={() => setParam('region', r)}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="docs-filters__group">
                                <div className="docs-filters__label">Reyting</div>
                                <div className="docs-chips">
                                    {RATING_MIN.map((r) => (
                                        <button
                                            key={r.value}
                                            className={`docs-chip ${minRating === r.value ? 'docs-chip--on' : ''}`}
                                            onClick={() => setParam('minRating', r.value)}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {activeFilters.length > 0 && (
                                <button className="docs-clear-all" onClick={clearAll}>
                                    <X size={12} /> Hamma filterlarni tozalash
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {isLoading ? (
                    <div className="docs-grid">
                        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="docs-skel" />)}
                    </div>
                ) : items.length === 0 ? (
                    <div className="docs-empty">
                        <Stethoscope size={56} color="#cbd5e1" />
                        <h3>Doktor topilmadi</h3>
                        <p>Qidiruv shartlarini o'zgartirib qaytadan urinib ko'ring</p>
                        {activeFilters.length > 0 && (
                            <button className="docs-btn" onClick={clearAll}>Filterlarni tozalash</button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="docs-grid">
                            <AnimatePresence>
                                {items.map((d) => <DoctorCard key={d.id} doctor={d} />)}
                            </AnimatePresence>
                        </div>

                        {totalPages > 1 && (
                            <div className="docs-pager">
                                <button
                                    className="docs-pg-btn"
                                    disabled={page <= 1}
                                    onClick={() => setParam('page', page - 1)}
                                >Oldingi</button>
                                <span>Sahifa {page} / {totalPages}</span>
                                <button
                                    className="docs-pg-btn"
                                    disabled={page >= totalPages}
                                    onClick={() => setParam('page', page + 1)}
                                >Keyingi</button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}
