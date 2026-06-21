import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Crosshair, Loader2 } from 'lucide-react';

const TASHKENT_CENTER = [41.2995, 69.2401];
const NOMINATIM = 'https://nominatim.openstreetmap.org';

const pinIcon = L.divIcon({
    className: 'sky-pick-pin',
    html: `<div class="sky-pick-pin__inner"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

function RecenterOn({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords) map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 15));
    }, [coords?.lat, coords?.lng]);
    return null;
}

async function reverseGeocode(lat, lng, signal) {
    const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz,ru,en&zoom=18`;
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('reverse');
    const j = await r.json();
    return formatAddress(j);
}

async function searchPlaces(q, signal) {
    if (!q || q.trim().length < 3) return [];
    const url = `${NOMINATIM}/search?q=${encodeURIComponent(q)}` +
        `&format=json&limit=7&countrycodes=uz&accept-language=uz,ru,en&addressdetails=1`;
    const r = await fetch(url, { signal });
    if (!r.ok) return [];
    const j = await r.json();
    return j.map((it) => ({
        lat: parseFloat(it.lat),
        lng: parseFloat(it.lon),
        label: formatAddress(it),
        raw: it.display_name,
    }));
}

function formatAddress(n) {
    const a = n?.address || {};
    const parts = [];
    const street = a.road || a.pedestrian || a.path;
    const house = a.house_number;
    if (street) parts.push(house ? `${street}, ${house}` : street);
    const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
    if (area) parts.push(area);
    const city = a.city || a.town || a.village || a.county;
    if (city && !parts.includes(city)) parts.push(city);
    if (parts.length > 0) return parts.join(', ');
    return n?.display_name?.split(',').slice(0, 3).join(',') || 'Tanlangan joy';
}

export default function SkoryLocationPicker({ open, onClose, onPick, initial, userCoords }) {
    const startCoords = initial || userCoords || { lat: TASHKENT_CENTER[0], lng: TASHKENT_CENTER[1] };
    const [pin, setPin] = useState(startCoords);
    const [label, setLabel] = useState(initial?.label || '');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchAbort = useRef(null);
    const reverseAbort = useRef(null);
    const reverseTimer = useRef(null);

    useEffect(() => {
        if (!open) return;
        const s = initial || userCoords || { lat: TASHKENT_CENTER[0], lng: TASHKENT_CENTER[1] };
        setPin(s);
        setLabel(initial?.label || '');
        setQuery('');
        setResults([]);
        setShowResults(false);
        // First open with no label — try to resolve the starting pin.
        if (!initial?.label) {
            triggerReverse(s.lat, s.lng);
        }
        return () => {
            searchAbort.current?.abort();
            reverseAbort.current?.abort();
            if (reverseTimer.current) clearTimeout(reverseTimer.current);
        };
    }, [open]);

    function triggerReverse(lat, lng) {
        reverseAbort.current?.abort();
        if (reverseTimer.current) clearTimeout(reverseTimer.current);
        const ctrl = new AbortController();
        reverseAbort.current = ctrl;
        setResolving(true);
        reverseTimer.current = setTimeout(async () => {
            try {
                const text = await reverseGeocode(lat, lng, ctrl.signal);
                setLabel(text);
            } catch {
                setLabel('Tanlangan joy');
            } finally {
                setResolving(false);
            }
        }, 450);
    }

    function handleMapClick({ lat, lng }) {
        setPin({ lat, lng });
        triggerReverse(lat, lng);
    }

    useEffect(() => {
        if (!open) return;
        searchAbort.current?.abort();
        const ctrl = new AbortController();
        searchAbort.current = ctrl;
        if (!query || query.trim().length < 3) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const r = await searchPlaces(query, ctrl.signal);
                setResults(r);
                setShowResults(true);
            } catch {
                /* aborted */
            } finally {
                setSearching(false);
            }
        }, 320);
        return () => { clearTimeout(t); ctrl.abort(); };
    }, [query, open]);

    function pickResult(r) {
        setPin({ lat: r.lat, lng: r.lng });
        setLabel(r.label);
        setQuery('');
        setResults([]);
        setShowResults(false);
    }

    function confirm() {
        onPick({ lat: pin.lat, lng: pin.lng, label: label || 'Tanlangan joy' });
    }

    function useMyLocation() {
        if (userCoords) {
            setPin(userCoords);
            triggerReverse(userCoords.lat, userCoords.lng);
            return;
        }
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setPin(c);
                triggerReverse(c.lat, c.lng);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 6000 },
        );
    }

    const center = useMemo(() => [pin.lat, pin.lng], [pin.lat, pin.lng]);

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="sky-pick-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="sky-pick"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ y: 18, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 18, opacity: 0, scale: 0.98 }}
                >
                    <div className="sky-pick__head">
                        <div className="sky-pick__title">
                            <MapPin size={16} />
                            <span>Manzilni tanlang</span>
                        </div>
                        <button className="sky-pick__close" onClick={onClose} aria-label="Yopish">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="sky-pick__search">
                        <Search size={15} className="sky-pick__search-ico" />
                        <input
                            className="sky-pick__input"
                            placeholder="Ko'cha, tuman yoki joy nomi (masalan: Chilonzor 12)"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => results.length > 0 && setShowResults(true)}
                        />
                        {searching && <Loader2 size={14} className="sky-pick__spin" />}
                        {showResults && results.length > 0 && (
                            <div className="sky-pick__results">
                                {results.map((r, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="sky-pick__result"
                                        onClick={() => pickResult(r)}
                                    >
                                        <MapPin size={12} />
                                        <div>
                                            <div className="sky-pick__result-main">{r.label}</div>
                                            <div className="sky-pick__result-sub">{r.raw}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {showResults && !searching && results.length === 0 && query.trim().length >= 3 && (
                            <div className="sky-pick__results sky-pick__results--empty">
                                Hech narsa topilmadi
                            </div>
                        )}
                    </div>

                    <div className="sky-pick__map-wrap">
                        <MapContainer
                            center={center}
                            zoom={15}
                            scrollWheelZoom
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={center} icon={pinIcon} />
                            <ClickHandler onPick={handleMapClick} />
                            <RecenterOn coords={pin} />
                        </MapContainer>
                        <div className="sky-pick__hint">
                            <Crosshair size={11} /> Xaritani bosib pin qo'ying
                        </div>
                        <button
                            type="button"
                            className="sky-pick__mylocation"
                            onClick={useMyLocation}
                            title="Mening joyim"
                        >
                            <Crosshair size={14} />
                        </button>
                    </div>

                    <div className="sky-pick__footer">
                        <div className="sky-pick__addr">
                            <MapPin size={13} />
                            <span>
                                {resolving
                                    ? 'Manzil aniqlanmoqda...'
                                    : (label || 'Manzil tanlanmagan')}
                            </span>
                        </div>
                        <div className="sky-pick__actions">
                            <button type="button" className="sky-pick__cancel" onClick={onClose}>
                                Bekor qilish
                            </button>
                            <button type="button" className="sky-pick__confirm" onClick={confirm}>
                                Saqlash
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
