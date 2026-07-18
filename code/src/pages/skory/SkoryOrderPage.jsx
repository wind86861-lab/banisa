/**
 * Patient skory (tez yordam) ordering wizard. Mirrors the Telegram bot
 * flow (skory.bot.ts) but as a full React page with map pickers, live
 * market price preview, and polled status screen.
 *
 * State machine:
 *   pickup → dest → price → desc → confirm → submitted (waiting/active)
 *
 * The "waiting" screen is driven by GET /api/skory/active polling, not
 * a local wizard step — so navigating away and back picks up where we
 * left off (e.g., dispatcher accepted while patient was on another page).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    ArrowLeft, MapPin, Hospital, Map as MapIcon, SkipForward, Loader2,
    AlertTriangle, Edit3, CheckCircle2, Phone, X, Ambulance, Activity, Flag, Search,
} from 'lucide-react';
import api from '../../shared/api/axios';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import './SkoryOrderPage.css';

// Leaflet default marker icon — patch for Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TASHKENT_CENTER = [41.3111, 69.2797];
const fmtSom = (n) => (n == null ? '—' : Number(n).toLocaleString('uz-UZ'));

// ─────────────────────────────────────────────────────────────────────────────
// Map picker — used for both pickup (step 1) and custom dropoff (step 2.custom)
// ─────────────────────────────────────────────────────────────────────────────

function FlyTo({ lat, lng, zoom = 15 }) {
    const map = useMap();
    useEffect(() => {
        if (lat != null && lng != null) map.flyTo([lat, lng], zoom, { duration: 0.5 });
    }, [lat, lng, zoom, map]);
    return null;
}

function ClickToMove({ onMove }) {
    useMapEvents({
        click(e) { onMove(e.latlng.lat, e.latlng.lng); },
    });
    return null;
}

// Forward geocode (address text → coordinates) via OpenStreetMap Nominatim,
// biased to Uzbekistan. Powers the "type an address, find it on the map" box.
async function forwardGeocode(query) {
    const q = String(query || '').trim();
    if (q.length < 3) return [];
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}`
            + `&format=json&limit=6&accept-language=uz,ru&countrycodes=uz`;
        const r = await fetch(url, { headers: { 'Accept-Language': 'uz,ru' } });
        if (!r.ok) return [];
        const j = await r.json();
        return Array.isArray(j) ? j : [];
    } catch { return []; }
}

// Address search box shown above the map. On pick it moves the marker + map.
function AddressSearch({ onPick }) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [busy, setBusy] = useState(false);

    const run = async () => {
        if (q.trim().length < 3) return;
        setBusy(true);
        setResults(await forwardGeocode(q));
        setBusy(false);
    };

    return (
        <div className="skoo__addr">
            <div className="skoo__addr__row">
                <input
                    className="skoo__input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }}
                    placeholder="Manzilni yozing: masalan, Chilonzor 19"
                />
                <button type="button" className="skoo__addr__btn" onClick={run} disabled={busy || q.trim().length < 3}>
                    {busy ? <Loader2 size={16} className="skoo__spin" /> : <Search size={16} />}
                </button>
            </div>
            {results.length > 0 && (
                <div className="skoo__addr__results">
                    {results.map((r, i) => (
                        <button
                            type="button"
                            key={`${r.place_id || i}`}
                            className="skoo__addr__result"
                            onClick={() => {
                                onPick(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                                setResults([]);
                                setQ('');
                            }}
                        >
                            <MapPin size={13} />
                            <span>{r.display_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function MapPicker({ lat, lng, onChange }) {
    const initialCenter = lat != null && lng != null ? [lat, lng] : TASHKENT_CENTER;
    return (
        <div className="skoo__map-wrap">
            <AddressSearch onPick={(la, ln) => onChange(la, ln)} />
            <div className="skoo__map">
            <MapContainer center={initialCenter} zoom={14} scrollWheelZoom>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                />
                {lat != null && lng != null && (
                    <Marker
                        position={[lat, lng]}
                        draggable
                        eventHandlers={{
                            dragend(e) {
                                const ll = e.target.getLatLng();
                                onChange(ll.lat, ll.lng);
                            },
                        }}
                    />
                )}
                <ClickToMove onMove={onChange} />
                {lat != null && lng != null && <FlyTo lat={lat} lng={lng} />}
            </MapContainer>
            </div>
        </div>
    );
}

// Best-effort reverse geocode via OpenStreetMap Nominatim.
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&format=json&accept-language=uz,ru&zoom=18`;
        const r = await fetch(url, { headers: { 'Accept-Language': 'uz,ru' } });
        if (!r.ok) return null;
        const j = await r.json();
        const name = j?.display_name;
        if (!name) return null;
        return String(name).split(',').map((s) => s.trim()).slice(0, 3).join(', ');
    } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — service tier (transport type)
// ─────────────────────────────────────────────────────────────────────────────

// Two patient-facing tiers with plain-language descriptions so someone who
// doesn't know the difference from the name alone understands which to pick.
const SKORY_TIERS = [
    {
        value: 'BASIC',
        emoji: '🚐',
        title: 'Oddiy tibbiy transport',
        desc: "Ahvoli barqaror bemorni yotgan holda bir joydan ikkinchisiga xavfsiz olib o'tish uchun (masalan uydan klinikaga). Yo'lda maxsus tibbiy nazorat yoki jihoz yo'q — faqat qulay va xavfsiz tashish.",
    },
    {
        value: 'INTENSIVE_CARE',
        emoji: '🚑',
        title: 'Reanimatsion tez yordam',
        desc: "Ahvoli og'ir yoki doimiy nazorat talab qiladigan bemor uchun. Mashinada reanimatsiya jihozlari (kislorod, yurak monitori, sun'iy nafas) va tibbiy xodim bo'ladi — yo'l davomida bemor holati kuzatib boriladi.",
    },
];

function TypeStep({ type, onChange, onNext }) {
    return (
        <div className="skoo__card">
            <h2>Qanday yordam kerak?</h2>
            <div className="skoo__sub">Bemorning ahvoliga qarab turni tanlang.</div>

            <div className="skoo__notice skoo__notice--warn" style={{ marginBottom: 14 }}>
                <AlertTriangle size={15} />
                <div>
                    Bu xizmat hozircha faqat bemorni <b>ko'chirib/tashib</b> o'tkazish uchun
                    (joyida davolash emas). Xizmat <b>pullik</b> — narx yo'l masofasiga qarab
                    hisoblanadi va tasdiqdan oldin ko'rsatiladi.
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SKORY_TIERS.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        className={`skoo__tier ${type === t.value ? 'skoo__tier--on' : ''}`}
                        onClick={() => onChange(t.value)}
                    >
                        <span className="skoo__tier__emoji">{t.emoji}</span>
                        <span className="skoo__tier__body">
                            <span className="skoo__tier__title">
                                {t.title}
                                {type === t.value && <CheckCircle2 size={16} color="#16a34a" />}
                            </span>
                            <span className="skoo__tier__desc">{t.desc}</span>
                        </span>
                    </button>
                ))}
            </div>

            <button className="skoo__btn skoo__btn--mt-16" disabled={!type} onClick={onNext}>
                Davom etish
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — pickup
// ─────────────────────────────────────────────────────────────────────────────

function PickupStep({ pickup, onChange, onNext }) {
    const [busy, setBusy] = useState(false);
    // Surface geolocation failures inline instead of via alert() — native
    // dialogs are blocked in some Telegram Mini App embeds and they
    // distract a patient who's already in an emergency. The hint also
    // makes it obvious the manual map below still works.
    const [geoError, setGeoError] = useState('');

    const useMyLocation = () => {
        setGeoError('');
        if (!navigator.geolocation) {
            setGeoError('Brauzeringiz joylashuvni qo\'llab-quvvatlamaydi. Xaritada nuqtani qo\'lda belgilang.');
            return;
        }
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude;
                const address = await reverseGeocode(lat, lng);
                onChange({ lat, lng, address });
                setBusy(false);
            },
            (err) => {
                setBusy(false);
                setGeoError(`Joylashuv olinmadi (${err.message || 'ruxsat berilmagan'}). Xaritada nuqtani qo'lda belgilang.`);
            },
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    const handleMapChange = async (lat, lng) => {
        onChange({ lat, lng, address: null });
        const address = await reverseGeocode(lat, lng);
        onChange({ lat, lng, address });
    };

    return (
        <div className="skoo__card">
            <h2>📍 Sizni qayerdan olib ketamiz?</h2>
            <div className="skoo__sub">Xaritada nuqtani belgilang yoki "Mening joyim" tugmasini bosing.</div>

            <MapPicker lat={pickup?.lat} lng={pickup?.lng} onChange={handleMapChange} />

            <button className="skoo__btn skoo__btn--ghost skoo__btn--mb-10" onClick={useMyLocation} disabled={busy}>
                {busy ? <Loader2 size={16} className="skoo__spin" /> : <MapPin size={16} />}
                Mening joyim
            </button>

            {geoError && (
                <div className="skoo__error">
                    <AlertTriangle size={14} /> {geoError}
                </div>
            )}

            {pickup && (
                <div className="skoo__address">
                    <div className="skoo__address__label">📍 {pickup.address || `${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}`}</div>
                </div>
            )}

            <button className="skoo__btn" disabled={!pickup} onClick={onNext}>
                Davom etish
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — destination
// ─────────────────────────────────────────────────────────────────────────────

function DestStep({ pickup, dest, onChange, onNext }) {
    const [mode, setMode] = useState(null); // null | 'hospital' | 'custom'

    const { data: clinics = [] } = useQuery({
        queryKey: ['skory', 'nearby-clinics', pickup.lat, pickup.lng],
        queryFn: async () => (await api.get('/skory/nearby-clinics', { params: { lat: pickup.lat, lng: pickup.lng } })).data?.data?.items ?? [],
        enabled: mode === 'hospital',
        staleTime: 60_000,
    });

    const handleClinic = (c) => {
        onChange({ clinicId: c.id, label: c.nameUz, lat: c.latitude, lng: c.longitude });
        onNext();
    };

    const handleMapChange = async (lat, lng) => {
        const label = await reverseGeocode(lat, lng);
        onChange({ lat, lng, label: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    };

    const handleSkip = () => { onChange(null); onNext(); };

    if (mode === 'hospital') {
        return (
            <div className="skoo__card">
                <h2>🏥 Qaysi shifoxonaga olib boriladi?</h2>
                <div className="skoo__sub">Eng yaqin 10 ta klinika</div>
                {clinics.length === 0 ? (
                    <div className="skoo__notice">Yaqin atrofda shifoxona topilmadi.</div>
                ) : (
                    clinics.map((c) => (
                        <button key={c.id} className="skoo__clinic" onClick={() => handleClinic(c)}>
                            <Hospital size={16} color="#dc2626" />
                            <span className="skoo__clinic__name">{c.nameUz}</span>
                            <span className="skoo__clinic__dist">{c.distanceKm.toFixed(1)} km</span>
                        </button>
                    ))
                )}
                <button className="skoo__btn skoo__btn--ghost skoo__btn--mt-10" onClick={() => setMode(null)}>
                    <ArrowLeft size={14} /> Orqaga
                </button>
            </div>
        );
    }

    if (mode === 'custom') {
        return (
            <div className="skoo__card">
                <h2>🗺 Borish joyini belgilang</h2>
                <div className="skoo__sub">Xaritada nuqtani bosing yoki markerni torting.</div>
                <MapPicker lat={dest?.lat} lng={dest?.lng} onChange={handleMapChange} />
                {dest?.label && (
                    <div className="skoo__address">
                        <div className="skoo__address__label">📍 {dest.label}</div>
                    </div>
                )}
                <button className="skoo__btn skoo__btn--mb-8" disabled={!dest?.lat} onClick={onNext}>
                    Davom etish
                </button>
                <button className="skoo__btn skoo__btn--ghost" onClick={() => setMode(null)}>
                    <ArrowLeft size={14} /> Orqaga
                </button>
            </div>
        );
    }

    return (
        <div className="skoo__card">
            <h2>🚑 Qayerga olib boriladi?</h2>
            <button className="skoo__choice" onClick={() => setMode('hospital')}>
                <span className="skoo__choice__icon skoo__choice__icon--hospital"><Hospital size={20} /></span>
                <span className="skoo__choice__body">
                    <span className="skoo__choice__title">Shifoxonaga olib boring</span>
                    <span className="skoo__choice__sub">Ro'yxatdan klinika tanlang</span>
                </span>
            </button>
            <button className="skoo__choice" onClick={() => setMode('custom')}>
                <span className="skoo__choice__icon skoo__choice__icon--map"><MapIcon size={20} /></span>
                <span className="skoo__choice__body">
                    <span className="skoo__choice__title">Boshqa joy (xaritada)</span>
                    <span className="skoo__choice__sub">O'zingiz nuqta belgilang</span>
                </span>
            </button>
            <button className="skoo__choice" onClick={handleSkip}>
                <span className="skoo__choice__icon skoo__choice__icon--skip"><SkipForward size={20} /></span>
                <span className="skoo__choice__body">
                    <span className="skoo__choice__title">Hozircha kerakmas</span>
                    <span className="skoo__choice__sub">Faqat ambulans chaqirish</span>
                </span>
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — description
// ─────────────────────────────────────────────────────────────────────────────

function DescStep({ description, onChange, onNext }) {
    const [text, setText] = useState(description || '');
    return (
        <div className="skoo__card">
            <h2>📝 Tafsilot (ixtiyoriy)</h2>
            <div className="skoo__sub">Nima bo'lganini qisqa yozing, dispatcher bilishi muhim</div>
            <textarea
                className="skoo__input skoo__input--mb-10"
                rows={3}
                maxLength={500}
                placeholder="Masalan: yurak og'rig'i, qon ketmoqda…"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button
                className="skoo__btn skoo__btn--mb-8"
                onClick={() => { onChange(text.trim() || null); onNext(); }}
            >
                Davom etish
            </button>
            <button
                className="skoo__btn skoo__btn--ghost"
                onClick={() => { onChange(null); onNext(); }}
            >
                ⏭ O'tkazib yuborish
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — confirm
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmStep({ data, onEdit, onSubmit, submitting, error }) {
    const tierTitle = SKORY_TIERS.find((t) => t.value === data.type)?.title || '—';
    const tierEmoji = SKORY_TIERS.find((t) => t.value === data.type)?.emoji || '';

    // Live market estimate for the chosen tier + trip. Only meaningful once a
    // destination is set (otherwise there's no trip distance to price).
    const { data: priceRange } = useQuery({
        queryKey: ['skory', 'price-range', data.type, data.pickup?.lat, data.pickup?.lng, data.dest?.lat, data.dest?.lng],
        queryFn: async () => (await api.get('/skory/price-range', {
            params: {
                lat: data.pickup.lat, lng: data.pickup.lng,
                destLat: data.dest?.lat, destLng: data.dest?.lng,
                type: data.type,
            },
        })).data?.data,
        enabled: !!(data.pickup?.lat && data.dest?.lat),
        staleTime: 30_000,
    });

    const distanceKm = useMemo(() => {
        if (!data.dest?.lat || !data.pickup?.lat) return null;
        const R = 6371;
        const dLat = (data.dest.lat - data.pickup.lat) * Math.PI / 180;
        const dLng = (data.dest.lng - data.pickup.lng) * Math.PI / 180;
        const lat1 = data.pickup.lat * Math.PI / 180;
        const lat2 = data.dest.lat * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }, [data]);

    // `pickup` should always be set by this step (orchestrator guards it),
    // but a race during back-edit could land here mid-update where lat is
    // still undefined. The previous code did `pickup?.lat.toFixed(5)` —
    // the `?.` only guarded `lat`, then unconditionally called `.toFixed`
    // on undefined and crashed the wizard. Format defensively instead.
    const fmtCoord = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(5) : '—');
    const coordLabel = (loc) => loc?.address || loc?.label
        || `${fmtCoord(loc?.lat)}, ${fmtCoord(loc?.lng)}`;

    return (
        <div className="skoo__card">
            <h2>✅ Hammasi tayyor — yuborilsinmi?</h2>
            {error && <div className="skoo__error"><AlertTriangle size={14} /> {error}</div>}

            <Row label="🚑 Xizmat turi" value={`${tierEmoji} ${tierTitle}`} onEdit={() => onEdit(1)} />
            <Row label="📍 Joyim" value={coordLabel(data.pickup)} onEdit={() => onEdit(2)} />
            <Row
                label="🏥 Manzil"
                value={data.dest
                    ? coordLabel(data.dest)
                    : 'Belgilanmagan'}
                onEdit={() => onEdit(3)}
            />
            {distanceKm != null && (
                <Row label="📏 Masofa" value={`~${distanceKm.toFixed(1)} km · ~${Math.max(1, Math.round(distanceKm * 2))} daq`} />
            )}
            <Row label="📝 Tafsilot" value={data.description || '—'} onEdit={() => onEdit(4)} />

            {priceRange && (priceRange.min != null) && (
                <div className="skoo__notice" style={{ marginTop: 6 }}>
                    💳 <b>Taxminiy narx:</b>{' '}
                    {priceRange.min === priceRange.max
                        ? `${priceRange.min.toLocaleString('uz-UZ')} so'm`
                        : `${priceRange.min.toLocaleString('uz-UZ')} – ${priceRange.max.toLocaleString('uz-UZ')} so'm`}
                    {' '}— yo'l masofasiga qarab. Aniq narx ambulans qabul qilganda belgilanadi. Xizmat pullik.
                </div>
            )}

            <button className="skoo__btn skoo__btn--mt-16" onClick={onSubmit} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="skoo__spin" /> : <Ambulance size={16} />}
                Yuborish — barcha mos ambulanslarga
            </button>
        </div>
    );
}

function Row({ label, value, onEdit }) {
    return (
        <div className="skoo__summary">
            <div>
                <div className="skoo__summary__label">{label}</div>
                <div className="skoo__summary__value">{value}</div>
            </div>
            {onEdit && (
                <button className="skoo__summary__edit" onClick={onEdit}>
                    <Edit3 size={11} /> O'zgartirish
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Waiting / active-request screen
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FLOW = [
    { key: 'PENDING',    label: 'Ambulans qidirilmoqda…' },
    { key: 'DISPATCHED', label: 'Ambulans qabul qildi' },
    { key: 'ON_ROUTE',   label: 'Ambulans yo\'lda' },
    { key: 'ARRIVED',    label: 'Yetib keldi' },
    { key: 'COMPLETED',  label: 'Yakunlandi' },
];

function WaitingScreen({ active, onCancelled }) {
    const qc = useQueryClient();
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const cancel = useMutation({
        mutationFn: async () => (await api.post(`/skory/${active.id}/cancel`)).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['skory', 'active'] });
            setConfirmingCancel(false);
            onCancelled?.();
        },
    });

    const curIdx = STATUS_FLOW.findIndex((s) => s.key === active.status);
    const amb = active.acceptedAmbulance;
    // Patient only ever sees the dispatcher (driver) number — never the
    // clinic's own phone.
    const phones = useMemo(() => {
        const list = [];
        if (amb?.dispatcher?.phone) list.push(amb.dispatcher.phone);
        return Array.from(new Set(list));
    }, [amb]);

    return (
        <div>
            {active.status === 'PENDING' ? (
                <div className="skoo__card skoo__waiting">
                    <div className="skoo__waiting__pulse"><Ambulance size={28} color="#dc2626" /></div>
                    <h2>Ambulans qidirilmoqda…</h2>
                    <p>So'rovingiz mos ambulanslarga yuborildi. Birinchi qabul qilgan keladi.</p>
                </div>
            ) : amb && (
                <div className="skoo__ambcard">
                    <h2>✅ Ambulans yo'lda!</h2>
                    <div className="skoo__ambcard__row"><Hospital size={16} /> {amb.clinic?.nameUz}</div>
                    <div className="skoo__ambcard__row"><Ambulance size={16} /> {amb.callSign} {amb.vehicleModel && `· ${amb.vehicleModel}`}</div>
                    {amb.licensePlate && <div className="skoo__ambcard__row"><Flag size={16} /> {amb.licensePlate}</div>}
                    {active.estimatedDurationMin && <div className="skoo__ambcard__row"><Activity size={16} /> ~{active.estimatedDurationMin} daq</div>}
                    {active.waitingStartedAt && !active.waitingEndedAt && (
                        <div className="skoo__ambcard__row" style={{ color: '#b45309' }}>
                            ⏱ Kutish davom etyapti — vaqt hisoblanmoqda
                        </div>
                    )}
                    {(active.waitingFee ?? 0) > 0 && (
                        <div className="skoo__ambcard__row" style={{ color: '#b45309' }}>
                            ⏱ Kutish: {active.waitingMinutes} daq — {active.waitingFee.toLocaleString('uz-UZ')} so'm
                        </div>
                    )}
                    {phones.length > 0 && (
                        <div>
                            {phones.map((p) => (
                                <a key={p} href={`tel:${p}`} className="skoo__ambcard__phone">
                                    <Phone size={12} /> {p}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="skoo__card">
                <h2>Holat</h2>
                {STATUS_FLOW.map((s, i) => (
                    <div
                        key={s.key}
                        className={`skoo__status-step ${i < curIdx ? 'skoo__status-step--done' : i === curIdx ? 'skoo__status-step--active' : ''}`}
                    >
                        <div className="skoo__status-step__dot">
                            {i < curIdx ? <CheckCircle2 size={14} /> : i === curIdx ? '•' : i + 1}
                        </div>
                        <div className="skoo__status-step__label">{s.label}</div>
                    </div>
                ))}
            </div>

            {['PENDING', 'DISPATCHED', 'ON_ROUTE'].includes(active.status) && (
                confirmingCancel ? (
                    <div className="skoo__cancel-confirm">
                        <div className="skoo__cancel-confirm__q">So'rovni bekor qilasizmi? Ambulans yo'lda bo'lsa, kelmaydi.</div>
                        <div className="skoo__cancel-confirm__actions">
                            <button
                                type="button"
                                className="skoo__btn skoo__btn--ghost"
                                onClick={() => setConfirmingCancel(false)}
                                disabled={cancel.isPending}
                            >
                                Yo'q, qoldirish
                            </button>
                            <button
                                type="button"
                                className="skoo__btn skoo__btn--danger"
                                onClick={() => cancel.mutate()}
                                disabled={cancel.isPending}
                            >
                                {cancel.isPending ? <Loader2 size={14} className="skoo__spin" /> : <X size={14} />}
                                Ha, bekor qilish
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        className="skoo__btn skoo__btn--ghost"
                        onClick={() => setConfirmingCancel(true)}
                    >
                        <X size={14} /> So'rovni bekor qilish
                    </button>
                )
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export default function SkoryOrderPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetAmbulanceId = searchParams.get('ambulanceId') || null;
    const { user, isLoading: authLoading } = useUserAuth();

    // The active-request poll. While anything non-terminal exists we lock the
    // wizard and show the waiting screen instead. Skip the tick when the tab
    // is hidden (patient checked a chat / locked phone) — refetchOnWindowFocus
    // brings us back when they return, so the status never stays stale for
    // long, but background server load drops to zero.
    const { data: active, refetch: refetchActive } = useQuery({
        queryKey: ['skory', 'active'],
        queryFn: async () => (await api.get('/skory/active')).data?.data,
        enabled: !!user,
        refetchInterval: () => (typeof document !== 'undefined' && document.visibilityState === 'hidden')
            ? false
            : 3000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    });

    const [step, setStep] = useState(1);
    const [type, setType] = useState(null);
    const [pickup, setPickup] = useState(null);
    const [dest, setDest] = useState(null);
    const [description, setDescription] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    const submit = useMutation({
        // No price limit — the request always fans out to ALL matching
        // ambulances (priceMaxSom is intentionally null; the patient no longer
        // sets a budget).
        mutationFn: async () => (await api.post('/skory/request', {
            type, pickup, dest, priceMaxSom: null, description, targetAmbulanceId,
        })).data,
        onSuccess: (res) => {
            if (res?.success) {
                refetchActive();
            } else {
                setSubmitError(res?.message || 'Yuborishda xato');
            }
        },
        onError: (err) => {
            const msg = err?.response?.data?.message;
            const existingId = err?.response?.data?.data?.existingRequestId;
            setSubmitError(msg || 'Yuborishda xato');
            if (existingId) refetchActive();
        },
    });

    if (authLoading) {
        return (
            <div className="skoo">
                <div className="skoo__shell">
                    <Loader2 className="skoo__spin skoo__page-loader" size={28} />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="skoo">
                <div className="skoo__shell">
                    <div className="skoo__topbar">
                        <button className="skoo__back" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
                        <div className="skoo__title">🚑 Tez yordam</div>
                    </div>
                    <div className="skoo__card skoo__login-prompt">
                        <h2>Avval kiring</h2>
                        <p>Tez yordam chaqirish uchun ro'yxatdan o'tish kerak.</p>
                        <button className="skoo__btn" onClick={() => navigate('/user/login?redirect=/skory/order')}>
                            Kirish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If a request is active (any non-terminal status) — show waiting/status
    if (active) {
        return (
            <div className="skoo">
                <div className="skoo__shell">
                    <div className="skoo__topbar">
                        <button className="skoo__back" onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
                        <div className="skoo__title">🚑 Tez yordam — chaqiruv</div>
                    </div>
                    <WaitingScreen active={active} onCancelled={() => { setStep(1); }} />
                </div>
            </div>
        );
    }

    const goTo = (n) => { setSubmitError(null); setStep(n); };

    return (
        <div className="skoo">
            <div className="skoo__shell">
                <div className="skoo__topbar">
                    <button className="skoo__back" onClick={() => (step === 1 ? navigate(-1) : goTo(step - 1))}>
                        <ArrowLeft size={16} />
                    </button>
                    <div className="skoo__title">🚑 Tez yordam chaqirish</div>
                </div>

                <div className="skoo__steps">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className={`skoo__step ${n === step ? 'skoo__step--active' : n < step ? 'skoo__step--done' : ''}`} />
                    ))}
                </div>

                {targetAmbulanceId && (
                    <div className="skoo__target-notice">
                        <Ambulance size={16} />
                        <div>
                            <b>Faqat tanlangan ambulansga so'rov yuboriladi</b><br />
                            Boshqalarga emas. Agar u javob bermasa — qaytadan boshlash kerak.
                        </div>
                    </div>
                )}

                {step === 1 && <TypeStep type={type} onChange={setType} onNext={() => goTo(2)} />}
                {step === 2 && <PickupStep pickup={pickup} onChange={setPickup} onNext={() => goTo(3)} />}
                {step === 3 && pickup && (
                    <DestStep
                        pickup={pickup} dest={dest}
                        onChange={setDest}
                        onNext={() => goTo(4)}
                    />
                )}
                {step === 4 && (
                    <DescStep
                        description={description}
                        onChange={setDescription}
                        onNext={() => goTo(5)}
                    />
                )}
                {step === 5 && pickup && (
                    <ConfirmStep
                        data={{ type, pickup, dest, description }}
                        onEdit={goTo}
                        onSubmit={() => submit.mutate()}
                        submitting={submit.isPending}
                        error={submitError}
                    />
                )}
            </div>
        </div>
    );
}
