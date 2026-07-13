import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useRef } from 'react';
import {
    ArrowLeft, CheckCircle2, Clock, CreditCard, Building2, Phone, MapPin,
    Calendar, FileText, AlertCircle, Loader2, Navigation as NavIcon
} from 'lucide-react';
import api from '../../shared/api/axios';
import { statusLabel, nextActionFor, canCancel as canCancelFn, cancelPolicy, serviceNameOf } from '../../shared/utils/appointmentStatus';
import { fmtSum, fmtPhone, fmtDateTimeUz, shortBookingNo, mapsDirectionsUrl } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import ProgressTimeline from '../components/ProgressTimeline';
import ReviewWriteModal from '../components/ReviewWriteModal';
import DoctorReviewModal from '../components/DoctorReviewModal';
import { useQuery as useRq } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import './css/AppointmentDetailPage.css';

// Active poll cadence — 5 s while cashier confirmation is realistically
// imminent. After STALE_AFTER_MS the patient has clearly been waiting; we
// back off to 30 s to spare battery without losing freshness completely.
const POLL_MS_ACTIVE = 5000;
const POLL_MS_STALE = 30000;
const STALE_AFTER_MS = 2 * 60 * 1000;
// How long to wait for cashier confirmation before showing the "call clinic" fallback.
const CASHIER_WAIT_MS = 3 * 60 * 1000;

export default function AppointmentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Track when this view first mounted so we can downgrade the poll
    // cadence once the patient has been hanging on the page longer than
    // STALE_AFTER_MS without resolution. Stored in a ref so re-renders
    // don't reset the start time.
    const mountedAtRef = useRef(Date.now());

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['appointment', id, 'v3'],
        queryFn: async () => {
            const res = await api.get(`/user/appointments/${id}`);
            return res.data.data;
        },
        retry: false,
        // Live poll while the patient is mid-flow so cashier-side updates land
        // without a manual refresh. Idle terminal states stop polling. We
        // also halt completely when the tab is hidden — React Query
        // refetchOnWindowFocus brings us back when the tab returns, so
        // background tabs aren't burning the server.
        refetchInterval: (q) => {
            const a = q.state.data;
            if (!a) return false;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return false;
            }
            const live = ['CONFIRMED', 'CHECKED_IN'];
            if (!live.includes(a.status) || a.paymentStatus === 'PAID') return false;
            const elapsed = Date.now() - mountedAtRef.current;
            return elapsed < STALE_AFTER_MS ? POLL_MS_ACTIVE : POLL_MS_STALE;
        },
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    });

    const isCash = data?.paymentMethod === 'CASH';
    const action = useMemo(() => nextActionFor(data), [data]);

    // After a few minutes of waiting on the cashier, surface a fallback
    // (call the clinic) instead of an endless silent spinner.
    const [waitedLong, setWaitedLong] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [doctorReviewOpen, setDoctorReviewOpen] = useState(false);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const [cancelBusy, setCancelBusy] = useState(false);

    // Has the patient already reviewed this clinic? Drives the COMPLETED CTA.
    const { data: userReviews = [] } = useRq({
        queryKey: ['user', 'reviews'],
        queryFn: async () => {
            const res = await api.get('/user/reviews');
            return res.data?.data || [];
        },
        enabled: !!data && data.status === 'COMPLETED',
        staleTime: 30000,
    });
    const hasReviewed = !!(data?.clinic?.id && userReviews.some(r => r.clinicId === data.clinic.id));
    useEffect(() => {
        if (action?.cta !== 'await-cashier') { setWaitedLong(false); return; }
        const t = setTimeout(() => setWaitedLong(true), CASHIER_WAIT_MS);
        return () => clearTimeout(t);
    }, [action?.cta]);

    // Two-step cancel: first click flips into a confirm panel, second click
    // posts. Replaces native window.confirm/alert (browser dialogs blocked
    // by some Mini App contexts and look out of place against the page).
    const cancel = async () => {
        setCancelBusy(true);
        setCancelError('');
        try {
            await api.post(`/user/appointments/${id}/cancel`, { reason: 'Bemor bekor qildi' });
            setConfirmingCancel(false);
            refetch();
        } catch (e) {
            setCancelError(
                e.response?.data?.error?.message
                || e.response?.data?.message
                || 'Bekor qilishda xatolik yuz berdi',
            );
        } finally {
            setCancelBusy(false);
        }
    };

    if (isLoading) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div className="apd-loading"><Loader2 size={36} className="apd-spin" /><p>Yuklanmoqda...</p></div>
                <Footer />
            </div>
        );
    }

    if (error) {
        // 401 / 429 are handled centrally by the axios response interceptor
        // (silent refresh + soft redirect on terminal failure). Hard-jumping
        // here caused a double redirect and flashed the login page while
        // the interceptor's own refresh was still in flight. We just paint
        // the same "topilmadi" panel for anything that surfaces past the
        // interceptor.
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

    if (!data) return null;

    const badge = statusLabel(data.status);
    const serviceName = serviceNameOf(data);
    const showCancel = canCancelFn(data);
    // Pay button only when clinic has accepted (CONFIRMED+) — Payme/Click
    // webhooks server-side also refuse PENDING bookings, so this UI guard
    // just keeps the patient from clicking a button that would fail.
    const canPay = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(data.status)
        && data.paymentStatus !== 'PAID'
        && data.paymentMethod !== 'CASH';
    // PENDING with online payment → patient sees "Klinika tasdiqi
    // kutilmoqda" badge instead of a non-functional Pay button.
    const awaitingClinicAccept = data.status === 'PENDING'
        && data.paymentStatus !== 'PAID'
        && (data.paymentMethod === 'PAYME' || data.paymentMethod === 'CLICK' || data.paymentMethod === 'ALIF');
    // Checked in at clinic + online + unpaid → urgent: service won't start
    // until paid. Patient sees a big red reminder above everything else.
    const urgentPaymentRequired = data.status === 'CHECKED_IN'
        && data.paymentStatus !== 'PAID'
        && (data.paymentMethod === 'PAYME' || data.paymentMethod === 'CLICK' || data.paymentMethod === 'ALIF');
    const mapsUrl = mapsDirectionsUrl(data.clinic);
    const original = Number(data.price || 0);
    const finalP = Number(data.finalPrice || data.price || 0);
    const discount = Math.max(0, original - finalP);
    const discountPct = data.discountPercent || (original > 0 ? Math.round((discount / original) * 100) : 0);

    // Route the "To'lash" CTAs to the right provider page. /payment is the
    // Payme POST-form page and refuses bookings whose clinic doesn't list
    // PAYME among its supported methods — so CLICK users tapping it ended
    // up staring at "Bu klinika onlayn to'lovni qo'llab-quvvatlamaydi".
    const payTarget = data.paymentMethod === 'CLICK' ? '/payment/click'
        : data.paymentMethod === 'ALIF' ? '/payment/alif'
        : '/payment';
    const payState = {
        bookingData: {
            skipCreate: true,
            appointmentId: data.id,
            clinicId: data.clinic?.id || data.clinicId,
            price: finalP,
            clinicName: data.clinic?.nameUz,
            serviceName,
            scheduledAt: data.scheduledAt,
            selectedDate: data.scheduledAt?.split('T')[0],
        },
    };

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
                        <div className="apd-bron-label">Bron raqami</div>
                        <h1 className="apd-bron-number">{shortBookingNo(data.bookingNumber)}</h1>
                        <p className="apd-subtitle">{data.bookingNumber}</p>
                    </div>
                    <span className="apd-status" style={{ background: badge.bg, color: badge.color }}>
                        {badge.text}
                    </span>
                </div>

                {/* Progress Timeline */}
                <ProgressTimeline appointment={data} />

                {/* Metadata Display */}
                {data.metadata && data.metadata.length > 0 && (
                    <div className="apd-metadata-card">
                        <h3>Tibbiy ma'lumotlar</h3>
                        <div className="apd-metadata-grid">
                            {data.metadata.map((meta) => (
                                <div key={meta.id} className="apd-metadata-item">
                                    <span className="apd-metadata-label">{meta.template?.labelUz || 'Ma\'lumot'}</span>
                                    <span className="apd-metadata-value">
                                        {meta.value} {meta.template?.unit || ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="apd-grid">
                    <div className="apd-col-left">
                        {/* Status-driven action card — the single most important block on the page */}
                        {action && (
                            <div className={`apd-action-card tone-${action.tone}`}>
                                {action.tone === 'warning' && <div className="apd-action-icon">📲</div>}
                                {action.tone === 'info' && <div className="apd-action-icon"><Clock size={28} /></div>}
                                {action.tone === 'ok' && <div className="apd-action-icon"><CheckCircle2 size={28} /></div>}
                                {action.tone === 'error' && <div className="apd-action-icon"><AlertCircle size={28} /></div>}
                                <h3>{action.title}</h3>
                                <p>{action.body}</p>

                                {action.cta === 'scan' && (
                                    <>
                                        {isCash && (
                                            <div className="apd-checkin-amount">
                                                <span>Naqd to'lov summasi:</span>
                                                <strong>{fmtSum(finalP)} so'm</strong>
                                            </div>
                                        )}
                                        <button className="apd-pay-btn" onClick={() => navigate('/user/scan-checkin')}>
                                            QR kodni skanerlash
                                        </button>
                                        <p className="apd-checkin-hint">
                                            Klinika qabulxonasidagi yoki devordagi <strong>Banisa QR</strong> kodini toping.
                                        </p>
                                    </>
                                )}

                                {action.cta === 'await-cashier' && (
                                    <>
                                        <div className="apd-cashier-amount">
                                            <div className="apd-cashier-label">Kassaga to'lang</div>
                                            <div className="apd-cashier-sum">{fmtSum(finalP)} so'm</div>
                                            <div className="apd-cashier-method">💵 Naqd</div>
                                        </div>
                                        {!waitedLong ? (
                                            <div className="apd-action-spinner">
                                                <Loader2 size={16} className="apd-spin" />
                                                <span>Kassir tasdiqi kutilmoqda...</span>
                                            </div>
                                        ) : (
                                            <div className="apd-wait-fallback">
                                                <p>Tasdiqlash kutilganidan uzoq davom etmoqda.</p>
                                                {Array.isArray(data.clinic?.phones) && data.clinic.phones[0] && (
                                                    <a className="apd-pay-btn" href={`tel:${data.clinic.phones[0]}`}>
                                                        <Phone size={16} /> Klinikaga qo'ng'iroq qilish
                                                    </a>
                                                )}
                                                <button type="button" className="apd-cancel-btn" onClick={() => refetch()}>
                                                    Holatni yangilash
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {action.cta === 'pay' && (
                                    <button className="apd-pay-btn" onClick={() => navigate(payTarget, { state: payState })}>
                                        To'lash <CreditCard size={16} />
                                    </button>
                                )}

                                {data.status === 'COMPLETED' && data.clinic?.id && (
                                    hasReviewed ? (
                                        <div className="apd-review-done">
                                            <Star size={16} fill="#facc15" /> Siz bu klinikaga sharh qoldirgansiz
                                        </div>
                                    ) : (
                                        <button className="apd-pay-btn apd-review-btn" onClick={() => setReviewOpen(true)}>
                                            <Star size={16} /> Sharh qoldirish
                                        </button>
                                    )
                                )}

                                {data.status === 'COMPLETED' && data.doctor?.id && (
                                    <button className="apd-pay-btn apd-review-btn" onClick={() => setDoctorReviewOpen(true)}>
                                        <Star size={16} /> Doktorga baho
                                    </button>
                                )}
                            </div>
                        )}

                        {awaitingClinicAccept && (
                            <div className="apd-pay-card apd-pay-card--awaiting">
                                <div className="apd-pay-card-emoji">⏳</div>
                                <h3>Klinika tasdiqi kutilmoqda</h3>
                                <p>
                                    Klinika sizning bronni qabul qilgach, sizga {data.paymentMethod === 'CLICK' ? 'Click' : 'Payme'} orqali
                                    <strong> "💳 To'lash"</strong> havolasi yuboriladi (Telegram + sayt).
                                    Hozirda to'lov amalga oshirib bo'lmaydi — klinika rad qilsa pul qaytarish muommosi yo'q.
                                </p>
                            </div>
                        )}

                        {urgentPaymentRequired && (
                            <div className="apd-pay-card apd-pay-card--urgent">
                                <div className="apd-pay-card-emoji apd-pay-card-emoji--lg">⚠️</div>
                                <h3>HOZIR to'lash kerak</h3>
                                <p>
                                    Siz klinikaga keldingiz va check-in qildingiz, lekin to'lov hali qilinmagan.
                                    <strong> Xizmat boshlanmaydi</strong> — quyidagi {data.paymentMethod === 'CLICK' ? 'Click' : 'Payme'} tugmasi bilan
                                    hozir to'lang yoki kassaga borib naqd to'lashingiz mumkin (klinikaning ruxsati bo'lsa).
                                </p>
                                <button
                                    className="apd-pay-btn apd-pay-btn--danger"
                                    onClick={() => navigate(payTarget, { state: payState })}
                                >
                                    💳 To'lashga o'tish — {fmtSum(finalP)} so'm
                                </button>
                            </div>
                        )}

                        {canPay && (
                            <div className="apd-pay-card">
                                <CreditCard size={32} />
                                <h3>To'lov qilish</h3>
                                <div className="apd-price-summary">
                                    <div className="apd-price-row"><span>Narx:</span><span>{fmtSum(original)} so'm</span></div>
                                    {discount > 0 && (
                                        <div className="apd-price-row apd-discount"><span>Chegirma ({discountPct}%):</span><span>-{fmtSum(discount)} so'm</span></div>
                                    )}
                                    <div className="apd-price-row apd-total"><span>To'lov:</span><span>{fmtSum(finalP)} so'm</span></div>
                                </div>
                                <button className="apd-pay-btn" onClick={() => navigate(payTarget, { state: payState })}>
                                    To'lash <CreditCard size={16} />
                                </button>
                            </div>
                        )}

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
                                    <div style={{ flex: 1 }}>
                                        <div className="apd-label">Manzil</div>
                                        <div className="apd-value">{[data.clinic.street, data.clinic.district, data.clinic.region].filter(Boolean).join(', ')}</div>
                                        {mapsUrl && (
                                            <a className="apd-maps-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                                                <NavIcon size={14} /> Yo'l ko'rsatish
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                            {Array.isArray(data.clinic?.phones) && data.clinic.phones[0] && (
                                <div className="apd-info-row">
                                    <Phone size={18} />
                                    <div>
                                        <div className="apd-label">Telefon</div>
                                        <div className="apd-value">
                                            <a href={`tel:${data.clinic.phones[0]}`}>{fmtPhone(data.clinic.phones[0])}</a>
                                        </div>
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
                                    <div className="apd-value">{fmtDateTimeUz(data.scheduledAt)}</div>
                                </div>
                            </div>
                            <div className="apd-info-row">
                                <CreditCard size={18} />
                                <div>
                                    <div className="apd-label">To'lov usuli</div>
                                    <div className="apd-value">{isCash ? 'Naqd — klinika kassasida' : (data.paymentMethod || 'Onlayn')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="apd-col-right">
                        <div className="apd-price-card">
                            <h3>To'lov xulosasi</h3>
                            <div className="apd-price-row"><span>Narx:</span><span>{fmtSum(original)} so'm</span></div>
                            {discount > 0 && (
                                <div className="apd-price-row apd-discount"><span>Chegirma ({discountPct}%):</span><span>-{fmtSum(discount)} so'm</span></div>
                            )}
                            <div className="apd-price-divider" />
                            <div className="apd-price-row apd-total"><span>Jami:</span><span>{fmtSum(finalP)} so'm</span></div>
                            <div className="apd-payment-status">
                                {data.paymentStatus === 'PAID'
                                    ? <><CheckCircle2 size={16} /> To'langan</>
                                    : <><Clock size={16} /> To'lov kutilmoqda</>}
                            </div>
                        </div>

                        {Array.isArray(data.logs) && data.logs.length > 0 && (
                            <div className="apd-timeline-card">
                                <h3>Tarix</h3>
                                <ul className="apd-timeline">
                                    {data.logs.map((log) => (
                                        <li key={log.id} className="apd-timeline-item">
                                            <div className="apd-timeline-dot" />
                                            <div className="apd-timeline-content">
                                                <div className="apd-timeline-action">{statusLabel(log.newStatus).text || log.action}</div>
                                                <div className="apd-timeline-time">{fmtDateTimeUz(log.createdAt)}</div>
                                                {log.note && <div className="apd-timeline-note">{log.note}</div>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {showCancel && (
                            <div className="apd-cancel-block">
                                {confirmingCancel ? (
                                    <div className="apd-cancel-confirm">
                                        <p className="apd-cancel-confirm-q">Bronni bekor qilishni tasdiqlaysizmi?</p>
                                        {cancelError && (
                                            <div className="apd-cancel-error">
                                                <AlertCircle size={14} /> {cancelError}
                                            </div>
                                        )}
                                        <div className="apd-cancel-confirm-actions">
                                            <button
                                                type="button"
                                                className="apd-cancel-btn-secondary"
                                                disabled={cancelBusy}
                                                onClick={() => { setConfirmingCancel(false); setCancelError(''); }}
                                            >
                                                Yo'q, qoldirish
                                            </button>
                                            <button
                                                type="button"
                                                className="apd-cancel-btn apd-cancel-btn-danger"
                                                disabled={cancelBusy}
                                                onClick={cancel}
                                            >
                                                {cancelBusy
                                                    ? <><Loader2 size={14} className="apd-spin" /> Bekor qilinmoqda...</>
                                                    : 'Ha, bekor qilish'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="apd-cancel-btn" onClick={() => setConfirmingCancel(true)}>
                                        Bronni bekor qilish
                                    </button>
                                )}
                                <p className="apd-cancel-policy">{cancelPolicy(data)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />

            {reviewOpen && data?.clinic?.id && (
                <ReviewWriteModal
                    clinicId={data.clinic.id}
                    clinicName={data.clinic.nameUz}
                    onClose={() => setReviewOpen(false)}
                />
            )}

            <DoctorReviewModal
                appointmentId={id}
                open={doctorReviewOpen}
                onClose={() => setDoctorReviewOpen(false)}
            />
        </div>
    );
}
