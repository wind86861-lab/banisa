import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
    ArrowLeft, CheckCircle2, Clock, CreditCard, Building2, Phone, MapPin,
    Calendar, FileText, AlertCircle, Loader2, Navigation as NavIcon
} from 'lucide-react';
import api from '../../shared/api/axios';
import { statusLabel, nextActionFor, canCancel as canCancelFn, cancelPolicy } from '../../shared/utils/appointmentStatus';
import { fmtSum, fmtPhone, fmtDateTimeUz, shortBookingNo, mapsDirectionsUrl } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/AppointmentDetailPage.css';

const POLL_MS = 5000;

export default function AppointmentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['appointment', id, 'v3'],
        queryFn: async () => {
            const res = await api.get(`/user/appointments/${id}`);
            return res.data.data;
        },
        retry: false,
        // Live poll while the patient is mid-flow so cashier-side updates land
        // without a manual refresh. Idle terminal states stop polling.
        refetchInterval: (q) => {
            const a = q.state.data;
            if (!a) return false;
            const live = ['PENDING_ARRIVAL', 'CHECKED_IN', 'CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC'];
            return live.includes(a.status) && a.paymentStatus !== 'PAID' ? POLL_MS : false;
        },
        refetchOnWindowFocus: true,
    });

    const isCash = data?.paymentMethod === 'CASH';
    const action = useMemo(() => nextActionFor(data), [data]);

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
                <div className="apd-loading"><Loader2 size={36} className="apd-spin" /><p>Yuklanmoqda...</p></div>
                <Footer />
            </div>
        );
    }

    if (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 429) {
            if (typeof window !== 'undefined') {
                window.location.href = `/user/login?redirect=${encodeURIComponent(`/user/appointments/${id}`)}`;
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

    if (!data) return null;

    const badge = statusLabel(data.status);
    const serviceName =
        data.diagnosticService?.nameUz ||
        data.surgicalService?.nameUz ||
        data.checkupPackage?.nameUz ||
        'Xizmat';
    const showCancel = canCancelFn(data);
    const canPay = ['CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC'].includes(data.status)
        && data.paymentStatus !== 'PAID'
        && data.paymentMethod !== 'CASH';
    const mapsUrl = mapsDirectionsUrl(data.clinic);
    const original = Number(data.price || 0);
    const finalP = Number(data.finalPrice || data.price || 0);
    const discount = Math.max(0, original - finalP);
    const discountPct = data.discountPercent || (original > 0 ? Math.round((discount / original) * 100) : 0);

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

                                {action.cta === 'checkin' && (
                                    <>
                                        <div className="apd-checkin-amount">
                                            <span>Naqd to'lov summasi:</span>
                                            <strong>{fmtSum(finalP)} so'm</strong>
                                        </div>
                                        <button type="button" className="apd-scan-btn" onClick={() => navigate(`/user/appointments`)}>
                                            Check-in qilish
                                        </button>
                                    </>
                                )}

                                {action.cta === 'await-cashier' && (
                                    <div className="apd-action-spinner">
                                        <Loader2 size={16} className="apd-spin" />
                                        <span>Klinika to'lovingizni tasdiqlashi kutilmoqda...</span>
                                    </div>
                                )}

                                {action.cta === 'pay' && (
                                    <button className="apd-pay-btn" onClick={() => navigate('/payment', { state: { bookingData: { skipCreate: true, appointmentId: data.id, price: finalP, clinicName: data.clinic?.nameUz, serviceName, scheduledAt: data.scheduledAt, selectedDate: data.scheduledAt?.split('T')[0] } } })}>
                                        To'lash <CreditCard size={16} />
                                    </button>
                                )}
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
                                <button className="apd-pay-btn" onClick={() => navigate('/payment', { state: { bookingData: { skipCreate: true, appointmentId: data.id, price: finalP, clinicName: data.clinic?.nameUz, serviceName, scheduledAt: data.scheduledAt, selectedDate: data.scheduledAt?.split('T')[0] } } })}>
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
                                <button className="apd-cancel-btn" onClick={cancel}>Bronni bekor qilish</button>
                                <p className="apd-cancel-policy">{cancelPolicy(data)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
