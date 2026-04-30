import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import api from '../../shared/api/axios';
import '../../pages/checkin/CheckIn.css';

export default function ClinicCheckInQR() {
    const [data, setData] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const canvasRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/clinic/appointments/checkin-qr');
                const d = res.data?.data;
                setData(d);
                const url = await QRCode.toDataURL(d.qrUrl, {
                    errorCorrectionLevel: 'M',
                    margin: 2,
                    width: 400,
                    color: { dark: '#031B4E', light: '#ffffff' },
                });
                setQrDataUrl(url);
            } catch (e) {
                setErr(e.response?.data?.message || 'QR yuklanmadi');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handlePrint = () => window.print();

    if (loading) return <div className="ci-page"><div className="ci-spinner" /></div>;
    if (err) return <div className="ci-page"><div className="ci-card ci-card--error"><div className="ci-icon">⚠️</div><h2>{err}</h2></div></div>;

    return (
        <div className="cq-page">
            <div className="cr-header">
                <div>
                    <h1>🖨️ Check-in QR kodi</h1>
                    <p>Ushbu QR kodni bosib chiqaring va klinika kirishiga yopishtirib qo'ying</p>
                </div>
                <button className="cq-print-btn" onClick={handlePrint}>🖨️ Chop etish</button>
            </div>

            <div className="cq-body">
                <div className="cq-card">
                    <h2>{data?.clinicName}</h2>
                    <p>Bemor ushbu QR kodni skanlab klinikaga kelishini tasdiqlaydi</p>

                    <div className="cq-qr-container">
                        {qrDataUrl && (
                            <img src={qrDataUrl} alt="Klinika Check-in QR" className="cq-qr-img" />
                        )}
                        <div className="cq-url">{data?.qrUrl}</div>
                    </div>

                    <button className="cq-print-btn" onClick={handlePrint}>
                        🖨️ Chop etish
                    </button>
                </div>

                <div className="cq-instructions">
                    <h4>Qo'llanma</h4>
                    <ol>
                        <li>Ushbu sahifani chop eting va klinika kirishiga yopishtirib qo'ying.</li>
                        <li>Bemorlar klinikaga kelganda ushbu QR kodni telefon kamerasi bilan skanleydi.</li>
                        <li>Skanlagandan so'ng Banisa ilovasi check-in sahifasiga o'tadi.</li>
                        <li>Check-in muvaffaqiyatli bo'lgach, bemor o'z QR kodini ko'rsatadi.</li>
                        <li>Kassal xodimi bemorning QR kodini <strong>Kassa → Naqd to'lov</strong> bo'limida skanlab to'lovni tasdiqlaydi.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
