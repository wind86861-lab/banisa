import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ambulance, Phone, MapPin, Filter, X, AlertTriangle,
    Activity, CheckCircle2, Wrench, Power, Users, Heart, Baby,
    Sparkles, Navigation as NavIcon, Search,
} from 'lucide-react';
import api from '../../shared/api/axios';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import './css/SkoryPage.css';

const TASHKENT_CENTER = [41.2995, 69.2401];

const TYPE_META = {
    BASIC:          { label: 'Umumiy',          color: '#06b6d4' },
    INTENSIVE_CARE: { label: 'Reanimatsiya',    color: '#ef4444' },
    NEONATAL:       { label: "Yangi tug'ilgan", color: '#ec4899' },
    CARDIAC:        { label: 'Yurak',           color: '#dc2626' },
    TRAUMA:         { label: 'Travmatologiya',  color: '#f97316' },
    OBSTETRIC:      { label: "Tug'ruq",         color: '#a855f7' },
};

const STATUS_META = {
    AVAILABLE: { label: "Bo'sh", color: '#10b981' },
    BUSY:      { label: 'Bandda', color: '#f59e0b' },
    MAINTENANCE: { label: 'Tex. xizmat', color: '#6366f1' },
    OFFLINE:   { label: "O'chiq", color: '#94a3b8' },
};

function ambulanceIcon(status, type, distanceKm) {
    const sc = STATUS_META[status]?.color || '#94a3b8';
    const tc = TYPE_META[type]?.color || '#06b6d4';
    const pulse = status === 'AVAILABLE' ? 'sky-pulse' : '';
    return L.divIcon({
        className: 'sky-pin',
        html: `
            <div class="sky-pin__wrap ${pulse}">
                <div class="sky-pin__core" style="background:${sc};box-shadow:0 6px 16px -4px ${sc}88;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="8" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>
                </div>
                ${distanceKm != null ? `<div class="sky-pin__dist">${distanceKm.toFixed(1)}km</div>` : ''}
            </div>
        `,
        iconSize: [60, 50],
        iconAnchor: [30, 36],
    });
}

const userIcon = L.divIcon({
    className: 'sky-user-pin',
    html: `<div class="sky-user-dot"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

function FitBounds({ items, userCoords }) {
    const map = useMap();
    useEffect(() => {
        if (items.length === 0 && !userCoords) return;
        const pts = items.filter((i) => i.latitude && i.longitude).map((i) => [i.latitude, i.longitude]);
        if (userCoords) pts.push([userCoords.lat, userCoords.lng]);
        if (pts.length === 0) return;
        if (pts.length === 1) {
            map.setView(pts[0], 14);
        } else {
            map.fitBounds(pts, { padding: [60, 60], maxZoom: 14 });
        }
    }, [items.length, userCoords?.lat, userCoords?.lng]);
    return null;
}

const REGIONS = [
    'Toshkent', 'Samarqand', 'Buxoro', 'Namangan', 'Andijon',
    "Farg'ona", 'Navoiy', 'Qarshi', 'Nukus', 'Urganch',
];
const TYPES = Object.keys(TYPE_META);
const EQUIPMENT = [
    { key: 'defibrillator', label: 'Defibrillator' },
    { key: 'ventilator',    label: 'Ventilyator' },
    { key: 'monitor',       label: 'Monitor' },
    { key: 'ekg',           label: 'EKG' },
    { key: 'oxygen',        label: 'Kislorod' },
    { key: 'incubator',     label: 'Inkubator' },
];

function AmbulanceDetailModal({ amb, onClose }) {
    if (!amb) return null;
    const tm = TYPE_META[amb.type] || TYPE_META.BASIC;
    const sm = STATUS_META[amb.status] || STATUS_META.OFFLINE;
    const phones = amb.dispatchPhone
        ? [amb.dispatchPhone, ...(amb.clinic.phones || [])]
        : (amb.clinic.phones || []);

    return (
        <AnimatePresence>
            <motion.div
                className="sky-modal-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="sky-modal"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ y: 14, scale: 0.97, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 14, scale: 0.97, opacity: 0 }}
                >
                    <button className="sky-modal__close" onClick={onClose}><X size={18} /></button>

                    <div className="sky-modal__hero" style={{ background: `linear-gradient(135deg, ${sm.color}dd, ${sm.color}aa)` }}>
                        {amb.photoUrl ? (
                            <img
                                src={amb.photoUrl}
                                alt={amb.callSign}
                                className="sky-modal__photo"
                            />
                        ) : (
                            <Ambulance size={32} color="#fff" />
                        )}
                        <div className="sky-modal__call">{amb.callSign}</div>
                        <div className="sky-modal__type" style={{ background: '#ffffff2a' }}>
                            {tm.label} • {sm.label}
                        </div>
                    </div>

                    <div className="sky-modal__body">
                        <div className="sky-modal__grid">
                            <div className="sky-modal__mini">
                                <div className="sky-modal__lbl">Sig'im</div>
                                <div className="sky-modal__val"><Users size={13} /> {amb.capacity}</div>
                            </div>
                            <div className="sky-modal__mini">
                                <div className="sky-modal__lbl">Model</div>
                                <div className="sky-modal__val">{amb.vehicleModel || '—'}</div>
                            </div>
                            <div className="sky-modal__mini">
                                <div className="sky-modal__lbl">Davlat raqami</div>
                                <div className="sky-modal__val">{amb.licensePlate || '—'}</div>
                            </div>
                            {amb.distanceKm != null && (
                                <div className="sky-modal__mini">
                                    <div className="sky-modal__lbl">Masofa</div>
                                    <div className="sky-modal__val"><NavIcon size={13} /> {amb.distanceKm.toFixed(1)} km</div>
                                </div>
                            )}
                        </div>

                        {amb.equipment && amb.equipment.length > 0 && (
                            <div className="sky-modal__section">
                                <div className="sky-modal__sec-title">Jihozlar</div>
                                <div className="sky-equip-row">
                                    {amb.equipment.map((e) => (
                                        <span key={e} className="sky-equip-chip">
                                            <Sparkles size={10} /> {e}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="sky-modal__section">
                            <div className="sky-modal__sec-title">
                                <MapPin size={11} /> Klinika
                            </div>
                            <div className="sky-clinic-block">
                                <div className="sky-clinic-block__name">{amb.clinic.name}</div>
                                <div className="sky-clinic-block__addr">
                                    {amb.clinic.region}, {amb.clinic.district}
                                </div>
                            </div>
                        </div>

                        {(amb.baseFee || amb.pricePerKm) && (
                            <div className="sky-modal__section">
                                <div className="sky-modal__sec-title">Narx</div>
                                <div style={{ fontSize: 13, color: '#475569' }}>
                                    {amb.baseFee && <span>Chaqiruv: <strong>{amb.baseFee.toLocaleString('uz-UZ')} so'm</strong></span>}
                                    {amb.baseFee && amb.pricePerKm && ' · '}
                                    {amb.pricePerKm && <span>1 km: <strong>{amb.pricePerKm.toLocaleString('uz-UZ')} so'm</strong></span>}
                                </div>
                            </div>
                        )}

                        <div className="sky-cta-note">
                            <Phone size={12} /> Klinikaga to'g'ridan-to'g'ri qo'ng'iroq qiling
                        </div>

                        <div className="sky-call-list">
                            {phones.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 14 }}>
                                    Telefon raqami ko'rsatilmagan
                                </div>
                            ) : (
                                phones.map((p, i) => (
                                    <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="sky-call-btn">
                                        <Phone size={14} />
                                        <span>{p}</span>
                                        <span className="sky-call-btn__cta">Qo'ng'iroq</span>
                                    </a>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default function SkoryPage() {
    const [userCoords, setUserCoords] = useState(null);
    const [geoDenied, setGeoDenied] = useState(false);
    const [type, setType] = useState('');
    const [minCapacity, setMinCapacity] = useState(0);
    const [equipment, setEquipment] = useState([]);
    const [region, setRegion] = useState('');
    const [statusFilter, setStatusFilter] = useState('AVAILABLE'); // 'all' or specific
    const [showFilters, setShowFilters] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoDenied(true);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => setGeoDenied(true),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
        );
    }, []);

    const queryParams = useMemo(() => {
        const p = {};
        if (userCoords) {
            p.lat = userCoords.lat;
            p.lng = userCoords.lng;
        }
        if (type) p.type = type;
        if (minCapacity > 0) p.minCapacity = minCapacity;
        if (equipment.length > 0) p.equipment = equipment.join(',');
        if (region) p.region = region;
        if (statusFilter !== 'AVAILABLE') p.status = statusFilter;
        return p;
    }, [userCoords, type, minCapacity, equipment, region, statusFilter]);

    const { data, isLoading } = useQuery({
        queryKey: ['public', 'ambulances', queryParams],
        queryFn: async () => (await api.get('/public/ambulances', { params: queryParams })).data?.data,
    });

    const items = data?.items || [];
    const validForMap = items.filter((a) => a.latitude && a.longitude);
    const activeFilters = [
        type && TYPE_META[type]?.label,
        minCapacity > 0 && `${minCapacity}+ bemor`,
        equipment.length > 0 && `${equipment.length} jihoz`,
        region,
        statusFilter !== 'AVAILABLE' && (statusFilter === 'all' ? 'Barchasi' : STATUS_META[statusFilter]?.label),
    ].filter(Boolean);

    const clearAll = () => {
        setType('');
        setMinCapacity(0);
        setEquipment([]);
        setRegion('');
        setStatusFilter('AVAILABLE');
    };

    return (
        <div className="sky-page-wrap">
            <TopBar />
            <Navigation />

            <main className="sky-page">
                <motion.header
                    className="sky-hero"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="sky-hero__bg" />
                    <div className="sky-hero__inner">
                        <motion.div
                            className="sky-hero__icon"
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Ambulance size={28} />
                        </motion.div>
                        <div className="sky-hero__body">
                            <h1 className="sky-hero__title">Tez yordam</h1>
                            <p className="sky-hero__sub">
                                Eng yaqin va bo'sh ambulanslarni xaritada toping
                            </p>
                        </div>

                        <div className="sky-hero__stats">
                            <div className="sky-hero__stat">
                                <div className="sky-hero__stat-val">
                                    <span className="sky-live-dot" />
                                    {data?.availableCount ?? 0}
                                </div>
                                <div className="sky-hero__stat-lbl">Bo'sh ambulans</div>
                            </div>
                            <div className="sky-hero__stat">
                                <div className="sky-hero__stat-val">{data?.total ?? 0}</div>
                                <div className="sky-hero__stat-lbl">Jami</div>
                            </div>
                            {userCoords && (
                                <div className="sky-hero__stat">
                                    <div className="sky-hero__stat-val">
                                        <NavIcon size={14} /> Yoqildi
                                    </div>
                                    <div className="sky-hero__stat-lbl">Joylashuv</div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.header>

                <div className="sky-toolbar">
                    <button
                        className={`sky-filter-btn ${showFilters ? 'sky-filter-btn--on' : ''}`}
                        onClick={() => setShowFilters((s) => !s)}
                    >
                        <Filter size={14} /> Filterlar
                        {activeFilters.length > 0 && <span className="sky-filter-badge">{activeFilters.length}</span>}
                    </button>
                    <select className="sky-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="AVAILABLE">Faqat bo'sh</option>
                        <option value="all">Barchasi</option>
                        <option value="BUSY">Bandda</option>
                        <option value="MAINTENANCE">Tex. xizmatda</option>
                    </select>
                    {geoDenied && (
                        <div className="sky-geo-warn">
                            <AlertTriangle size={12} /> Joylashuv yoqilmagan — masofa ko'rsatilmaydi
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            className="sky-filters"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="sky-filters__group">
                                <div className="sky-filters__label">Tur</div>
                                <div className="sky-chips">
                                    <button className={`sky-chip ${!type ? 'sky-chip--on' : ''}`} onClick={() => setType('')}>Barchasi</button>
                                    {TYPES.map((t) => (
                                        <button
                                            key={t}
                                            className={`sky-chip ${type === t ? 'sky-chip--on' : ''}`}
                                            onClick={() => setType(t)}
                                            style={type === t ? { background: TYPE_META[t].color, borderColor: TYPE_META[t].color } : undefined}
                                        >
                                            {TYPE_META[t].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sky-filters__group">
                                <div className="sky-filters__label">Sig'im (kamida)</div>
                                <div className="sky-chips">
                                    {[0, 1, 2, 4].map((c) => (
                                        <button
                                            key={c}
                                            className={`sky-chip ${minCapacity === c ? 'sky-chip--on' : ''}`}
                                            onClick={() => setMinCapacity(c)}
                                        >
                                            {c === 0 ? 'Barchasi' : `${c}+ bemor`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sky-filters__group">
                                <div className="sky-filters__label">Jihozlar (hammasi shart)</div>
                                <div className="sky-chips">
                                    {EQUIPMENT.map((e) => (
                                        <button
                                            key={e.key}
                                            className={`sky-chip ${equipment.includes(e.key) ? 'sky-chip--on' : ''}`}
                                            onClick={() => setEquipment((cur) =>
                                                cur.includes(e.key) ? cur.filter((k) => k !== e.key) : [...cur, e.key]
                                            )}
                                        >
                                            {e.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sky-filters__group">
                                <div className="sky-filters__label">Hudud</div>
                                <div className="sky-chips">
                                    <button className={`sky-chip ${!region ? 'sky-chip--on' : ''}`} onClick={() => setRegion('')}>Barchasi</button>
                                    {REGIONS.map((r) => (
                                        <button
                                            key={r}
                                            className={`sky-chip ${region === r ? 'sky-chip--on' : ''}`}
                                            onClick={() => setRegion(r)}
                                        >{r}</button>
                                    ))}
                                </div>
                            </div>

                            {activeFilters.length > 0 && (
                                <button className="sky-clear" onClick={clearAll}>
                                    <X size={12} /> Tozalash
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="sky-grid">
                    <div className="sky-map-wrap">
                        <MapContainer
                            center={userCoords ? [userCoords.lat, userCoords.lng] : TASHKENT_CENTER}
                            zoom={12}
                            scrollWheelZoom
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {userCoords && (
                                <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon} />
                            )}
                            {validForMap.map((a) => (
                                <Marker
                                    key={a.id}
                                    position={[a.latitude, a.longitude]}
                                    icon={ambulanceIcon(a.status, a.type, a.distanceKm)}
                                    eventHandlers={{ click: () => setSelected(a) }}
                                />
                            ))}
                            <FitBounds items={validForMap} userCoords={userCoords} />
                        </MapContainer>
                    </div>

                    <aside className="sky-list-wrap">
                        <div className="sky-list-head">
                            <Sparkles size={12} />
                            <strong>{items.length}</strong> ambulans topildi
                        </div>
                        {isLoading ? (
                            <div style={{ display: 'grid', gap: 8 }}>
                                {[1, 2, 3, 4].map((i) => <div key={i} className="sky-skel" />)}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="sky-list-empty">
                                <Ambulance size={36} color="#cbd5e1" />
                                <div style={{ marginTop: 10, fontWeight: 700, color: '#0f172a' }}>Topilmadi</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Filterlarni o'zgartiring</div>
                            </div>
                        ) : (
                            <div className="sky-list">
                                {items.map((a) => {
                                    const tm = TYPE_META[a.type];
                                    const sm = STATUS_META[a.status];
                                    return (
                                        <button key={a.id} className="sky-row" onClick={() => setSelected(a)}>
                                            <div className="sky-row__icon" style={{ background: `${tm.color}1f`, color: tm.color }}>
                                                <Ambulance size={16} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                                <div className="sky-row__call">{a.callSign}</div>
                                                <div className="sky-row__meta">
                                                    {tm.label}
                                                    {a.distanceKm != null && <> · {a.distanceKm.toFixed(1)} km</>}
                                                </div>
                                                <div className="sky-row__clinic">{a.clinic.name}</div>
                                            </div>
                                            <span className="sky-row__status" style={{ background: `${sm.color}1f`, color: sm.color }}>
                                                {sm.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            <Footer />

            <AmbulanceDetailModal amb={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
