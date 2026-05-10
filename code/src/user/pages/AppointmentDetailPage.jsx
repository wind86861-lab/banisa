import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    ArrowLeft, CheckCircle2, Clock, CreditCard, Building2, Phone, MapPin,
    Calendar, FileText, Tag, AlertCircle, QrCode, Camera, X
} from 'lucide-react';
import api, { getAccessToken } from '../../shared/api/axios';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/AppointmentDetailPage.css';

const STATUS_LABELS = {
    PENDING: { text: 'Operator kutmoqda', color: '#D97706', bg: '#FEF3C7' },
    PENDING_ARRIVAL: { text: 'Klinikaga kelish kutilmoqda', color: '#EA580C', bg: '#FFEDD5' },
    OPERATOR_CONFIRMED: { text: 'Operator tasdiqladi', color: '#2563EB', bg: '#DBEAFE' },
    SENT_TO_CLINIC: { text: 'Klinikada ko\'rib chiqilmoqda', color: '#2563EB', bg: '#DBEAFE' },
    CLINIC_ACCEPTED: { text: 'Klinika qabul qildi', color: '#059669', bg: '#D1FAE5' },
    PAID: { text: 'To\'langan — QR tayyor', color: '#059669', bg: '#D1FAE5' },
    CHECKED_IN: { text: 'Klinikada check-in qilindi', color: '#7C3AED', bg: '#EDE9FE' },
    IN_PROGRESS: { text: 'Xizmat jarayonda', color: '#7C3AED', bg: '#EDE9FE' },
    COMPLETED: { text: 'Yakunlangan', color: '#065F46', bg: '#D1FAE5' },
    CANCELLED: { text: 'Bekor qilingan', color: '#991B1B', bg: '#FEE2E2' },
    NO_SHOW: { text: 'Bemor kelmadi', color: '#991B1B', bg: '#FEE2E2' },
    RESCHEDULED: { text: 'Vaqt o\'zgartirildi', color: '#D97706', bg: '#FEF3C7' },
};

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function AppointmentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [qrSrc, setQrSrc] = useState(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState('');
    const html5Ref = useRef(null);

    const stopScanner = async () => {
        if (html5Ref.current) {
            try { await html5Ref.current.stop(); } catch { }
            try { html5Ref.current.clear(); } catch { }
            html5Ref.current = null;
        }
    };

    const closeScanner = async () => {
        await stopScanner();
        setScannerOpen(false);
        setScanError('');
    };

    const handleScanResult = async (text) => {
        // Clinic wall QR contains URL like https://banisa.uz/checkin/{secret}
        // Extract the secret and navigate.
        let secret = text.trim();
        const match = secret.match(/\/checkin\/([A-Za-z0-9_-]+)/);
        if (match) secret = match[1];
        if (!/^[A-Za-z0-9_-]{8,}$/.test(secret)) {
            setScanError("Noto'g'ri QR kod. Klinika devoridagi QR ni skanlang.");
            return;
        }
        await stopScanner();
        setScannerOpen(false);
        navigate(`/checkin/${secret}`);
    };

    useEffect(() => {
        if (!scannerOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const scanner = new Html5Qrcode('apd-qr-reader');
                html5Ref.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 260, height: 260 } },
                    (text) => { if (!cancelled) handleScanResult(text); },
                    () => { }
                );
            } catch (e) {
                setScanError('Kamerani ochib bo\'lmadi: ' + (e?.message || e));
            }
        })();
        return () => { cancelled = true; stopScanner(); };
    }, [scannerOpen]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['appointment', id, 'v2'], // Cache-busting version
        queryFn: async () => {
            const res = await api.get(`/user/appointments/${id}`);
            return res.data.data;
        },
        retry: false, // Disable all retries to prevent loops
        refetchInterval: false,
        retryOnMount: false,
        refetchOnWindowFocus: false,
    });

    // Fetch QR image as authenticated blob URL when paid OR when cash+CHECKED_IN
    const isCash = data?.paymentMethod === 'CASH';
    const showQrForCash = isCash && ['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'].includes(data?.status);
    const showQr = data?.paymentStatus === 'PAID' || showQrForCash;

    useEffect(() => {
        if (!data || !showQr) {
            setQrSrc(null);
            return;
        }
        let cancelled = false;
        let blobUrl = null;
        (async () => {
            try {
                const res = await api.get(`/user/appointments/${id}/qr.png`, { responseType: 'blob' });
                if (cancelled) return;
                blobUrl = URL.createObjectURL(res.data);
                setQrSrc(blobUrl);
            } catch (e) {
                console.error('QR load failed', e);
            }
        })();
        return () => {
            cancelled = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [showQr, id]);

    const cancel = async () => {
        if (!window.confirm('Bronni bekor qilmoqchimisiz?')) return;
        try {
            await api.post(`/user/appointments/${id}/cancel`, { reason: 'Bemor bekor qildi' });
            refetch();
        } catch (e) {
            alert(e.response?.data?.error?.message || e.response?.data?.message || 'Xatolik yuz berdi');
        }
    };

    if (isLoading) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div className="apd-loading"><p>Yuklanmoqda...</p></div>
                <Footer />
            </div>
        );
    }

    if (error) {
        // Check if it's an auth error
        if (error?.response?.status === 401 || error?.response?.status === 429) {
            // Force redirect to login for auth errors
            if (typeof window !== 'undefined') {
                window.location.href = '/user/login';
            }
            return null;
        }
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div className="apd-error">
                    <AlertCircle size={48} />
                    <h3>Bron topilmadi</h3>
                    <Link to="/user/appointments">Bronlarga qaytish</Link>
                </div>
                <Footer />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div className="apd-loading"><p>Yuklanmoqda...</p></div>
                <Footer />
            </div>
        );
    }

    const status = STATUS_LABELS[data.status] || STATUS_LABELS.PENDING;
    const serviceName =
        data.diagnosticService?.nameUz ||
        data.surgicalService?.nameUz ||
        'Xizmat';
    const date = new Date(data.scheduledAt);
    const canCancel = ['PENDING', 'PENDING_ARRIVAL', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED'].includes(data.status);
    const canPay = ['CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC'].includes(data.status) && data.paymentStatus !== 'PAID';
    const isPendingArrival = data.status === 'PENDING_ARRIVAL' && isCash;

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="apd-main">
                <button className="apd-back" onClick={() => navigate('/user/appointments')}>
                    <ArrowLeft size={18} /> Bronlarga qaytish
                </button>

                <div className="apd-header">
                    <div>
                        <h1 className="apd-booking-number">{data.bookingNumber}</h1>
                        <p className="apd-subtitle">Bron tafsilotlari</p>
                    </div>
                    <span className="apd-status" style={{ background: status.bg, color: status.color }}>
                        {status.text}
                    </span>
                </div>

                <div className="apd-grid">
                    {/* Left column: QR + info */}
                    <div className="apd-col-left">
                        {/* PENDING_ARRIVAL: Check-in CTA */}
                        {isPendingArrival && (
                            <div className="apd-checkin-card">
                                <div className="apd-checkin-icon">📲</div>
                                <h3>Klinikaga boring va QR skanlang</h3>
                                <p>Klinikaga yetib borgach, ular devoridagi QR kodni skanlab check-in qiling. Shundan so'ng xodim naqd to'lovni qabul qiladi.</p>
                                <div className="apd-checkin-steps">
                                    <div className="apd-checkin-step"><span>1</span> Klinikaga boring</div>
                                    <div className="apd-checkin-step"><span>2</span> QR kodni kamerangiz bilan skanlang</div>
                                    <div className="apd-checkin-step"><span>3</span> Check-in tugadi — xodimga to'lash</div>
                                </div>
                                <div className="apd-checkin-amount">
                                    <span>To'lov summasi:</span>
                                    <strong>{fmt(data.finalPrice || data.price)} so'm (naqd)</strong>
                                </div>
                                <button
                                    type="button"
                                    className="apd-scan-btn"
                                    onClick={() => { setScanError(''); setScannerOpen(true); }}
                                >
                                    <Camera size={18} /> QR skanerni ochish
                                </button>
                                <p className="apd-scan-hint">
                                    Yoki telefoningiz kamerasi bilan klinika devoridagi QR ni skanlang
                                </p>
                            </div>
                        )}

                        {/* QR Code Card — for paid or cash CHECKED_IN */}
                        {showQr && qrSrc && (
                            <div className="apd-qr-card">
                                <div className="apd-qr-header">
                                    <QrCode size={20} />
                                    <h3>{isCash ? 'Xodimga ko\'rsating' : 'Klinikaga ko\'rsating'}</h3>
                                </div>
                                <div className="apd-qr-img-wrap">
                                    <img src={qrSrc} alt="QR kod" className="apd-qr-img" />
                                </div>
                                <p className="apd-qr-note">
                                    {isCash
                                        ? 'Xodim ushbu QR kodni skanerlab naqd to\'lovni qabul qiladi'
                                        : `Klinika administratori ushbu QR kodni skanerlab sizga chegirma beradi`
                                    }
                                </p>
                                <div className="apd-qr-code-text">{data.bookingNumber}</div>
                            </div>
                        )}

                        {canPay && (
                            <div className="apd-pay-card">
                                <CreditCard size={32} />
                                <h3>To'lov qilish</h3>
                                <p>QR kodni olish uchun to'lovni amalga oshiring</p>
                                <div className="apd-price-summary">
                                    <div className="apd-price-row">
                                        <span>Narx:</span><span>{fmt(data.price)} so'm</span>
                                    </div>
                                    {data.discountPercent > 0 && (
                                        <div className="apd-price-row apd-discount">
                                            <span>Chegirma ({data.discountPercent}%):</span>
                                            <span>-{fmt(data.discountAmount)} so'm</span>
                                        </div>
                                    )}
                                    <div className="apd-price-row apd-total">
                                        <span>To'lov:</span><span>{fmt(data.finalPrice)} so'm</span>
                                    </div>
                                </div>
                                <button className="apd-pay-btn" onClick={() => navigate('/payment', { state: { bookingData: { skipCreate: true, appointmentId: data.id, price: data.finalPrice || data.price, clinicName: data.clinic?.nameUz || 'Klinika', serviceName: data.diagnosticService?.nameUz || data.surgicalService?.nameUz || 'Xizmat', scheduledAt: data.scheduledAt, selectedDate: data.scheduledAt?.split('T')[0] } } })}>
                                    To'lash <CreditCard size={16} />
                                </button>
                            </div>
                        )}

                        {data.status === 'COMPLETED' && (
                            <div className="apd-completed-card">
                                <CheckCircle2 size={48} />
                                <h3>Xizmat yakunlandi</h3>
                                <p>Xizmat uchun tashrifingizdan minnatdormiz!</p>
                            </div>
                        )}

                        {/* Info Card */}
                        <div className="apd-info-card">
                            <h3>Ma'lumot</h3>
                            <div className="apd-info-row">
                                <Building2 size={18} />
                                <div>
                                    <div className="apd-label">Klinika</div>
                                    <div className="apd-value">{data.clinic?.nameUz}</div>
                                </div>
                            </div>
                            {data.clinic?.street && (
                                <div className="apd-info-row">
                                    <MapPin size={18} />
                                    <div>
                                        <div className="apd-label">Manzil</div>
                                        <div className="apd-value">
                                            {data.clinic.street}, {data.clinic.district}, {data.clinic.region}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {Array.isArray(data.clinic?.phones) && data.clinic.phones[0] && (
                                <div className="apd-info-row">
                                    <Phone size={18} />
                                    <div>
                                        <div className="apd-label">Telefon</div>
                                        <div className="apd-value">{data.clinic.phones[0]}</div>
                                    </div>
                                </div>
                            )}
                            <div className="apd-info-row">
                                <FileText size={18} />
                                <div>
                                    <div className="apd-label">Xizmat</div>
                                    <div className="apd-value">{serviceName}</div>
                                </div>
                            </div>
                            <div className="apd-info-row">
                                <Calendar size={18} />
                                <div>
                                    <div className="apd-label">Sana va vaqt</div>
                                    <div className="apd-value">
                                        {date.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        {' — '}
                                        {date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column: price + timeline */}
                    <div className="apd-col-right">
                        <div className="apd-price-card">
                            <h3>To'lov xulosasi</h3>
                            <div className="apd-price-row">
                                <span>Narx:</span><span>{fmt(data.price)} so'm</span>
                            </div>
                            {data.discountPercent > 0 && (
                                <div className="apd-price-row apd-discount">
                                    <span>Chegirma ({data.discountPercent}%):</span>
                                    <span>-{fmt(data.discountAmount)} so'm</span>
                                </div>
                            )}
                            <div className="apd-price-divider" />
                            <div className="apd-price-row apd-total">
                                <span>Jami:</span><span>{fmt(data.finalPrice)} so'm</span>
                            </div>
                            <div className="apd-payment-status">
                                {data.paymentStatus === 'PAID' ? (
                                    <><CheckCircle2 size={16} /> To'langan</>
                                ) : (
                                    <><Clock size={16} /> To'lov kutilmoqda</>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        {Array.isArray(data.logs) && data.logs.length > 0 && (
                            <div className="apd-timeline-card">
                                <h3>Tarix</h3>
                                <ul className="apd-timeline">
                                    {data.logs.map((log) => (
                                        <li key={log.id} className="apd-timeline-item">
                                            <div className="apd-timeline-dot" />
                                            <div className="apd-timeline-content">
                                                <div className="apd-timeline-action">
                                                    {(STATUS_LABELS[log.newStatus]?.text) || log.action}
                                                </div>
                                                <div className="apd-timeline-time">
                                                    {new Date(log.createdAt).toLocaleString('uz-UZ')}
                                                </div>
                                                {log.note && <div className="apd-timeline-note">{log.note}</div>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {canCancel && (
                            <button className="apd-cancel-btn" onClick={cancel}>
                                Bronni bekor qilish
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* QR Scanner Modal */}
            {scannerOpen && (
                <div className="apd-scan-modal" onClick={closeScanner}>
                    <div className="apd-scan-modal-body" onClick={(e) => e.stopPropagation()}>
                        <div className="apd-scan-modal-header">
                            <h3><Camera size={18} /> Klinika QR ni skanlang</h3>
                            <button type="button" className="apd-scan-close" onClick={closeScanner} aria-label="Yopish">
                                <X size={20} />
                            </button>
                        </div>
                        <div id="apd-qr-reader" className="apd-qr-reader" />
                        {scanError && <p className="apd-scan-error">{scanError}</p>}
                        <p className="apd-scan-help">
                            Klinika devoridagi QR kodga kamerani yo'naltiring
                        </p>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
