import { useRef, useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../shared/api/axios';
import '../../pages/checkin/CheckIn.css';

const fmt = (n) => n ? Number(n).toLocaleString('en-US').replace(/,/g, '\u00A0') : '0';

export default function ClinicReception() {
    const [scanning, setScanning] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [appt, setAppt] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [errMsg, setErrMsg] = useState('');
    const scannerRef = useRef(null);
    const html5Ref = useRef(null);

    const startScanner = async () => {
        setErrMsg('');
        if (html5Ref.current) return;
        const scanner = new Html5Qrcode('cr-qr-reader');
        html5Ref.current = scanner;
        try {
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 260, height: 260 } },
                (text) => {
                    stopScanner();
                    lookupQr(text);
                },
                () => {}
            );
            setScanning(true);
        } catch (e) {
            setErrMsg('Kamera ochilmadi: ' + e);
            html5Ref.current = null;
        }
    };

    const stopScanner = async () => {
        if (html5Ref.current) {
            try { await html5Ref.current.stop(); } catch {}
            html5Ref.current = null;
        }
        setScanning(false);
    };

    useEffect(() => { return () => { stopScanner(); }; }, []);

    const lookupQr = async (raw) => {
        setErrMsg('');
        setAppt(null);
        setConfirmed(false);
        let token = raw;
        if (raw.startsWith('{')) {
            try { const p = JSON.parse(raw); if (p?.t) token = p.t; } catch {}
        }
        try {
            const res = await api.post('/clinic/appointments/confirm-cash', { qrToken: token });
            setAppt(res.data?.data);
            setConfirmed(true);
        } catch (e) {
            const msg = e.response?.data?.error?.message || e.response?.data?.message || 'QR topilmadi';
            setErrMsg(msg);
        }
    };

    const handleManual = () => {
        if (!manualToken.trim()) return;
        lookupQr(manualToken.trim());
    };

    const reset = () => {
        setAppt(null);
        setConfirmed(false);
        setErrMsg('');
        setManualToken('');
    };

    return (
        <div className="cr-page">
            <div className="cr-header">
                <div>
                    <h1>💳 Kassa — Naqd to'lovni tasdiqlash</h1>
                    <p>Bemorning QR kodini skanlang yoki qo'lda kiriting</p>
                </div>
            </div>

            <div className="cr-body">
                {/* Scanner section */}
                {!confirmed && (
                    <div className="cr-scanner-box">
                        <h3>Bemor QR kodini skanlash</h3>

                        {!scanning ? (
                            <button className="ci-btn-primary" onClick={startScanner}>
                                📷 Kamerani ochish
                            </button>
                        ) : (
                            <button className="ci-btn-ghost" onClick={stopScanner}>
                                ⏹ To'xtatish
                            </button>
                        )}

                        <div id="cr-qr-reader" style={{ marginTop: 12 }} />

                        <div className="cr-manual-input">
                            <input
                                type="text"
                                placeholder="Yoki QR tokenni qo'lda kiriting..."
                                value={manualToken}
                                onChange={e => setManualToken(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleManual()}
                            />
                            <button onClick={handleManual}>Tekshir</button>
                        </div>

                        {errMsg && <div className="cr-error-box">{errMsg}</div>}
                    </div>
                )}

                {/* Result */}
                {confirmed && appt && (
                    <div className="cr-result-card">
                        <h3>✅ To'lov qabul qilindi</h3>

                        <div className="cr-patient-info">
                            <div className="cr-info-row">
                                <span>Bron №</span>
                                <strong>{appt.bookingNumber}</strong>
                            </div>
                            <div className="cr-info-row">
                                <span>Bemor</span>
                                <strong>{appt.patient?.firstName} {appt.patient?.lastName}</strong>
                            </div>
                            <div className="cr-info-row">
                                <span>Telefon</span>
                                <strong>{appt.patient?.phone}</strong>
                            </div>
                            <div className="cr-info-row">
                                <span>Xizmat</span>
                                <strong>{appt.diagnosticService?.nameUz || appt.surgicalService?.nameUz || 'Xizmat'}</strong>
                            </div>
                            <div className="cr-info-row">
                                <span>Sana</span>
                                <strong>{new Date(appt.scheduledAt).toLocaleDateString('uz-UZ')}</strong>
                            </div>
                        </div>

                        <div className="cr-amount-box">
                            <div className="cr-amount-label">Qabul qilingan summa</div>
                            <div className="cr-amount-value">{fmt(appt.finalPrice || appt.price)} so'm</div>
                        </div>

                        <div className="cr-paid-badge">
                            ✓ Naqd to'lov muvaffaqiyatli qabul qilindi
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <button className="ci-btn-primary" onClick={reset}>
                                Keyingi bemorni skanlaish
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
