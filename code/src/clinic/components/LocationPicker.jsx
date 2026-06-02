import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Link as LinkIcon, MapPin, Loader2 } from 'lucide-react';
import api from '../../shared/api/axios';
import './LocationPicker.css';

// Leaflet default marker icons are broken when bundled by Vite — patch with CDN.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TASHKENT_CENTER = [41.3111, 69.2797];
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 16;

function parseCoordsFromUrl(input) {
    if (!input) return null;
    const text = String(input).trim();
    // Match @lat,lng (Google/Yandex zoom URLs) or ?q=lat,lng or just "lat,lng"
    const patterns = [
        /@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,         // @41.31,69.27
        /[?&](?:q|ll|center|pt)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // ?q=, ?ll=, ?center=
        /^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/,     // raw "41.31, 69.27"
    ];
    for (const re of patterns) {
        const m = text.match(re);
        if (m) {
            const lat = parseFloat(m[1]);
            const lng = parseFloat(m[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng) &&
                lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                return { lat, lng };
            }
        }
    }
    return null;
}

function FlyToPin({ lat, lng, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (lat != null && lng != null) {
            map.flyTo([lat, lng], zoom, { duration: 0.6 });
        }
    }, [lat, lng]);
    return null;
}

function ClickToPlace({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function LocationPicker({ value, onChange }) {
    const { lat, lng } = value || {};
    const hasPin = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    const center = hasPin ? [Number(lat), Number(lng)] : TASHKENT_CENTER;
    const initialZoom = hasPin ? PICKED_ZOOM : DEFAULT_ZOOM;

    const [linkInput, setLinkInput] = useState('');
    const [linkError, setLinkError] = useState('');
    const [linkLoading, setLinkLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState('');

    const markerRef = useRef(null);

    const setCoords = (newLat, newLng) => {
        onChange({ lat: Number(newLat.toFixed(6)), lng: Number(newLng.toFixed(6)) });
    };

    const handleMarkerDragEnd = () => {
        const m = markerRef.current;
        if (m) {
            const { lat: la, lng: ln } = m.getLatLng();
            setCoords(la, ln);
        }
    };

    const handleUseMyLocation = () => {
        if (!('geolocation' in navigator)) {
            setGpsError('Brauzer joylashuvni qo\'llab-quvvatlamaydi');
            return;
        }
        setGpsLoading(true);
        setGpsError('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords(pos.coords.latitude, pos.coords.longitude);
                setGpsLoading(false);
            },
            (err) => {
                setGpsError(err.message || 'Joylashuvni olib bo\'lmadi');
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
        );
    };

    const handlePasteLink = async () => {
        setLinkError('');
        const trimmed = (linkInput || '').trim();
        if (!trimmed) return;
        // First try local regex (fast path for long Google/Yandex URLs and raw lat,lng).
        const parsed = parseCoordsFromUrl(trimmed);
        if (parsed) {
            setCoords(parsed.lat, parsed.lng);
            setLinkInput('');
            return;
        }
        // For short links (maps.app.goo.gl/..., yandex.com/maps/-/..., goo.gl/...)
        // we need server-side redirect resolution — browsers can't follow them cross-origin.
        setLinkLoading(true);
        try {
            const { data } = await api.post('/clinic/resolve-map-link', { url: trimmed });
            if (data?.data?.lat != null && data?.data?.lng != null) {
                setCoords(data.data.lat, data.data.lng);
                setLinkInput('');
            } else {
                setLinkError('Linkdan koordinata olib bo\'lmadi.');
            }
        } catch (err) {
            setLinkError(err?.response?.data?.message || 'Linkni ochib bo\'lmadi. Boshqa linkni ko\'ring yoki xaritada bosib qo\'ying.');
        } finally {
            setLinkLoading(false);
        }
    };

    return (
        <div className="loc-picker">
            <div className="loc-picker__map-wrap">
                <MapContainer
                    center={center}
                    zoom={initialZoom}
                    scrollWheelZoom
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {hasPin && (
                        <>
                            <Marker
                                position={[Number(lat), Number(lng)]}
                                draggable
                                eventHandlers={{ dragend: handleMarkerDragEnd }}
                                ref={markerRef}
                            />
                            <FlyToPin lat={Number(lat)} lng={Number(lng)} zoom={PICKED_ZOOM} />
                        </>
                    )}
                    <ClickToPlace onPick={setCoords} />
                </MapContainer>
            </div>

            <div className="loc-picker__hint">
                {hasPin ? (
                    <span><MapPin size={14} /> Pin'ni surat orqali aniq joyga ko'chiring yoki xaritada boshqa joyni bosing</span>
                ) : (
                    <span><MapPin size={14} /> Xaritada joyni bosing yoki pastdagi tugmalardan birini ishlatib boshlang</span>
                )}
            </div>

            <div className="loc-picker__actions">
                <button type="button" className="loc-picker__btn" onClick={handleUseMyLocation} disabled={gpsLoading}>
                    {gpsLoading ? <Loader2 size={14} className="loc-spin" /> : <Crosshair size={14} />}
                    Joriy joyim
                </button>
                <div className="loc-picker__link-input">
                    <LinkIcon size={14} />
                    <input
                        type="text"
                        value={linkInput}
                        onChange={(e) => { setLinkInput(e.target.value); setLinkError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePasteLink(); } }}
                        placeholder="Google/Yandex Maps havolasi (maps.app.goo.gl/... ham mumkin)"
                        disabled={linkLoading}
                    />
                    <button type="button" className="loc-picker__btn loc-picker__btn--ghost" onClick={handlePasteLink} disabled={linkLoading || !linkInput.trim()}>
                        {linkLoading ? <Loader2 size={14} className="loc-spin" /> : 'Qo\'llash'}
                    </button>
                </div>
            </div>

            {(gpsError || linkError) && (
                <div className="loc-picker__error">
                    {gpsError || linkError}
                </div>
            )}

            {hasPin && (
                <div className="loc-picker__coords">
                    📍 {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                </div>
            )}
        </div>
    );
}
