import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Search, MapPin, Crosshair, Loader2, X, AlertTriangle, RefreshCw,
    ChevronUp, ChevronDown, Star, Phone, ShoppingCart, Navigation,
    Maximize2, Clock, Sparkles, Share2, Plus, Minus, History,
} from 'lucide-react';
import { usePublicServices } from '../hooks/usePublicServices';
import useGeolocation, { haversineKm } from '../hooks/useGeolocation';
import { useCart } from '../contexts/CartContext';
import { useUserAuth } from '../shared/auth/UserAuthContext';
import './MapSearchPage.css';

// Fix Leaflet default icon paths in Vite builds.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TASHKENT_CENTER = [41.3111, 69.2797];

/* ─── Recent clinics (localStorage) ─────────────────────────────────────── */
const RECENT_KEY = 'banisa-recent-clinics';
const MAX_RECENT = 5;

function readRecent() {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}

function pushRecent(entry) {
    try {
        const items = readRecent().filter(x => x.clinicId !== entry.clinicId);
        items.unshift({ ...entry, at: Date.now() });
        localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
    } catch {}
}

const userIcon = L.divIcon({
    className: 'msp-user-pin',
    html: '<div class="msp-user-dot"><div class="msp-user-ring"></div></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

/** Render a clinic pin. Variants: cheapest (green badge), selected (enlarged
 *  with halo), closed (gray). A logo, if available, becomes a small avatar. */
function clinicPinIcon({ priceText, logo, cheapest, selected, closed }) {
    const cls = [
        'msp-clinic-pin__inner',
        cheapest ? 'is-cheapest' : '',
        selected ? 'is-selected' : '',
        closed ? 'is-closed' : '',
    ].filter(Boolean).join(' ');
    const avatar = logo
        ? `<div class="msp-clinic-pin__avatar"><img src="${logo}" alt="" onerror="this.style.display='none'"/></div>`
        : '';
    const flag = cheapest ? '<span class="msp-clinic-pin__flag">★</span>' : '';
    return L.divIcon({
        className: 'msp-clinic-pin',
        html: `<div class="${cls}">${avatar}<span class="msp-clinic-pin__price">${priceText}</span>${flag}</div>`,
        iconSize: selected ? [96, 38] : [82, 32],
        iconAnchor: selected ? [48, 38] : [41, 32],
    });
}

function fmt(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
}

function fullPrice(n) {
    return n != null ? `${Number(n).toLocaleString('uz-UZ')} so'm` : '—';
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Returns {isOpen: boolean|null, today: {start,end}|null}. `null` isOpen
 *  means we don't have enough info — show no badge rather than guess. */
function workingStatus(workingHours) {
    if (!workingHours) return { isOpen: null, today: null };
    const now = new Date();
    const dayKey = DAY_KEYS[now.getDay()];
    const hhmm = now.toTimeString().slice(0, 5);
    let entry = null;
    if (Array.isArray(workingHours)) {
        entry = workingHours.find(w => String(w?.day || '').toLowerCase() === dayKey) || null;
        if (!entry) return { isOpen: null, today: null };
        if (entry.isOpen === false) return { isOpen: false, today: null };
        const start = entry.openTime || entry.start;
        const end = entry.closeTime || entry.end;
        if (!start || !end) return { isOpen: null, today: null };
        return { isOpen: start <= hhmm && hhmm < end, today: { start, end } };
    }
    if (typeof workingHours === 'object') {
        entry = workingHours[dayKey] || null;
        if (!entry) return { isOpen: null, today: null };
        if (entry.isDayOff || entry.isOpen === false) return { isOpen: false, today: null };
        const start = entry.openTime || entry.start;
        const end = entry.closeTime || entry.end;
        if (!start || !end) return { isOpen: null, today: null };
        return { isOpen: start <= hhmm && hhmm < end, today: { start, end } };
    }
    return { isOpen: null, today: null };
}

function FitToBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (!points || points.length === 0) return;
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    }, [JSON.stringify(points)]);
    return null;
}

function CenterOn({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.5 });
    }, [center?.[0], center?.[1]]);
    return null;
}

/* ─── Floating map controls (zoom + recenter) ──────────────────────────── */
function MapControls({ userCoords }) {
    const map = useMap();
    const recenter = () => {
        if (userCoords) map.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 0.6 });
    };
    return (
        <div className="msp-controls">
            <button type="button" className="msp-ctrl" onClick={() => map.zoomIn()} aria-label="Kattalashtirish">
                <Plus size={16} />
            </button>
            <button type="button" className="msp-ctrl" onClick={() => map.zoomOut()} aria-label="Kichraytirish">
                <Minus size={16} />
            </button>
            <button type="button" className="msp-ctrl msp-ctrl--accent" onClick={recenter} aria-label="Mening joyim" title="Mening joyim">
                <Crosshair size={16} />
            </button>
        </div>
    );
}

/* ─── Service autocomplete (sticky top bar) ─────────────────────────────── */
function ServiceAutocomplete({ services, value, onChange, loading }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapRef = useRef(null);

    const selected = useMemo(() => services.find(s => s.serviceId === value || s.id === value), [services, value]);
    const display = selected ? selected.title : '';

    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? services.filter(s => (s.title || '').toLowerCase().includes(q) || (s.specialty || '').toLowerCase().includes(q))
            : services;
        const map = new Map();
        for (const s of filtered) {
            const key = s.serviceId || s.id;
            const cur = map.get(key);
            if (!cur || (s.price ?? Infinity) < (cur.price ?? Infinity)) {
                map.set(key, s);
            }
        }
        return Array.from(map.values()).slice(0, 30);
    }, [services, query]);

    return (
        <div className="msp-ac" ref={wrapRef}>
            <Search size={16} className="msp-ac__icon" />
            <input
                className="msp-ac__input"
                placeholder={loading ? 'Yuklanmoqda...' : (display || "Xizmat qidirish: TIBBIY KO'RIK, UZI, MRT...")}
                value={open ? query : display}
                onFocus={() => { setOpen(true); setQuery(''); }}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                disabled={loading}
            />
            {value && !loading && (
                <button type="button" className="msp-ac__clear" onClick={() => { onChange(null); setQuery(''); }} aria-label="Tozalash">
                    <X size={14} />
                </button>
            )}
            {open && (
                <div className="msp-ac__dropdown">
                    {groups.length === 0 ? (
                        <div className="msp-ac__empty">Hech narsa topilmadi</div>
                    ) : (
                        groups.map(s => (
                            <button
                                key={s.serviceId || s.id}
                                type="button"
                                className={`msp-ac__item ${(s.serviceId || s.id) === value ? 'active' : ''}`}
                                onClick={() => { onChange(s.serviceId || s.id); setOpen(false); }}
                            >
                                <div className="msp-ac__item-title">{s.title}</div>
                                <div className="msp-ac__item-sub">{s.specialty} • {s.category}</div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Permission gate (Variant A: full block) ───────────────────────────── */
function PermissionGate({ status, error, onRequest }) {
    const isDenied = status === 'denied' || status === 'unavailable' || status === 'error';
    return (
        <div className="msp-perm">
            <div className="msp-perm__card">
                <div className="msp-perm__icon">
                    {isDenied ? <AlertTriangle size={42} /> : <MapPin size={42} />}
                </div>
                <h1 className="msp-perm__title">
                    {isDenied ? 'Joyni ulashish kerak' : 'Joylashuvingizni ulashing'}
                </h1>
                <p className="msp-perm__text">
                    Yaqindagi klinikalarni topish uchun brauzer joyingizga ruxsat berishi kerak.
                </p>
                {isDenied && (
                    <ol className="msp-perm__steps">
                        <li>Brauzerning manzil chizig'idagi 🔒 (yoki 🛡) belgisini bosing</li>
                        <li>"Joylashuv" → "Ruxsat berish"ni tanlang</li>
                        <li>Sahifani yangilab, qaytadan urinib ko'ring</li>
                    </ol>
                )}
                {error && <div className="msp-perm__error">{error}</div>}
                <button type="button" className="msp-perm__btn" onClick={onRequest} disabled={status === 'prompting'}>
                    {status === 'prompting' ? (
                        <><Loader2 size={16} className="msp-spin" /> Aniqlanmoqda...</>
                    ) : isDenied ? (
                        <><RefreshCw size={16} /> Qayta urinish</>
                    ) : (
                        <><Crosshair size={16} /> Joyni ulashish</>
                    )}
                </button>
            </div>
        </div>
    );
}

/* ─── Selected clinic card (floating overlay on map) ────────────────────── */
function SelectedClinicCard({ clinic, onClose, onAdd, adding }) {
    const [shareHint, setShareHint] = useState('');
    if (!clinic) return null;
    const status = workingStatus(clinic.workingHours);
    const directionsUrl = clinic.onMap
        ? `https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`
        : null;
    const handleShare = async () => {
        const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        const text = `${clinic.clinicName} — ${clinic.title}: ${fullPrice(clinic.price)}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: clinic.clinicName, text, url });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`${text}\n${url}`);
                setShareHint('Havola nusxalandi');
                setTimeout(() => setShareHint(''), 1600);
            }
        } catch {}
    };
    return (
        <div className="msp-card" role="dialog">
            <button className="msp-card__close" onClick={onClose} aria-label="Yopish"><X size={16} /></button>
            <div className="msp-card__head">
                {clinic.logo ? (
                    <img className="msp-card__logo" src={clinic.logo} alt="" />
                ) : (
                    <div className="msp-card__logo msp-card__logo--ph">{(clinic.clinicName || '?').slice(0, 1)}</div>
                )}
                <div className="msp-card__head-text">
                    <div className="msp-card__name">{clinic.clinicName}</div>
                    <div className="msp-card__meta">
                        {clinic.rating > 0 && (
                            <span className="msp-card__rating">
                                <Star size={12} fill="#fbbf24" stroke="#fbbf24" /> {Number(clinic.rating).toFixed(1)}
                                {clinic.reviewCount > 0 && <span className="msp-card__reviews"> · {clinic.reviewCount}</span>}
                            </span>
                        )}
                        {clinic.distanceKm != null && (
                            <span className="msp-card__dist"><Navigation size={11} /> {clinic.distanceKm.toFixed(1)} km</span>
                        )}
                        {status.isOpen === true && (
                            <span className="msp-card__open"><Clock size={11} /> Hozir ochiq{status.today ? ` · ${status.today.end}` : ''}</span>
                        )}
                        {status.isOpen === false && (
                            <span className="msp-card__closed"><Clock size={11} /> Yopiq</span>
                        )}
                    </div>
                </div>
            </div>

            {clinic.address && <div className="msp-card__addr">{clinic.address}</div>}

            <div className="msp-card__price-row">
                <div>
                    <div className="msp-card__price-label">{clinic.title}</div>
                    <div className="msp-card__price-val">{fullPrice(clinic.price)}</div>
                </div>
            </div>

            <div className="msp-card__actions">
                {directionsUrl && (
                    <a className="msp-card__btn msp-card__btn--ghost" href={directionsUrl} target="_blank" rel="noopener noreferrer">
                        <Navigation size={14} /> Yo'nalish
                    </a>
                )}
                {clinic.phones?.[0] && (
                    <a className="msp-card__btn msp-card__btn--ghost" href={`tel:${clinic.phones[0]}`}>
                        <Phone size={14} /> Qo'ng'iroq
                    </a>
                )}
                <button className="msp-card__btn msp-card__btn--ghost" onClick={handleShare} title="Ulashish">
                    <Share2 size={14} /> {shareHint || 'Ulashish'}
                </button>
                <button className="msp-card__btn msp-card__btn--primary" onClick={() => onAdd(clinic)} disabled={adding}>
                    {adding ? <Loader2 size={14} className="msp-spin" /> : <ShoppingCart size={14} />} Band qilish
                </button>
            </div>
        </div>
    );
}

/* ─── Skeleton list row ─────────────────────────────────────────────────── */
function SkeletonRow() {
    return (
        <div className="msp-item msp-item--skeleton">
            <div className="msp-sk msp-sk--row1" />
            <div className="msp-sk msp-sk--row2" />
            <div className="msp-sk msp-sk--row3" />
        </div>
    );
}

/* ─── Filter & sort chips ──────────────────────────────────────────────── */
const RADIUS_CYCLE = [null, 1, 3, 5, 10];
function FilterChips({ sort, onSort, openOnly, onOpenOnly, radius, onRadius, total }) {
    const cycleRadius = () => {
        const i = RADIUS_CYCLE.indexOf(radius);
        const next = RADIUS_CYCLE[(i + 1) % RADIUS_CYCLE.length];
        onRadius(next);
    };
    return (
        <div className="msp-chips">
            <div className="msp-chips__group">
                <button className={`msp-chip ${sort === 'distance' ? 'active' : ''}`} onClick={() => onSort('distance')}>
                    <Navigation size={12} /> Eng yaqin
                </button>
                <button className={`msp-chip ${sort === 'price' ? 'active' : ''}`} onClick={() => onSort('price')}>
                    Eng arzon
                </button>
                <button className={`msp-chip ${sort === 'rating' ? 'active' : ''}`} onClick={() => onSort('rating')}>
                    <Star size={12} /> Reyting
                </button>
            </div>
            <button className={`msp-chip msp-chip--toggle ${openOnly ? 'active' : ''}`} onClick={() => onOpenOnly(!openOnly)}>
                <Clock size={12} /> Hozir ochiq
            </button>
            <button className={`msp-chip msp-chip--toggle ${radius ? 'active' : ''}`} onClick={cycleRadius} title="Masofa filtri">
                <MapPin size={12} /> {radius ? `${radius} km ichida` : 'Masofa'}
            </button>
            <span className="msp-chips__count">{total} ta</span>
        </div>
    );
}

/* ─── Main page ────────────────────────────────────────────────────────── */
export default function MapSearchPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const selectedServiceId = params.get('xizmat') || null;
    const sort = params.get('sort') || 'distance';
    const openOnly = params.get('open') === '1';
    const radius = params.get('radius') ? Number(params.get('radius')) : null;

    const { data: allServices = [], isLoading: servicesLoading } = usePublicServices();
    const { status, coords, error, request } = useGeolocation();
    const { addToCart } = useCart();
    const { user } = useUserAuth();

    const [activeClinicId, setActiveClinicId] = useState(null);
    const [listOpen, setListOpen] = useState(true);
    const [adding, setAdding] = useState(false);
    const [resetTick, setResetTick] = useState(0);
    const [recent, setRecent] = useState(() => readRecent());

    const updateParams = useCallback((patch) => {
        const next = new URLSearchParams(params);
        for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === '' || v === false) next.delete(k);
            else next.set(k, String(v));
        }
        setParams(next, { replace: true });
    }, [params, setParams]);

    const setSelectedServiceId = useCallback((id) => {
        updateParams({ xizmat: id || null });
        setActiveClinicId(null);
    }, [updateParams]);

    const setSort = useCallback((s) => updateParams({ sort: s === 'distance' ? null : s }), [updateParams]);
    const setOpenOnly = useCallback((v) => updateParams({ open: v ? '1' : null }), [updateParams]);
    const setRadius = useCallback((v) => updateParams({ radius: v || null }), [updateParams]);

    // Popular services for the empty-state quick-pick: top by clinic count.
    const popularServices = useMemo(() => {
        const counts = new Map();
        for (const s of allServices) {
            const key = s.serviceId || s.id;
            const cur = counts.get(key);
            if (!cur || s.price < cur.price) counts.set(key, { ...s, count: (cur?.count ?? 0) + 1 });
            else counts.set(key, { ...cur, count: cur.count + 1 });
        }
        return Array.from(counts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [allServices]);

    const matched = useMemo(() => {
        if (!selectedServiceId) return [];
        return allServices.filter(s => (s.serviceId || s.id) === selectedServiceId);
    }, [allServices, selectedServiceId]);

    const clinicsAll = useMemo(() => {
        if (!coords) return [];
        return matched.map(s => {
            const lat = s.clinic?.latitude;
            const lng = s.clinic?.longitude;
            const distanceKm = (lat != null && lng != null)
                ? haversineKm(coords.lat, coords.lng, lat, lng)
                : null;
            const ws = workingStatus(s.clinic?.workingHours);
            return {
                serviceRowId: s.id,
                serviceId: s.serviceId || s.id,
                category: s.category,
                title: s.title,
                price: s.price,
                rating: s.clinic?.rating ?? s.rating ?? 0,
                reviewCount: s.clinic?.reviewCount ?? s.reviews ?? 0,
                clinicId: s.clinic?.id,
                clinicName: s.clinic?.name,
                address: s.clinic?.address,
                phones: s.clinic?.phones ?? [],
                logo: s.clinic?.logo ?? null,
                workingHours: s.clinic?.workingHours ?? null,
                isOpenNow: ws.isOpen,
                lat, lng,
                distanceKm,
                onMap: lat != null && lng != null,
            };
        });
    }, [matched, coords]);

    const cheapestPrice = useMemo(() => {
        const ps = clinicsAll.map(c => c.price).filter(p => p != null);
        return ps.length ? Math.min(...ps) : null;
    }, [clinicsAll]);

    const clinics = useMemo(() => {
        let list = clinicsAll;
        if (openOnly) list = list.filter(c => c.isOpenNow === true);
        if (radius) list = list.filter(c => c.distanceKm == null || c.distanceKm <= radius);
        const sorted = [...list].sort((a, b) => {
            if (a.onMap && !b.onMap) return -1;
            if (!a.onMap && b.onMap) return 1;
            if (sort === 'price') return (a.price ?? Infinity) - (b.price ?? Infinity);
            if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
            return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        });
        return sorted;
    }, [clinicsAll, sort, openOnly, radius]);

    const mappedClinics = clinics.filter(c => c.onMap);

    const allPoints = useMemo(() => {
        const pts = mappedClinics.map(c => [c.lat, c.lng]);
        if (coords) pts.push([coords.lat, coords.lng]);
        return pts;
        // resetTick is a manual trigger to re-fit
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mappedClinics, coords, resetTick]);

    const activeClinic = activeClinicId ? clinics.find(c => c.serviceRowId === activeClinicId) : null;
    const focusCenter = activeClinic?.onMap ? [activeClinic.lat, activeClinic.lng] : null;

    // Persist last viewed clinic and refresh local state.
    useEffect(() => {
        if (!activeClinic?.clinicId) return;
        pushRecent({
            clinicId: activeClinic.clinicId,
            clinicName: activeClinic.clinicName,
            logo: activeClinic.logo,
            address: activeClinic.address,
            lastServiceId: activeClinic.serviceId,
            lastServiceTitle: activeClinic.title,
        });
        setRecent(readRecent());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClinicId]);

    const handleAddToCart = async (c) => {
        if (!user) {
            navigate('/user/login', { state: { from: '/xarita' } });
            return;
        }
        if (!c.clinicId) return;
        setAdding(true);
        let serviceType = 'DIAGNOSTIC';
        if (c.category === 'operatsiya') serviceType = 'SURGICAL';
        else if (c.category === 'sanatoriya') serviceType = 'SANATORIUM';
        else if (c.category === 'checkup') serviceType = 'CHECKUP';
        const res = await addToCart(c.clinicId, serviceType, c.serviceId, 1);
        setAdding(false);
        if (res?.success) navigate('/user/cart');
        else if (res?.message) alert(res.message);
    };

    const handleResetView = () => {
        setActiveClinicId(null);
        setResetTick(t => t + 1);
    };

    // ─── Permission block ───
    if (status !== 'granted' || !coords) {
        return <PermissionGate status={status} error={error} onRequest={request} />;
    }

    return (
        <div className="msp">
            {/* Top sticky bar */}
            <div className="msp-topbar">
                <button className="msp-back" onClick={() => navigate('/xizmatlar')} aria-label="Orqaga">
                    <ChevronUp size={18} style={{ transform: 'rotate(-90deg)' }} />
                </button>
                <ServiceAutocomplete
                    services={allServices}
                    value={selectedServiceId}
                    onChange={setSelectedServiceId}
                    loading={servicesLoading}
                />
            </div>

            {/* Map area */}
            <div className="msp-map">
                <MapContainer center={coords ? [coords.lat, coords.lng] : TASHKENT_CENTER} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* GPS accuracy circle */}
                    {coords?.accuracy != null && coords.accuracy < 5000 && (
                        <Circle
                            center={[coords.lat, coords.lng]}
                            radius={coords.accuracy}
                            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1 }}
                        />
                    )}

                    {/* User pin */}
                    {coords && (
                        <Marker position={[coords.lat, coords.lng]} icon={userIcon} />
                    )}

                    {/* Clinic pins (no Leaflet popup — using floating card instead) */}
                    {mappedClinics.map(c => (
                        <Marker
                            key={c.serviceRowId}
                            position={[c.lat, c.lng]}
                            icon={clinicPinIcon({
                                priceText: fmt(c.price),
                                logo: c.logo,
                                cheapest: cheapestPrice != null && c.price === cheapestPrice && mappedClinics.length > 1,
                                selected: activeClinicId === c.serviceRowId,
                                closed: c.isOpenNow === false,
                            })}
                            eventHandlers={{ click: () => setActiveClinicId(c.serviceRowId) }}
                            zIndexOffset={activeClinicId === c.serviceRowId ? 1000 : 0}
                        />
                    ))}

                    {/* Fit map to all pins when not focused on one */}
                    {!focusCenter && allPoints.length > 1 && <FitToBounds points={allPoints} />}
                    {focusCenter && <CenterOn center={focusCenter} zoom={15} />}

                    {/* Floating zoom + recenter controls */}
                    <MapControls userCoords={coords} />
                </MapContainer>

                {/* Reset button when focused on one clinic */}
                {activeClinic && (
                    <button className="msp-reset" onClick={handleResetView}>
                        <Maximize2 size={14} /> Hammasini ko'rsatish
                    </button>
                )}

                {/* Empty state: prompt to pick a service, with popular quick-picks */}
                {!selectedServiceId && !servicesLoading && (
                    <div className="msp-hint-overlay">
                        <div className="msp-hint-overlay__icon"><Search size={28} /></div>
                        <div className="msp-hint-overlay__title">Xizmat tanlang</div>
                        <div className="msp-hint-overlay__sub">Tepada qidiruvga xizmat nomini kiriting yoki quyidagilardan birini bosing:</div>
                        {recent.length > 0 && (
                            <div className="msp-recent">
                                <div className="msp-recent__label"><History size={11} /> So'nggi ko'rilgan</div>
                                <div className="msp-recent__items">
                                    {recent.map(r => (
                                        <button
                                            key={r.clinicId}
                                            className="msp-recent__item"
                                            onClick={() => r.lastServiceId && setSelectedServiceId(r.lastServiceId)}
                                            title={r.lastServiceTitle || ''}
                                        >
                                            {r.logo ? (
                                                <img className="msp-recent__logo" src={r.logo} alt="" />
                                            ) : (
                                                <div className="msp-recent__logo msp-recent__logo--ph">{(r.clinicName || '?').slice(0, 1)}</div>
                                            )}
                                            <span className="msp-recent__name">{r.clinicName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {popularServices.length > 0 && (
                            <div className="msp-hint-overlay__picks">
                                {popularServices.map(s => (
                                    <button
                                        key={s.serviceId || s.id}
                                        className="msp-quick-chip"
                                        onClick={() => setSelectedServiceId(s.serviceId || s.id)}
                                    >
                                        <Sparkles size={11} /> {s.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Floating selected-clinic card */}
                {activeClinic && (
                    <SelectedClinicCard
                        clinic={activeClinic}
                        onClose={() => setActiveClinicId(null)}
                        onAdd={handleAddToCart}
                        adding={adding}
                    />
                )}
            </div>

            {/* Bottom drawer (mobile) / right panel (desktop) */}
            <div className={`msp-drawer ${listOpen ? 'open' : 'closed'}`}>
                <button className="msp-drawer__handle" onClick={() => setListOpen(o => !o)}>
                    <span className="msp-drawer__handle-bar" />
                    <span className="msp-drawer__handle-label">
                        {listOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        {clinics.length} ta klinika
                    </span>
                </button>

                {selectedServiceId && clinicsAll.length > 0 && (
                    <FilterChips
                        sort={sort}
                        onSort={setSort}
                        openOnly={openOnly}
                        onOpenOnly={setOpenOnly}
                        radius={radius}
                        onRadius={setRadius}
                        total={clinics.length}
                    />
                )}

                <div className="msp-drawer__body">
                    {servicesLoading && selectedServiceId ? (
                        <>
                            <SkeletonRow /><SkeletonRow /><SkeletonRow />
                        </>
                    ) : clinics.length === 0 ? (
                        <div className="msp-empty">
                            {!selectedServiceId
                                ? 'Tepadagi qidiruvdan xizmat tanlang'
                                : openOnly
                                    ? "Hozir ochiq klinika topilmadi. Filtrni o'chirib ko'ring."
                                    : "Bu xizmatni taklif qilayotgan klinika topilmadi"}
                        </div>
                    ) : (
                        clinics.map(c => {
                            const isCheapest = cheapestPrice != null && c.price === cheapestPrice && clinics.length > 1;
                            return (
                                <div
                                    key={c.serviceRowId}
                                    className={`msp-item ${activeClinicId === c.serviceRowId ? 'active' : ''} ${!c.onMap ? 'unmapped' : ''}`}
                                    onClick={() => setActiveClinicId(c.serviceRowId)}
                                >
                                    <div className="msp-item__top">
                                        {c.logo ? (
                                            <img className="msp-item__logo" src={c.logo} alt="" />
                                        ) : (
                                            <div className="msp-item__logo msp-item__logo--ph">{(c.clinicName || '?').slice(0, 1)}</div>
                                        )}
                                        <div className="msp-item__top-text">
                                            <div className="msp-item__head">
                                                <div className="msp-item__name">{c.clinicName}</div>
                                                {c.onMap
                                                    ? (c.distanceKm != null && <span className="msp-item__dist">{c.distanceKm.toFixed(1)} km</span>)
                                                    : <span className="msp-item__dist msp-item__dist--no">xaritada yo'q</span>}
                                            </div>
                                            <div className="msp-item__sub">
                                                {c.address}
                                                {c.isOpenNow === true && <span className="msp-item__open">· Hozir ochiq</span>}
                                                {c.isOpenNow === false && <span className="msp-item__closed">· Yopiq</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="msp-item__row">
                                        <div className="msp-item__price-wrap">
                                            <strong className="msp-item__price">{fullPrice(c.price)}</strong>
                                            {isCheapest && <span className="msp-item__cheapest">Eng arzon</span>}
                                        </div>
                                        {c.rating > 0 && (
                                            <span className="msp-item__rating">
                                                <Star size={11} fill="#fbbf24" stroke="#fbbf24" /> {Number(c.rating).toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="msp-item__actions">
                                        {c.phones[0] && (
                                            <a className="msp-item__btn ghost" href={`tel:${c.phones[0]}`} onClick={e => e.stopPropagation()}>
                                                <Phone size={13} /> Qo'ng'iroq
                                            </a>
                                        )}
                                        <button
                                            className="msp-item__btn primary"
                                            onClick={(e) => { e.stopPropagation(); handleAddToCart(c); }}
                                            disabled={adding}
                                        >
                                            <ShoppingCart size={13} /> Band qilish
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
