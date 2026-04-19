import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    QrCode, CheckCircle2, XCircle, Camera, Keyboard, User, Calendar, Tag, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '../../shared/api/axios';
import './ClinicQRScanner.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function ClinicQRScanner() {
    const scannerRegionId = 'clinic-qr-reader';
    const scannerRef = useRef(null);
    const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
    const [scanning, setScanning] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [result, setResult] = useState(null); // { success, data, error }
    const [submitting, setSubmitting] = useState(false);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch { /* noop */ }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const submitToken = async (token) => {
        if (!token || submitting) return;
        setSubmitting(true);
        setResult(null);
        try {
            const res = await api.post('/clinic/appointments/scan', { qrToken: token });
            setResult({ success: true, data: res.data.data });
            await stopScanner();
        } catch (err) {
            setResult({
                success: false,
                error: err.response?.data?.message || 'QR kodni tekshirishda xatolik',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const startCamera = async () => {
        setResult(null);
        if (scannerRef.current) await stopScanner();
        const html5Qr = new Html5Qrcode(scannerRegionId);
        scannerRef.current = html5Qr;
        try {
            await html5Qr.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 260, height: 260 } },
                (decoded) => {
                    submitToken(decoded);
                },
                () => { /* scan errors are noise */ }
            );
            setScanning(true);
        } catch (err) {
            setResult({
                success: false,
                error: 'Kamerani ochib bo\'lmadi. Iltimos, ruxsat bering yoki qo\'lda kiriting.',
            });
        }
    };

    useEffect(() => {
        return () => { stopScanner(); };
    }, []);

    const reset = async () => {
        setResult(null);
        setManualToken('');
        if (mode === 'camera') await startCamera();
    };

    return (
        <div className="cqs-page">
            <div className="cqs-header">
                <QrCode size={28} />
                <div>
                    <h1>QR kod skaneri</h1>
                    <p>Bemor QR kodini skanerlang yoki bron raqamini kiriting</p>
                </div>
            </div>

            <div className="cqs-mode-tabs">
                <button
                    className={`cqs-mode-tab ${mode === 'camera' ? 'active' : ''}`}
                    onClick={async () => { setMode('camera'); setResult(null); await startCamera(); }}
                >
                    <Camera size={18} /> Kamera
                </button>
                <button
                    className={`cqs-mode-tab ${mode === 'manual' ? 'active' : ''}`}
                    onClick={async () => { setMode('manual'); setResult(null); await stopScanner(); }}
                >
                    <Keyboard size={18} /> Qo'lda kiritish
                </button>
            </div>

            <div className="cqs-body">
                {mode === 'camera' && (
                    <div className="cqs-camera-wrap">
                        <div id={scannerRegionId} className="cqs-camera-region" />
                        {!scanning && !result && (
                            <button className="cqs-start-btn" onClick={startCamera}>
                                <Camera size={20} /> Kamerani yoqish
                            </button>
                        )}
                    </div>
                )}

                {mode === 'manual' && !result && (
                    <div className="cqs-manual">
                        <label>QR token yoki bron raqami</label>
                        <input
                            type="text"
                            placeholder="Bemor QR kodidagi token..."
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            disabled={submitting}
                        />
                        <button
                            className="cqs-submit-btn"
                            disabled={submitting || !manualToken.trim()}
                            onClick={() => submitToken(manualToken.trim())}
                        >
                            {submitting ? 'Tekshirilmoqda...' : 'Tekshirish'}
                        </button>
                    </div>
                )}

                {/* Result */}
                {result?.success && result.data && (
                    <ScanSuccess data={result.data} onReset={reset} />
                )}
                {result?.error && (
                    <div className="cqs-error">
                        <AlertCircle size={40} />
                        <h3>Xatolik</h3>
                        <p>{result.error}</p>
                        <button onClick={reset}><RefreshCw size={16} /> Qayta urinish</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ScanSuccess({ data, onReset }) {
    const serviceName =
        data.diagnosticService?.nameUz ||
        data.surgicalService?.nameUz ||
        'Xizmat';
    const date = new Date(data.scheduledAt);

    return (
        <div className="cqs-success">
            <div className="cqs-success-header">
                <CheckCircle2 size={40} />
                <h3>Bemor muvaffaqiyatli ro'yxatga olindi</h3>
            </div>

            <div className="cqs-card">
                <div className="cqs-row">
                    <User size={18} />
                    <div>
                        <div className="cqs-label">Bemor</div>
                        <div className="cqs-value">
                            {data.patient?.firstName} {data.patient?.lastName}
                            {data.patient?.phone && <span className="cqs-phone"> — {data.patient.phone}</span>}
                        </div>
                    </div>
                </div>
                <div className="cqs-row">
                    <Tag size={18} />
                    <div>
                        <div className="cqs-label">Xizmat</div>
                        <div className="cqs-value">{serviceName}</div>
                    </div>
                </div>
                <div className="cqs-row">
                    <Calendar size={18} />
                    <div>
                        <div className="cqs-label">Sana</div>
                        <div className="cqs-value">{date.toLocaleString('uz-UZ')}</div>
                    </div>
                </div>
                <div className="cqs-row">
                    <div className="cqs-booking-num">{data.bookingNumber}</div>
                </div>
            </div>

            <div className="cqs-discount-card">
                <div className="cqs-discount-label">Chegirma qo'llandi</div>
                <div className="cqs-discount-value">-{data.discountPercent}%</div>
                <div className="cqs-discount-breakdown">
                    <div><span>Narx:</span><span>{fmt(data.price)} so'm</span></div>
                    <div className="cqs-discount-amt">
                        <span>Chegirma:</span><span>-{fmt(data.discountAmount)} so'm</span>
                    </div>
                    <div className="cqs-final">
                        <span>Bemor to'lagan:</span><span>{fmt(data.finalPrice)} so'm</span>
                    </div>
                </div>
            </div>

            <button className="cqs-next-btn" onClick={onReset}>
                <QrCode size={18} /> Keyingi QR kod
            </button>
        </div>
    );
}
