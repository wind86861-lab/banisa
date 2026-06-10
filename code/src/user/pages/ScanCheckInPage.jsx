import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, Camera, AlertCircle, Loader2, Keyboard, Flashlight } from 'lucide-react';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import './css/ScanCheckInPage.css';

const READER_ID = 'banisa-qr-reader';

// Parse a QR payload into a clinic check-in secret.
// Accepts:
//   - https://banisa.uz/checkin/<secret>
//   - /checkin/<secret>
//   - bare <secret>
function parseSecret(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    const m = trimmed.match(/\/checkin\/([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{6,}$/.test(trimmed)) return trimmed;
    return null;
}

export default function ScanCheckInPage() {
    const navigate = useNavigate();
    const { user, isLoading: authLoading, ensurePatientAuth } = useUserAuth();
    const scannerRef = useRef(null);
    const geoRef = useRef(null);
    const [state, setState] = useState('starting'); // starting | scanning | denied | error | done
    const [errMsg, setErrMsg] = useState('');
    const [manualOpen, setManualOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [resolvedUser, setResolvedUser] = useState(null);

    // Bot opens this page as a Mini App. The initial render can see user=null
    // while ensurePatientAuth is mid-flight; the old check redirected to
    // /user/login during that race, UserLoginPage's Mini App auto-login then
    // bounced us back to the default landing — the patient never reached
    // the scanner. Wait for the resolver to settle before deciding.
    useEffect(() => {
        if (user) { setResolvedUser(user); return; }
        if (!ensurePatientAuth) return;
        let cancelled = false;
        (async () => {
            const u = await ensurePatientAuth();
            if (cancelled) return;
            if (u) setResolvedUser(u);
            else navigate(`/user/login?redirect=${encodeURIComponent('/user/scan-checkin')}`);
        })();
        return () => { cancelled = true; };
    }, [user, ensurePatientAuth, navigate]);

    useEffect(() => {
        if (!resolvedUser) return;

        // Ask for geolocation in parallel — non-blocking. If user denies we just
        // proceed without GPS (backend treats missing coords as a soft pass).
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => { geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
                () => { /* denied or failed — proceed without */ },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
            );
        }

        const finalize = (decoded) => {
            const secret = parseSecret(decoded);
            if (!secret) return false;
            setState('done');
            const geo = geoRef.current;
            const params = geo ? `?lat=${geo.lat}&lng=${geo.lng}` : '';
            navigate(`/checkin/${secret}${params}`, { replace: true });
            return true;
        };

        // ─── Telegram Mini App native scanner (preferred) ──────────────
        // html5-qrcode relies on getUserMedia, which is unreliable inside
        // Telegram WebViews on some Android/iOS builds — the permission
        // dialog accepts but the <video> stream never paints, leaving the
        // patient staring at a black box. Telegram's own showScanQrPopup
        // delegates to the platform camera so it always works once the
        // user is in a Mini App.
        const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
        if (tg && typeof tg.showScanQrPopup === 'function' && tg.initData) {
            try {
                setState('scanning');
                tg.showScanQrPopup(
                    { text: 'Klinika QR kodini skanlang' },
                    (decoded) => {
                        if (finalize(decoded)) {
                            try { tg.closeScanQrPopup?.(); } catch { /* ignore */ }
                            return true; // tells Telegram to close the popup
                        }
                        return false; // keep scanning
                    },
                );
                return () => {
                    try { tg.closeScanQrPopup?.(); } catch { /* ignore */ }
                };
            } catch (e) {
                // Older clients lacking the API fall through to html5-qrcode.
                console.warn('[checkin] showScanQrPopup failed, falling back:', e);
            }
        }

        // ─── Browser fallback: html5-qrcode + getUserMedia ─────────────
        const scanner = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = scanner;

        const onSuccess = async (decoded) => {
            if (!parseSecret(decoded)) return;
            try { await scanner.stop(); await scanner.clear(); } catch { /* ignore */ }
            finalize(decoded);
        };

        const start = async () => {
            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
                    onSuccess,
                    () => { /* per-frame errors are silent */ },
                );
                setState('scanning');
                try {
                    const caps = scanner.getRunningTrackCapabilities && scanner.getRunningTrackCapabilities();
                    if (caps && caps.torch) setTorchSupported(true);
                } catch { /* ignore */ }
            } catch (e) {
                const msg = String(e?.message || e || '');
                if (/Permission|NotAllowed|denied/i.test(msg)) {
                    setState('denied');
                } else {
                    setErrMsg(msg || 'Kamerani ishga tushirib bo\'lmadi');
                    setState('error');
                }
            }
        };
        start();

        return () => {
            (async () => {
                try { await scanner.stop(); } catch { /* ignore */ }
                try { await scanner.clear(); } catch { /* ignore */ }
            })();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedUser]);

    return (
        <div className="scan-page">
            <header className="scan-header">
                <button className="scan-back" onClick={() => navigate(-1)} aria-label="Orqaga">
                    <ArrowLeft size={20} />
                </button>
                <h1>Klinika QR kodini skanerlang</h1>
            </header>

            <div className="scan-stage">
                <div id={READER_ID} className="scan-reader" />
                {state === 'starting' && (
                    <div className="scan-overlay">
                        <Loader2 size={32} className="scan-spin" />
                        <p>Kamera ishga tushirilmoqda...</p>
                    </div>
                )}
                {state === 'scanning' && (
                    <>
                        <div className="scan-hint">
                            <Camera size={18} />
                            <span>QR kodini ramka ichiga to'g'rilang</span>
                        </div>
                        {torchSupported && (
                            <button
                                className={`scan-torch ${torchOn ? 'scan-torch--on' : ''}`}
                                onClick={async () => {
                                    try {
                                        await scannerRef.current?.applyVideoConstraints({ advanced: [{ torch: !torchOn }] });
                                        setTorchOn(v => !v);
                                    } catch { /* ignore */ }
                                }}
                                aria-label="Fonar"
                            >
                                <Flashlight size={20} />
                            </button>
                        )}
                    </>
                )}
                {state === 'denied' && (
                    <div className="scan-overlay scan-overlay--err">
                        <AlertCircle size={32} />
                        <p>Kameradan foydalanishga ruxsat berilmagan.</p>
                        <p className="scan-sub">Brauzer sozlamalarida kamera ruxsatini yoqing va qaytadan urinib ko'ring.</p>
                        <button className="scan-btn" onClick={() => navigate('/user/appointments')}>
                            Bronlarimga qaytish
                        </button>
                    </div>
                )}
                {state === 'error' && (
                    <div className="scan-overlay scan-overlay--err">
                        <AlertCircle size={32} />
                        <p>Xatolik: {errMsg}</p>
                        <button className="scan-btn" onClick={() => window.location.reload()}>
                            Qayta urinish
                        </button>
                    </div>
                )}
            </div>

            <div className="scan-tip">
                <p>
                    Klinika devoridagi yoki resepshndagi <strong>Banisa QR</strong> kodini toping va kamerangiz bilan skanerlang.
                    QR topa olmasangiz qabulxonadan so'rang.
                </p>
                <button className="scan-manual-link" onClick={() => setManualOpen(true)}>
                    <Keyboard size={14} /> Yoki QR pastidagi kodni qo'lda kiriting
                </button>
            </div>

            {manualOpen && (
                <div className="scan-modal-overlay" onClick={() => setManualOpen(false)}>
                    <div className="scan-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Kodni qo'lda kiriting</h3>
                        <p className="scan-modal-sub">QR kod tagidagi harf-raqamli kodni kiriting.</p>
                        <input
                            autoFocus
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="Masalan: WHTF24..."
                            className="scan-modal-input"
                        />
                        <div className="scan-modal-actions">
                            <button className="scan-btn-secondary" onClick={() => { setManualOpen(false); setManualCode(''); }}>
                                Bekor qilish
                            </button>
                            <button
                                className="scan-btn"
                                disabled={!parseSecret(manualCode)}
                                onClick={() => {
                                    const secret = parseSecret(manualCode);
                                    if (!secret) return;
                                    const geo = geoRef.current;
                                    const params = geo ? `?lat=${geo.lat}&lng=${geo.lng}` : '';
                                    navigate(`/checkin/${secret}${params}`, { replace: true });
                                }}
                            >
                                Tasdiqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
