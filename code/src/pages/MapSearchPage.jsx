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
 *  with halo), closed (gray). A logo, if available, becomes a small avatar.
 *  In service mode we also stamp a small rating badge above the pin. */
function clinicPinIcon({ priceText, logo, cheapest, selected, closed, rating, showRatingBadge }) {
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
    const ratingBadge = (showRatingBadge && rating > 0)
        ? `<span class="msp-clinic-pin__rating">★ ${Number(rating).toFixed(1)}</span>`
        : '';
    return L.divIcon({
        className: 'msp-clinic-pin',
        html: `<div class="${cls}">${avatar}<span class="msp-clinic-pin__price">${priceText}</span>${flag}${ratingBadge}</div>`,
        iconSize: selected ? [96, 50] : [82, 44],
        iconAnchor: selected ? [48, 50] : [41, 44],
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

/* ─── Service multi-select autocomplete ─────────────────────────────────── */
function ServiceAutocomplete({ services, selectedIds, onAdd, onRemove, onClear, loading }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    // Unique services by serviceId, cheapest variant kept for display.
    const uniqueServices = useMemo(() => {
        const map = new Map();
        for (const s of services) {
            const key = s.serviceId || s.id;
            const cur = map.get(key);
            if (!cur || (s.price ?? Infinity) < (cur.price ?? Infinity)) map.set(key, s);
        }
        return Array.from(map.values());
    }, [services]);

    const selectedServices = useMemo(() =>
        uniqueServices.filter(s => selectedSet.has(s.serviceId || s.id)),
        [uniqueServices, selectedSet]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); } };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? uniqueServices.filter(s => (s.title || '').toLowerCase().includes(q) || (s.specialty || '').toLowerCase().includes(q))
            : uniqueServices;
        return filtered.slice(0, 40);
    }, [uniqueServices, query]);

    const placeholder = loading
        ? 'Yuklanmoqda...'
        : selectedServices.length === 0
            ? "Xizmat qidiring: UZI, MRT, ko'rik..."
            : 'Yana xizmat qo\'shish...';

    return (
        <div className={`msp-ac msp-ac--multi ${selectedServices.length > 0 ? 'has-chips' : ''}`} ref={wrapRef}>
            <Search size={16} className="msp-ac__icon" />
            <div className="msp-ac__chips" onClick={() => inputRef.current?.focus()}>
                {selectedServices.map(s => {
                    const id = s.serviceId || s.id;
                    return (
                        <span key={id} className="msp-ac__chip" title={s.title}>
                            <span className="msp-ac__chip-text">{s.title}</span>
                            <button type="button" className="msp-ac__chip-x" onClick={(e) => { e.stopPropagation(); onRemove(id); }} aria-label={`${s.title} olib tashlash`}>
                                <X size={12} />
                            </button>
                        </span>
                    );
                })}
                <input
                    ref={inputRef}
                    className="msp-ac__input"
                    placeholder={selectedServices.length === 0 ? placeholder : (open ? placeholder : '')}
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    disabled={loading}
                />
            </div>
            {selectedServices.length > 0 && !loading && (
                <button type="button" className="msp-ac__clear" onClick={() => { onClear(); setQuery(''); }} aria-label="Hammasini tozalash">
                    <X size={14} />
                </button>
            )}
            {open && (
                <div className="msp-ac__dropdown">
                    <div className="msp-ac__dd-head">
                        <span className="msp-ac__dd-headtext">
                            {selectedServices.length > 0
                                ? `${selectedServices.length} ta tanlangan`
                                : 'Xizmatni tanlang'}
                        </span>
                        <button type="button" className="msp-ac__dd-close" onClick={() => { setOpen(false); inputRef.current?.blur(); }} aria-label="Yopish">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="msp-ac__dd-list">
                        {suggestions.length === 0 ? (
                            <div className="msp-ac__empty">Hech narsa topilmadi</div>
                        ) : (
                            suggestions.map(s => {
                                const id = s.serviceId || s.id;
                                const isPicked = selectedSet.has(id);
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`msp-ac__item ${isPicked ? 'active' : ''}`}
                                        onClick={() => {
                                            if (isPicked) onRemove(id);
                                            else onAdd(id);
                                            setQuery('');
                                            inputRef.current?.focus();
                                        }}
                                    >
                                        <div className="msp-ac__item-title">
                                            {isPicked && <span className="msp-ac__item-tick">✓</span>} {s.title}
                                        </div>
                                        <div className="msp-ac__item-sub">{s.specialty} • {s.category}</div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    {selectedServices.length > 0 && (
                        <div className="msp-ac__dd-foot">
                            <button type="button" className="msp-ac__dd-clear" onClick={() => { onClear(); setQuery(''); }}>
                                Tozalash
                            </button>
                            <button type="button" className="msp-ac__dd-done" onClick={() => { setOpen(false); inputRef.current?.blur(); }}>
                                Tayyor ({selectedServices.length})
                            </button>
                        </div>
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
function SelectedClinicCard({ clinic, browseMode, onClose, onAdd, onOpenClinic, adding }) {
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
                        {clinic.rating > 0 ? (
                            <span className="msp-card__rating">
                                <Star size={12} fill="#fbbf24" stroke="#fbbf24" /> {Number(clinic.rating).toFixed(1)}
                                {clinic.reviewCount > 0 && <span className="msp-card__reviews"> · {clinic.reviewCount}</span>}
                            </span>
                        ) : (
                            <span className="msp-card__rating msp-card__rating--new">
                                <Sparkles size={11} /> Yangi
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
                {browseMode ? (
                    <div>
                        <div className="msp-card__price-label">Ko'rib chiqish</div>
                        <div className="msp-card__price-val">{clinic.matchCount || 0} ta xizmat</div>
                    </div>
                ) : (
                    <div>
                        <div className="msp-card__price-label">
                            {clinic.title}{clinic.matchCount > 1 ? ` +${clinic.matchCount - 1}` : ''}
                        </div>
                        <div className="msp-card__price-val">{fullPrice(clinic.price)}</div>
                    </div>
                )}
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
                {browseMode ? (
                    <button className="msp-card__btn msp-card__btn--primary" onClick={() => onOpenClinic(clinic)}>
                        <ShoppingCart size={14} /> Xizmatlar
                    </button>
                ) : (
                    <button className="msp-card__btn msp-card__btn--primary" onClick={() => onAdd(clinic)} disabled={adding}>
                        {adding ? <Loader2 size={14} className="msp-spin" /> : <ShoppingCart size={14} />} Band qilish
                    </button>
                )}
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
    // Multi-select: csv list in `xizmatlar`, backward-compat with legacy `xizmat`.
    const selectedServiceIds = useMemo(() => {
        const csv = params.get('xizmatlar');
        const legacy = params.get('xizmat');
        const list = csv ? csv.split(',').filter(Boolean) : (legacy ? [legacy] : []);
        return Array.from(new Set(list));
    }, [params]);
    const sort = params.get('sort') || 'distance';
    const openOnly = params.get('open') === '1';
    const radius = params.get('radius') ? Number(params.get('radius')) : null;
    const browseMode = selectedServiceIds.length === 0;

    const { data: allServices = [], isLoading: servicesLoading } = usePublicServices();
    const { status, coords, error, request } = useGeolocation();
    const { addToCart } = useCart();
    const { user, waitForUser } = useUserAuth();

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

    const writeSelected = useCallback((ids) => {
        const csv = ids.length ? ids.join(',') : null;
        updateParams({ xizmatlar: csv, xizmat: null });
        setActiveClinicId(null);
    }, [updateParams]);

    const addSelectedService = useCallback((id) => {
        if (!id || selectedServiceIds.includes(id)) return;
        writeSelected([...selectedServiceIds, id]);
    }, [selectedServiceIds, writeSelected]);

    const removeSelectedService = useCallback((id) => {
        writeSelected(selectedServiceIds.filter(x => x !== id));
    }, [selectedServiceIds, writeSelected]);

    const clearSelectedServices = useCallback(() => writeSelected([]), [writeSelected]);

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

    // Services we care about: either user-selected, or all if browsing.
    const matched = useMemo(() => {
        if (browseMode) return allServices;
        const set = new Set(selectedServiceIds);
        return allServices.filter(s => set.has(s.serviceId || s.id));
    }, [allServices, selectedServiceIds, browseMode]);

    // Group services by clinic: one row per clinic with the cheapest matching
    // service surfaced. In browse mode we still surface the clinic's cheapest
    // service overall, so the pin/list has a meaningful representative entry.
    const clinicsAll = useMemo(() => {
        if (!coords) return [];
        const byClinic = new Map();
        for (const s of matched) {
            if (!s.clinic?.id) continue;
            const cid = s.clinic.id;
            const cur = byClinic.get(cid);
            if (!cur) {
                byClinic.set(cid, { rep: s, count: 1, totalPrice: s.price ?? null });
            } else {
                cur.count += 1;
                if ((s.price ?? Infinity) < (cur.rep.price ?? Infinity)) cur.rep = s;
            }
        }
        return Array.from(byClinic.values()).map(({ rep, count }) => {
            const lat = rep.clinic?.latitude;
            const lng = rep.clinic?.longitude;
            const distanceKm = (lat != null && lng != null)
                ? haversineKm(coords.lat, coords.lng, lat, lng)
                : null;
            const ws = workingStatus(rep.clinic?.workingHours);
            return {
                serviceRowId: rep.id,
                serviceId: rep.serviceId || rep.id,
                category: rep.category,
                title: rep.title,
                price: rep.price,
                matchCount: count,
                rating: rep.clinic?.rating ?? rep.rating ?? 0,
                reviewCount: rep.clinic?.reviewCount ?? rep.reviews ?? 0,
                clinicId: rep.clinic?.id,
                clinicName: rep.clinic?.name,
                address: rep.clinic?.address,
                phones: rep.clinic?.phones ?? [],
                logo: rep.clinic?.logo ?? null,
                workingHours: rep.clinic?.workingHours ?? null,
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
        const resolved = await waitForUser();
        if (!resolved) {
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

    const handleOpenClinic = (c) => {
        if (c?.clinicId) navigate(`/klinikalar/${c.clinicId}`);
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
                    selectedIds={selectedServiceIds}
                    onAdd={addSelectedService}
                    onRemove={removeSelectedService}
                    onClear={clearSelectedServices}
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
                    {mappedClinics.map(c => {
                        const priceText = browseMode
                            ? (c.rating > 0 ? `★ ${Number(c.rating).toFixed(1)}` : 'Klinika')
                            : fmt(c.price);
                        return (
                            <Marker
                                key={c.serviceRowId}
                                position={[c.lat, c.lng]}
                                icon={clinicPinIcon({
                                    priceText,
                                    logo: c.logo,
                                    cheapest: !browseMode && cheapestPrice != null && c.price === cheapestPrice && mappedClinics.length > 1,
                                    selected: activeClinicId === c.serviceRowId,
                                    closed: c.isOpenNow === false,
                                    rating: c.rating,
                                    showRatingBadge: !browseMode,
                                })}
                                eventHandlers={{ click: () => setActiveClinicId(c.serviceRowId) }}
                                zIndexOffset={activeClinicId === c.serviceRowId ? 1000 : 0}
                            />
                        );
                    })}

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

                {/* Floating quick-pick row (browse mode only). Non-blocking: map stays usable. */}
                {browseMode && !servicesLoading && (recent.length > 0 || popularServices.length > 0) && (
                    <div className="msp-quickbar">
                        {recent.length > 0 && (
                            <div className="msp-quickbar__group">
                                <span className="msp-quickbar__label"><History size={11} /> So'nggi</span>
                                {recent.slice(0, 3).map(r => r.lastServiceId && (
                                    <button
                                        key={r.clinicId}
                                        className="msp-quick-chip msp-quick-chip--recent"
                                        onClick={() => addSelectedService(r.lastServiceId)}
                                        title={r.lastServiceTitle || ''}
                                    >
                                        {r.logo && <img src={r.logo} alt="" className="msp-quick-chip__logo" />}
                                        {r.lastServiceTitle || r.clinicName}
                                    </button>
                                ))}
                            </div>
                        )}
                        {popularServices.length > 0 && (
                            <div className="msp-quickbar__group">
                                <span className="msp-quickbar__label"><Sparkles size={11} /> Mashhur</span>
                                {popularServices.slice(0, 6).map(s => (
                                    <button
                                        key={s.serviceId || s.id}
                                        className="msp-quick-chip"
                                        onClick={() => addSelectedService(s.serviceId || s.id)}
                                    >
                                        {s.title}
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
                        browseMode={browseMode}
                        onClose={() => setActiveClinicId(null)}
                        onAdd={handleAddToCart}
                        onOpenClinic={handleOpenClinic}
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

                {clinicsAll.length > 0 && (
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
                    {servicesLoading ? (
                        <>
                            <SkeletonRow /><SkeletonRow /><SkeletonRow />
                        </>
                    ) : clinics.length === 0 ? (
                        <div className="msp-empty">
                            {openOnly || radius
                                ? "Filtr bo'yicha klinika topilmadi. Filtrlarni o'chirib ko'ring."
                                : browseMode
                                    ? "Klinikalar topilmadi"
                                    : "Tanlangan xizmatni taklif qilayotgan klinika topilmadi"}
                        </div>
                    ) : (
                        clinics.map(c => {
                            const isCheapest = !browseMode && cheapestPrice != null && c.price === cheapestPrice && clinics.length > 1;
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
                                            {browseMode ? (
                                                <strong className="msp-item__price msp-item__price--browse">{c.matchCount} ta xizmat</strong>
                                            ) : (
                                                <>
                                                    <strong className="msp-item__price">{fullPrice(c.price)}</strong>
                                                    {c.matchCount > 1 && <span className="msp-item__more">+{c.matchCount - 1}</span>}
                                                    {isCheapest && <span className="msp-item__cheapest">Eng arzon</span>}
                                                </>
                                            )}
                                        </div>
                                        {c.rating > 0 ? (
                                            <span className="msp-item__rating">
                                                <Star size={11} fill="#fbbf24" stroke="#fbbf24" /> {Number(c.rating).toFixed(1)}
                                                {c.reviewCount > 0 && <span className="msp-item__reviews"> · {c.reviewCount}</span>}
                                            </span>
                                        ) : (
                                            <span className="msp-item__rating msp-item__rating--new">Yangi</span>
                                        )}
                                    </div>
                                    <div className="msp-item__actions">
                                        {c.phones[0] && (
                                            <a className="msp-item__btn ghost" href={`tel:${c.phones[0]}`} onClick={e => e.stopPropagation()}>
                                                <Phone size={13} /> Qo'ng'iroq
                                            </a>
                                        )}
                                        {browseMode ? (
                                            <button
                                                className="msp-item__btn primary"
                                                onClick={(e) => { e.stopPropagation(); handleOpenClinic(c); }}
                                            >
                                                <ShoppingCart size={13} /> Xizmatlar
                                            </button>
                                        ) : (
                                            <button
                                                className="msp-item__btn primary"
                                                onClick={(e) => { e.stopPropagation(); handleAddToCart(c); }}
                                                disabled={adding}
                                            >
                                                <ShoppingCart size={13} /> Band qilish
                                            </button>
                                        )}
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
