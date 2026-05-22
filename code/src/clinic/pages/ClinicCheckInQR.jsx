import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, RefreshCw, Info } from 'lucide-react';
import api from '../../shared/api/axios';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './clinic-checkin-qr.css';

// Printable check-in QR poster. Visual design matches the "Banisa QR Card"
// preview the team approved. Print rules in clinic-checkin-qr.css strip the
// clinic shell (sidebar/topbar) and center just the card on the sheet.
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
            // Render at high res so prints stay crisp on A4 as well as A6.
            const url = await QRCode.toDataURL(d.qrUrl, {
                errorCorrectionLevel: 'H',
                margin: 0,
                width: 720,
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
                {/* Card (this is the only thing that prints) */}
                <div className="qrp-card-wrap">
                    <article className="qrcard" aria-label="Check-in QR kartasi">
                        <div className="qrcard__brand">banisa</div>
                        <div className="qrcard__clinic">{data?.clinicName || 'Klinika'}</div>

                        <div className="qrcard__panel">
                            <span className="qrcard__panel-corner qrcard__panel-corner--tl" />
                            <span className="qrcard__panel-corner qrcard__panel-corner--tr" />
                            <span className="qrcard__panel-corner qrcard__panel-corner--bl" />
                            {qrDataUrl && (
                                <img src={qrDataUrl} alt="Check-in QR" className="qrcard__qr-img" />
                            )}
                        </div>

                        <div className="qrcard__caption">CHECK-IN QR</div>
                        <p className="qrcard__hint">
                            Telefon kamerangiz bilan skanlang
                        </p>
                    </article>
                </div>

                {/* Side panel — hidden on print */}
                <aside className="qrp-info no-print">
                    <h3><Info size={16} /> Qo'llanma</h3>
                    <ol>
                        <li>Kartani bosib chiqaring (A6 yoki A4, ranglarda).</li>
                        <li>Klinika kirishi yoki qabulxonaga ko'rinarli joyga yopishtiring.</li>
                        <li>Bemor klinikaga kelganida telefoni kamerasi bilan QRni skanlaydi.</li>
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
