import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, RefreshCw, Info } from 'lucide-react';
import api from '../../shared/api/axios';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './clinic-checkin-qr.css';

// Pixel-faithful port of the "Banisa QR Card" preview. Visual contract lives
// in clinic-checkin-qr.css; print rules there also strip the clinic shell.
export default function ClinicCheckInQR() {
    const [data, setData] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

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

            <div className="qrp-layout">
                {/* The card (only thing that prints) */}
                <div className="qrp-card-wrap">
                    <article className="qr-card" aria-label="Check-in QR kartasi">
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
