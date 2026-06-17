import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, RefreshCw, Info, Maximize2 } from 'lucide-react';
import api from '../../shared/api/axios';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './clinic-checkin-qr.css';

// Screen + print size options. Values pinned in CSS via .qr-card--<size>
// (screen widths + em base) and an @page rule injected from React for the
// paper choice — @page can't be scoped to a class so we have to push the
// rule in dynamically.
const SCREEN_SIZES = [
    { id: 'S', label: 'Kichik', hint: '320px' },
    { id: 'M', label: "O'rta",   hint: '380px' },
    { id: 'L', label: 'Katta',   hint: '480px' },
];
const PAPER_SIZES = [
    { id: 'A6', label: 'A6', hint: '105×148 mm' },
    { id: 'A5', label: 'A5', hint: '148×210 mm' },
    { id: 'A4', label: 'A4', hint: '210×297 mm' },
];

// Card width per paper (mm). Leaves a balanced margin inside the page.
const PAPER_CARD_MM = { A6: 92, A5: 135, A4: 180 };
const PAPER_QR_EM   = { A6: 14, A5: 16, A4: 18 };

// Pixel-faithful port of the "Banisa QR Card" preview. Visual contract lives
// in clinic-checkin-qr.css; print rules there also strip the clinic shell.
export default function ClinicCheckInQR() {
    const [data, setData] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [size, setSize] = useState(() => {
        const v = typeof window !== 'undefined' && localStorage.getItem('qr_screen_size');
        return v && SCREEN_SIZES.some(s => s.id === v) ? v : 'M';
    });
    const [paper, setPaper] = useState(() => {
        const v = typeof window !== 'undefined' && localStorage.getItem('qr_print_paper');
        return v && PAPER_SIZES.some(p => p.id === v) ? v : 'A6';
    });

    useEffect(() => { localStorage.setItem('qr_screen_size', size); }, [size]);

    // Push an @page + .qr-card override into the document for the chosen
    // paper. Without this every print job falls back to the static A6 rule
    // baked into clinic-checkin-qr.css. The style element is hot-swapped
    // when the paper choice changes.
    useEffect(() => {
        localStorage.setItem('qr_print_paper', paper);
        let el = document.getElementById('qr-paper-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'qr-paper-style';
            document.head.appendChild(el);
        }
        const cardMm = PAPER_CARD_MM[paper];
        const qrEm = PAPER_QR_EM[paper];
        el.textContent = `@media print {
            @page { size: ${paper} portrait; margin: 6mm; }
            .qr-card { width: ${cardMm}mm !important; max-width: ${cardMm}mm !important; }
            .qr-card__qr { width: ${qrEm}em !important; height: ${qrEm}em !important; }
        }`;
        return () => {
            // keep the style around for the next print — only remove on unmount
        };
    }, [paper]);

    useEffect(() => () => {
        const el = document.getElementById('qr-paper-style');
        if (el) el.remove();
    }, []);

    const fetchQr = async () => {
        setLoading(true);
        setErr('');
        try {
            const res = await api.get('/clinic/appointments/checkin-qr');
            const d = res.data?.data;
            if (!d?.qrUrl) throw new Error("QR URL bo'sh — admin bilan bog'laning");
            setData(d);
            const url = await QRCode.toDataURL(d.qrUrl, {
                errorCorrectionLevel: 'H',
                margin: 0,
                width: 1200,
                color: { dark: '#0f172a', light: '#ffffff' },
            });
            setQrDataUrl(url);
        } catch (e) {
            setErr(e.response?.data?.message || e.message || 'QR yuklanmadi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQr(); }, []);

    if (loading) return <BanisaLoader message="QR kod yuklanmoqda..." />;

    if (err) {
        return (
            <div className="qrp-page">
                <div className="qrp-error">
                    <h2>QR yuklanmadi</h2>
                    <p style={{ marginTop: 8 }}>{err}</p>
                    <button className="qrp-btn qrp-btn--primary" onClick={fetchQr} style={{ marginTop: 16 }}>
                        <RefreshCw size={15} /> Qayta urinish
                    </button>
                </div>
            </div>
        );
    }

    // Short, ellipsis-friendly URL for the chip (full URL still in the side panel).
    const shortUrl = (() => {
        if (!data?.qrUrl) return '';
        try {
            const u = new URL(data.qrUrl);
            const path = u.pathname.length > 18 ? u.pathname.slice(0, 18) + '…' : u.pathname;
            return `${u.host}${path}`;
        } catch {
            return data.qrUrl.replace(/^https?:\/\//, '');
        }
    })();

    return (
        <div className="qrp-page">
            <div className="qrp-header">
                <div>
                    <h1>Check-in QR kodi</h1>
                    <p>Quyidagi kartani chop eting va klinika kirishida ko'rinarli joyga osib qo'ying. Bemorlar telefon kamerasi orqali skanlab keladi.</p>
                </div>
                <div className="qrp-actions">
                    <button className="qrp-btn" onClick={fetchQr} title="Qayta yuklash">
                        <RefreshCw size={15} /> Yangilash
                    </button>
                    <button className="qrp-btn qrp-btn--primary" onClick={() => window.print()}>
                        <Printer size={15} /> Chop etish
                    </button>
                </div>
            </div>

            <div className="qrp-size-bar no-print">
                <div className="qrp-size-group">
                    <span className="qrp-size-label"><Maximize2 size={13} /> Ekran o'lchami</span>
                    <div className="qrp-chip-row">
                        {SCREEN_SIZES.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                className={`qrp-chip${size === s.id ? ' qrp-chip--active' : ''}`}
                                onClick={() => setSize(s.id)}
                                title={s.hint}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="qrp-size-group">
                    <span className="qrp-size-label"><Printer size={13} /> Chop etish qog'ozi</span>
                    <div className="qrp-chip-row">
                        {PAPER_SIZES.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                className={`qrp-chip${paper === p.id ? ' qrp-chip--active' : ''}`}
                                onClick={() => setPaper(p.id)}
                                title={p.hint}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="qrp-layout">
                {/* The card (only thing that prints) */}
                <div className="qrp-card-wrap">
                    <article className={`qr-card qr-card--${size}`} aria-label="Check-in QR kartasi">
                        {/* Brand pill */}
                        <div className="qr-card__brand">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="12" r="3.5" fill="#0d9488" />
                                <circle cx="12" cy="3" r="1.8" fill="#0d9488" />
                                <circle cx="20.78" cy="7.5" r="1.8" fill="#0d9488" />
                                <circle cx="20.78" cy="16.5" r="1.8" fill="#0d9488" />
                                <circle cx="12" cy="21" r="1.8" fill="#0d9488" />
                                <circle cx="3.22" cy="16.5" r="1.8" fill="#0d9488" />
                                <circle cx="3.22" cy="7.5" r="1.8" fill="#0d9488" />
                            </svg>
                            <span>Banisa</span>
                        </div>

                        {/* Clinic head */}
                        <div className="qr-card__head">
                            <h2 className="qr-card__name">{data?.clinicName || 'Klinika'}</h2>
                            <p className="qr-card__sub">QR kodni skanlab klinikaga kelganingizni tasdiqlang</p>
                        </div>

                        {/* QR frame with L-bracket corners */}
                        <div className="qr-card__frame">
                            <span className="qr-card__corner qr-card__corner--tl" />
                            <span className="qr-card__corner qr-card__corner--tr" />
                            <span className="qr-card__corner qr-card__corner--bl" />
                            <span className="qr-card__corner qr-card__corner--br" />
                            {qrDataUrl && (
                                <img src={qrDataUrl} alt="Check-in QR" className="qr-card__qr" />
                            )}
                        </div>

                        {/* Foot */}
                        <div className="qr-card__foot">
                            <div className="qr-card__cta">📷 Kamera bilan <b>skan qiling</b></div>
                            {shortUrl && <div className="qr-card__url" title={data?.qrUrl}>{shortUrl}</div>}
                            <div className="qr-card__steps">
                                <div className="qr-card__step"><span className="qr-card__step-n">1</span>Skan</div>
                                <div className="qr-card__step"><span className="qr-card__step-n">2</span>Tasdiq</div>
                                <div className="qr-card__step"><span className="qr-card__step-n">3</span>Qabul</div>
                            </div>
                        </div>
                    </article>
                </div>

                {/* Side panel — hidden on print */}
                <aside className="qrp-info no-print">
                    <h3><Info size={16} /> Qo'llanma</h3>
                    <ol>
                        <li>Kartani bosib chiqaring (A6 yoki A4, ranglarda).</li>
                        <li>Klinika kirishi yoki qabulxonaga ko'rinarli joyga yopishtiring.</li>
                        <li>Bemor klinikaga kelganida telefon kamerasi bilan QRni skanlaydi.</li>
                        <li>Bemor "Klinikadaman" deb tasdiqlagach, sizning bildirishnomalaringizga keladi.</li>
                        <li>Naqd to'lov bo'lsa, bemor kassada to'laydi — siz <strong>Kassa navbati</strong> sahifasida tasdiqlaysiz.</li>
                    </ol>
                    {data?.qrUrl && (
                        <div className="qrp-info__url" title="QR ichidagi havola">
                            {data.qrUrl}
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
