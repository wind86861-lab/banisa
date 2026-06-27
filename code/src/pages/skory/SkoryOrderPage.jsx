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
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    ArrowLeft, MapPin, Hospital, Map as MapIcon, SkipForward, Loader2,
    AlertTriangle, Edit3, CheckCircle2, Phone, X, Ambulance, Activity, Flag,
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

function MapPicker({ lat, lng, onChange }) {
    const initialCenter = lat != null && lng != null ? [lat, lng] : TASHKENT_CENTER;
    return (
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
// Step 1 — pickup
// ─────────────────────────────────────────────────────────────────────────────

function PickupStep({ pickup, onChange, onNext }) {
    const [busy, setBusy] = useState(false);

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Brauzeringiz joylashuvni qo\'llab-quvvatlamaydi');
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
            (err) => { setBusy(false); alert('Joylashuvni olishda xato: ' + err.message); },
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

            <button className="skoo__btn skoo__btn--ghost" onClick={useMyLocation} disabled={busy} style={{ marginBottom: 10 }}>
                {busy ? <Loader2 size={16} className="skoo__spin" /> : <MapPin size={16} />}
                Mening joyim
            </button>

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
                <button className="skoo__btn skoo__btn--ghost" onClick={() => setMode(null)} style={{ marginTop: 10 }}>
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
                <button className="skoo__btn" disabled={!dest?.lat} onClick={onNext} style={{ marginBottom: 8 }}>
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
                <span className="skoo__choice__icon" style={{ background: '#fee2e2', color: '#dc2626' }}><Hospital size={20} /></span>
                <span className="skoo__choice__body">
                    <span className="skoo__choice__title">Shifoxonaga olib boring</span>
                    <span className="skoo__choice__sub">Ro'yxatdan klinika tanlang</span>
                </span>
            </button>
            <button className="skoo__choice" onClick={() => setMode('custom')}>
                <span className="skoo__choice__icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}><MapIcon size={20} /></span>
                <span className="skoo__choice__body">
                    <span className="skoo__choice__title">Boshqa joy (xaritada)</span>
                    <span className="skoo__choice__sub">O'zingiz nuqta belgilang</span>
                </span>
            </button>
            <button className="skoo__choice" onClick={handleSkip}>
                <span className="skoo__choice__icon" style={{ background: '#f1f5f9', color: '#475569' }}><SkipForward size={20} /></span>
                <span className="skoo__choice__body">
                    <span className="skoo__choice__title">Hozircha kerakmas</span>
                    <span className="skoo__choice__sub">Faqat ambulans chaqirish</span>
                </span>
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — price
// ─────────────────────────────────────────────────────────────────────────────

function PriceStep({ pickup, dest, priceMaxSom, onChange, onNext }) {
    const { data: range, isLoading } = useQuery({
        queryKey: ['skory', 'price-range', pickup.lat, pickup.lng, dest?.lat, dest?.lng],
        queryFn: async () => (await api.get('/skory/price-range', {
            params: { lat: pickup.lat, lng: pickup.lng, destLat: dest?.lat, destLng: dest?.lng },
        })).data?.data,
        staleTime: 60_000,
    });

    const [text, setText] = useState(priceMaxSom != null ? String(priceMaxSom) : '');

    const handleAcceptAll = () => { onChange(null); onNext(); };

    const handleSubmit = () => {
        const n = parseInt(text.replace(/[\s,]/g, ''), 10);
        if (!Number.isFinite(n) || n <= 0) {
            alert('Iltimos to\'g\'ri narx kiriting (so\'mda)');
            return;
        }
        onChange(n);
        onNext();
    };

    return (
        <div className="skoo__card">
            <h2>💰 Maksimal narx?</h2>
            {isLoading ? (
                <div className="skoo__notice">Bozor narxlari yuklanmoqda...</div>
            ) : range ? (
                <div className="skoo__range">
                    <div className="skoo__range__head">
                        {range.tripKm != null
                            ? `Bu masofa (~${range.tripKm} km) uchun ${range.sampleCount} ta klinikada:`
                            : `Yaqin atrofdagi ${range.sampleCount} ta klinikada:`}
                    </div>
                    <div className="skoo__range__value">{fmtSom(range.min)} – {fmtSom(range.max)} so'm</div>
                </div>
            ) : (
                <div className="skoo__notice">Yaqin atrofda narxlar ma'lumoti yo'q.</div>
            )}

            <input
                className="skoo__input"
                type="number"
                inputMode="numeric"
                placeholder="Masalan: 150000"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ marginBottom: 10 }}
            />
            <button className="skoo__btn" onClick={handleSubmit} disabled={!text.trim()} style={{ marginBottom: 8 }}>
                Davom etish (max {text ? fmtSom(parseInt(text, 10) || 0) + ' so\'m' : ''})
            </button>
            <button className="skoo__btn skoo__btn--ghost" onClick={handleAcceptAll}>
                ✅ Hammasini qabul (limit yo'q)
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — description
// ─────────────────────────────────────────────────────────────────────────────

function DescStep({ description, onChange, onNext }) {
    const [text, setText] = useState(description || '');
    return (
        <div className="skoo__card">
            <h2>📝 Tafsilot (ixtiyoriy)</h2>
            <div className="skoo__sub">Nima bo'lganini qisqa yozing, dispatcher bilishi muhim</div>
            <textarea
                className="skoo__input"
                rows={3}
                maxLength={500}
                placeholder="Masalan: yurak og'rig'i, qon ketmoqda…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ marginBottom: 10 }}
            />
            <button
                className="skoo__btn"
                onClick={() => { onChange(text.trim() || null); onNext(); }}
                style={{ marginBottom: 8 }}
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

    return (
        <div className="skoo__card">
            <h2>✅ Hammasi tayyor — yuborilsinmi?</h2>
            {error && <div className="skoo__error"><AlertTriangle size={14} /> {error}</div>}

            <Row label="📍 Joyim" value={data.pickup?.address || `${data.pickup?.lat.toFixed(5)}, ${data.pickup?.lng.toFixed(5)}`} onEdit={() => onEdit(1)} />
            <Row
                label="🏥 Manzil"
                value={data.dest?.label || (data.dest?.lat ? `${data.dest.lat.toFixed(5)}, ${data.dest.lng.toFixed(5)}` : 'Belgilanmagan')}
                onEdit={() => onEdit(2)}
            />
            {distanceKm != null && (
                <Row label="📏 Masofa" value={`~${distanceKm.toFixed(1)} km · ~${Math.max(1, Math.round(distanceKm * 2))} daq`} />
            )}
            <Row label="💰 Maks. narx" value={data.priceMaxSom ? `${fmtSom(data.priceMaxSom)} so'm` : 'Limit yo\'q'} onEdit={() => onEdit(3)} />
            <Row label="📝 Tafsilot" value={data.description || '—'} onEdit={() => onEdit(4)} />

            <button className="skoo__btn" onClick={onSubmit} disabled={submitting} style={{ marginTop: 16 }}>
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
    const cancel = useMutation({
        mutationFn: async () => (await api.post(`/skory/${active.id}/cancel`)).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['skory', 'active'] });
            onCancelled?.();
        },
    });

    const curIdx = STATUS_FLOW.findIndex((s) => s.key === active.status);
    const amb = active.acceptedAmbulance;
    const phones = useMemo(() => {
        const list = [];
        if (amb?.dispatcher?.phone) list.push(amb.dispatcher.phone);
        if (Array.isArray(amb?.clinic?.phones)) list.push(...amb.clinic.phones);
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
                <button
                    className="skoo__btn skoo__btn--ghost"
                    onClick={() => { if (confirm('So\'rovni bekor qilasizmi?')) cancel.mutate(); }}
                    disabled={cancel.isPending}
                >
                    {cancel.isPending ? <Loader2 size={14} className="skoo__spin" /> : <X size={14} />} So'rovni bekor qilish
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export default function SkoryOrderPage() {
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useUserAuth();

    // The active-request poll. While anything non-terminal exists we lock the
    // wizard and show the waiting screen instead.
    const { data: active, refetch: refetchActive } = useQuery({
        queryKey: ['skory', 'active'],
        queryFn: async () => (await api.get('/skory/active')).data?.data,
        enabled: !!user,
        refetchInterval: 3000,
    });

    const [step, setStep] = useState(1);
    const [pickup, setPickup] = useState(null);
    const [dest, setDest] = useState(null);
    const [priceMaxSom, setPriceMaxSom] = useState(null);
    const [description, setDescription] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    const submit = useMutation({
        mutationFn: async () => (await api.post('/skory/request', {
            pickup, dest, priceMaxSom, description,
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
        return <div className="skoo"><div className="skoo__shell"><Loader2 className="skoo__spin" size={28} style={{ display: 'block', margin: '60px auto' }} /></div></div>;
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

                {step === 1 && <PickupStep pickup={pickup} onChange={setPickup} onNext={() => goTo(2)} />}
                {step === 2 && pickup && (
                    <DestStep
                        pickup={pickup} dest={dest}
                        onChange={setDest}
                        onNext={() => goTo(3)}
                    />
                )}
                {step === 3 && pickup && (
                    <PriceStep
                        pickup={pickup} dest={dest} priceMaxSom={priceMaxSom}
                        onChange={setPriceMaxSom}
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
                        data={{ pickup, dest, priceMaxSom, description }}
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
