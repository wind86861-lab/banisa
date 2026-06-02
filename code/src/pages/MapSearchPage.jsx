import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Search, MapPin, Crosshair, Loader2, X, AlertTriangle, RefreshCw,
    ChevronUp, ChevronDown, Star, Phone, ShoppingCart, Filter,
} from 'lucide-react';
import api from '../shared/api/axios';
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

const userIcon = L.divIcon({
    className: 'msp-user-pin',
    html: '<div class="msp-user-dot"><div class="msp-user-ring"></div></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

function priceLabelIcon(priceText) {
    return L.divIcon({
        className: 'msp-clinic-pin',
        html: `<div class="msp-clinic-pin__inner"><span class="msp-clinic-pin__price">${priceText}</span></div>`,
        iconSize: [76, 28],
        iconAnchor: [38, 28],
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

/* ─── Service autocomplete (sticky top bar) ─────────────────────────────── */
function ServiceAutocomplete({ services, value, onChange }) {
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
        // Dedupe by serviceId (one row per distinct service); keep min price.
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
                placeholder={display || "Xizmat qidirish: TIBBIY KO'RIK, UZI, MRT..."}
                value={open ? query : display}
                onFocus={() => { setOpen(true); setQuery(''); }}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            />
            {value && (
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

/* ─── Main page ────────────────────────────────────────────────────────── */
export default function MapSearchPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const selectedServiceId = params.get('xizmat') || null;

    const { data: allServices = [], isLoading: servicesLoading } = usePublicServices();
    const { status, coords, error, request } = useGeolocation();
    const { addToCart } = useCart();
    const { user } = useUserAuth();

    const [activeClinicId, setActiveClinicId] = useState(null);
    const [listOpen, setListOpen] = useState(true);
    const [adding, setAdding] = useState(false);

    const setSelectedServiceId = useCallback((id) => {
        if (id) setParams({ xizmat: id }, { replace: true });
        else setParams({}, { replace: true });
        setActiveClinicId(null);
    }, [setParams]);

    // Clinics that offer the selected service (with coordinates).
    const matched = useMemo(() => {
        if (!selectedServiceId) return [];
        return allServices.filter(s => (s.serviceId || s.id) === selectedServiceId);
    }, [allServices, selectedServiceId]);

    const clinics = useMemo(() => {
        if (!coords) return [];
        return matched
            .map(s => {
                const lat = s.clinic?.latitude;
                const lng = s.clinic?.longitude;
                const distanceKm = (lat != null && lng != null)
                    ? haversineKm(coords.lat, coords.lng, lat, lng)
                    : null;
                return {
                    serviceRowId: s.id,
                    serviceId: s.serviceId || s.id,
                    category: s.category,
                    title: s.title,
                    price: s.price,
                    rating: s.rating ?? null,
                    clinicId: s.clinic?.id,
                    clinicName: s.clinic?.name,
                    address: s.clinic?.address,
                    phones: s.clinic?.phones ?? [],
                    lat, lng,
                    distanceKm,
                    onMap: lat != null && lng != null,
                };
            })
            .sort((a, b) => {
                if (a.onMap && !b.onMap) return -1;
                if (!a.onMap && b.onMap) return 1;
                return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
            });
    }, [matched, coords]);

    const mappedClinics = clinics.filter(c => c.onMap);
    const unmappedClinics = clinics.filter(c => !c.onMap);

    const allPoints = useMemo(() => {
        const pts = mappedClinics.map(c => [c.lat, c.lng]);
        if (coords) pts.push([coords.lat, coords.lng]);
        return pts;
    }, [mappedClinics, coords]);

    const activeClinic = activeClinicId ? clinics.find(c => c.serviceRowId === activeClinicId) : null;
    const focusCenter = activeClinic?.onMap ? [activeClinic.lat, activeClinic.lng] : null;

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
                />
            </div>

            {/* Map area */}
            <div className="msp-map">
                <MapContainer center={coords ? [coords.lat, coords.lng] : TASHKENT_CENTER} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* User pin */}
                    {coords && (
                        <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
                            <Popup>Sizning joyingiz</Popup>
                        </Marker>
                    )}

                    {/* Clinic pins */}
                    {mappedClinics.map(c => (
                        <Marker
                            key={c.serviceRowId}
                            position={[c.lat, c.lng]}
                            icon={priceLabelIcon(fmt(c.price))}
                            eventHandlers={{ click: () => setActiveClinicId(c.serviceRowId) }}
                        >
                            <Popup>
                                <div className="msp-popup">
                                    <div className="msp-popup__name">{c.clinicName}</div>
                                    <div className="msp-popup__row">
                                        <strong>{fullPrice(c.price)}</strong>
                                        {c.distanceKm != null && <span>• {c.distanceKm.toFixed(1)} km</span>}
                                    </div>
                                    {c.rating > 0 && (
                                        <div className="msp-popup__row">
                                            <Star size={12} fill="#fbbf24" stroke="#fbbf24" /> {Number(c.rating).toFixed(1)}
                                        </div>
                                    )}
                                    <button className="msp-popup__btn" onClick={() => handleAddToCart(c)} disabled={adding}>
                                        <ShoppingCart size={14} /> Band qilish
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Fit map to all pins */}
                    {!focusCenter && allPoints.length > 1 && <FitToBounds points={allPoints} />}
                    {focusCenter && <CenterOn center={focusCenter} zoom={15} />}
                </MapContainer>

                {!selectedServiceId && !servicesLoading && (
                    <div className="msp-hint-overlay">
                        <Search size={26} />
                        <div className="msp-hint-overlay__title">Xizmat tanlang</div>
                        <div className="msp-hint-overlay__sub">Tepada qidiruvga xizmat nomini kiriting</div>
                    </div>
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
                <div className="msp-drawer__body">
                    {clinics.length === 0 ? (
                        <div className="msp-empty">
                            {selectedServiceId
                                ? 'Bu xizmatni taklif qilayotgan klinika topilmadi'
                                : 'Tepadagi qidiruvdan xizmat tanlang'}
                        </div>
                    ) : (
                        clinics.map(c => (
                            <div
                                key={c.serviceRowId}
                                className={`msp-item ${activeClinicId === c.serviceRowId ? 'active' : ''} ${!c.onMap ? 'unmapped' : ''}`}
                                onClick={() => setActiveClinicId(c.serviceRowId)}
                            >
                                <div className="msp-item__head">
                                    <div className="msp-item__name">{c.clinicName}</div>
                                    {c.onMap ? (
                                        c.distanceKm != null && <span className="msp-item__dist">{c.distanceKm.toFixed(1)} km</span>
                                    ) : (
                                        <span className="msp-item__dist msp-item__dist--no">xaritada yo'q</span>
                                    )}
                                </div>
                                <div className="msp-item__sub">{c.address}</div>
                                <div className="msp-item__row">
                                    <strong className="msp-item__price">{fullPrice(c.price)}</strong>
                                    {c.rating > 0 && (
                                        <span className="msp-item__rating">
                                            <Star size={11} fill="#fbbf24" stroke="#fbbf24" /> {Number(c.rating).toFixed(1)}
                                        </span>
                                    )}
                                </div>
                                <div className="msp-item__actions">
                                    {c.phones[0] && (
                                        <a className="msp-item__btn ghost" href={`tel:${c.phones[0]}`} onClick={e => e.stopPropagation()}>
                                            <Phone size={13} /> {c.phones[0]}
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
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
