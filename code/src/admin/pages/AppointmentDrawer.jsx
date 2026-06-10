import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    X, Phone, Copy, CheckCircle2, XCircle, Tag, Calendar,
    User, Building2, Clock, CreditCard, ChevronDown, ChevronUp,
    AlertTriangle, CheckCheck, Loader2, MessageSquare, ArrowRight
} from 'lucide-react';
import api from '../../shared/api/axios';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

const STATUS_STYLES = {
    PENDING:     { color: '#B45309', bg: '#FEF3C7', label: 'Yangi — tasdiqlash kerak' },
    CONFIRMED:   { color: '#047857', bg: '#D1FAE5', label: 'Tasdiqlandi' },
    CHECKED_IN:  { color: '#6D28D9', bg: '#EDE9FE', label: 'Keldi' },
    IN_PROGRESS: { color: '#6D28D9', bg: '#EDE9FE', label: 'Jarayonda' },
    COMPLETED:   { color: '#065F46', bg: '#D1FAE5', label: 'Yakunlangan' },
    CANCELLED:   { color: '#991B1B', bg: '#FEE2E2', label: 'Bekor qilindi' },
    NO_SHOW:     { color: '#991B1B', bg: '#FEE2E2', label: 'Kelmadi' },
};

const CANCELLABLE = ['PENDING', 'CONFIRMED'];
const CONFIRMABLE = ['PENDING'];

export default function AppointmentDrawer({ appointmentId, onClose, onDone }) {
    const qc = useQueryClient();
    const [copied, setCopied] = useState(false);
    const [showCancel, setShowCancel] = useState(false);

    const [callNote, setCallNote] = useState('');
    const [discountPercent, setDiscountPercent] = useState(0);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmError, setConfirmError] = useState('');

    const [cancelReason, setCancelReason] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);
    const [cancelError, setCancelError] = useState('');

    const { data: appt, isLoading } = useQuery({
        queryKey: ['admin', 'appointment', appointmentId],
        queryFn: async () => (await api.get('/admin/appointments/' + appointmentId)).data.data,
        enabled: !!appointmentId,
    });

    useEffect(() => {
        if (appt) {
            setDiscountPercent(appt.discountPercent ?? appt.clinic?.defaultDiscountPercent ?? 0);
        }
    }, [appt?.id]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const copyPhone = async () => {
        try {
            await navigator.clipboard.writeText(appt?.patient?.phone || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* noop */ }
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        if (!callNote.trim()) { setConfirmError("Iltimos, qo'ng'iroq natijasini yozib qoldiring"); return; }
        setConfirmLoading(true);
        setConfirmError('');
        try {
            await api.post('/admin/appointments/' + appointmentId + '/confirm', {
                callNote,
                discountPercent: Number(discountPercent),
            });
            qc.invalidateQueries({ queryKey: ['admin', 'appointments'] });
            onDone?.();
        } catch (err) {
            setConfirmError(err.response?.data?.message || err.response?.data?.error?.message || 'Xatolik yuz berdi');
        } finally {
            setConfirmLoading(false);
        }
    };

    const handleCancel = async (e) => {
        e.preventDefault();
        if (!cancelReason.trim()) { setCancelError('Iltimos, bekor qilish sababini kiriting'); return; }
        setCancelLoading(true);
        setCancelError('');
        try {
            await api.post('/admin/appointments/' + appointmentId + '/cancel', { reason: cancelReason.trim() });
            qc.invalidateQueries({ queryKey: ['admin', 'appointments'] });
            onDone?.();
        } catch (err) {
            setCancelError(err.response?.data?.message || err.response?.data?.error?.message || 'Xatolik yuz berdi');
        } finally {
            setCancelLoading(false);
        }
    };

    const style = appt ? (STATUS_STYLES[appt.status] ?? STATUS_STYLES.PENDING) : null;
    const service = appt?.diagnosticService?.nameUz || appt?.surgicalService?.nameUz || 'Xizmat';
    const date = appt ? new Date(appt.scheduledAt) : null;
    const price = appt?.price ?? 0;
    const discountAmount = Math.floor((price * Number(discountPercent)) / 100);
    const finalPrice = price - discountAmount;
    const isConfirmable = appt && CONFIRMABLE.includes(appt.status);
    const isCancellable = appt && CANCELLABLE.includes(appt.status);

    return (
        <>
            <div className="adr-backdrop" onClick={onClose} />
            <div className="adr-panel">
                {/* Header */}
                <div className="adr-header">
                    <div className="adr-header-left">
                        {appt ? (
                            <>
                                <span className="adr-booking-num">{appt.bookingNumber}</span>
                                <span className="adr-status-badge" style={{ color: style.color, background: style.bg }}>
                                    {style.label}
                                </span>
                            </>
                        ) : (
                            <span className="adr-booking-num">Yuklanmoqda...</span>
                        )}
                    </div>
                    <button className="adr-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="adr-body">
                    {isLoading ? (
                        <div className="adr-loading"><Loader2 size={28} className="adr-spin" /> Yuklanmoqda...</div>
                    ) : appt ? (
                        <>
                            {/* Patient & Booking Info */}
                            <section className="adr-section">
                                <h4 className="adr-section-title">Bemor ma'lumotlari</h4>
                                <div className="adr-info-card">
                                    <div className="adr-info-row">
                                        <User size={15} />
                                        <span>{appt.patient?.firstName} {appt.patient?.lastName}</span>
                                    </div>
                                    <div className="adr-info-row adr-phone-row">
                                        <Phone size={15} />
                                        <a href={"tel:" + appt.patient?.phone} className="adr-phone-link">
                                            {appt.patient?.phone}
                                        </a>
                                        <button className="adr-copy-btn" onClick={copyPhone}>
                                            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                                            {copied ? 'Nusxalandi' : 'Nusxalash'}
                                        </button>
                                    </div>
                                    <div className="adr-divider" />
                                    <div className="adr-info-row">
                                        <Building2 size={15} />
                                        <span>{appt.clinic?.nameUz}</span>
                                    </div>
                                    <div className="adr-info-row">
                                        <Tag size={15} />
                                        <span>{service}</span>
                                    </div>
                                    <div className="adr-info-row">
                                        <Calendar size={15} />
                                        <span>
                                            {date.toLocaleDateString('uz-UZ')} — {date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="adr-divider" />
                                    <div className="adr-price-row">
                                        <span>Narx</span>
                                        <strong>{fmt(appt.finalPrice || appt.price)} so'm</strong>
                                    </div>
                                    {(appt.discountPercent > 0) && (
                                        <div className="adr-price-row adr-discount-row">
                                            <span>Chegirma ({appt.discountPercent}%)</span>
                                            <span className="adr-green">-{fmt(appt.discountAmount)} so'm</span>
                                        </div>
                                    )}
                                    <div className="adr-info-row">
                                        <CreditCard size={15} />
                                        <span>
                                            {appt.paymentMethod === 'CASH'
                                                ? "Naqd (klinikada to'lov)"
                                                : appt.paymentStatus === 'PAID' ? "To'langan" : "To'lanmagan"}
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {appt.operatorCallNote && (
                                <section className="adr-section">
                                    <h4 className="adr-section-title">Operator izohi</h4>
                                    <div className="adr-note-card">
                                        <MessageSquare size={14} />
                                        <span>{appt.operatorCallNote}</span>
                                    </div>
                                </section>
                            )}

                            {/* CONFIRM ACTION (PENDING) */}
                            {isConfirmable && (
                                <section className="adr-section adr-action-confirm">
                                    <h4 className="adr-section-title adr-confirm-title">
                                        <CheckCheck size={16} />
                                        {appt.paymentMethod === 'CASH' ? 'Naqd bronni tasdiqlash' : 'Bronni tasdiqlash'}
                                    </h4>
                                    <p className="adr-hint-text">
                                        {appt.paymentMethod === 'CASH'
                                            ? "Bemorga telefon qiling, kelishini tasdiqlang va natijani yozing. Bemor klinikada naqd to'laydi."
                                            : "Bemorga telefon qiling, ma'lumotlarni tasdiqlang va natijani yozing."}
                                    </p>
                                    <a href={"tel:" + appt.patient?.phone} className="adr-call-link">
                                        <Phone size={15} /> {appt.patient?.phone} — Qo'ng'iroq qilish
                                    </a>
                                    <form onSubmit={handleConfirm} className="adr-form">
                                        <div className="adr-form-row">
                                            <label className="adr-label">
                                                <Tag size={13} /> Chegirma foizi
                                                <span className="adr-label-hint">Default: {appt.clinic?.defaultDiscountPercent ?? 0}%</span>
                                            </label>
                                            <div className="adr-discount-wrap">
                                                <input
                                                    type="number" min="0" max="100"
                                                    value={discountPercent}
                                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                                    className="adr-discount-input"
                                                />
                                                <span className="adr-pct">%</span>
                                            </div>
                                            <div className="adr-price-preview">
                                                <span>{fmt(price)} so'm</span>
                                                {discountAmount > 0 && <span className="adr-arrow">→</span>}
                                                {discountAmount > 0 && <strong className="adr-final">{fmt(finalPrice)} so'm</strong>}
                                                {discountAmount > 0 && <span className="adr-saving">({fmt(discountAmount)} so'm chegirma)</span>}
                                            </div>
                                        </div>
                                        <div className="adr-form-row">
                                            <label className="adr-label">Qo'ng'iroq natijasi *</label>
                                            <textarea
                                                rows={3}
                                                value={callNote}
                                                onChange={(e) => setCallNote(e.target.value)}
                                                placeholder={appt.paymentMethod === 'CASH'
                                                    ? "Masalan: Bemorga qo'ng'iroq qildim, klinikaga kelishini tasdiqladi..."
                                                    : "Masalan: Bemor bilan gaplashdim, tasdiqladi..."}
                                                className="adr-textarea"
                                            />
                                        </div>
                                        {confirmError && <div className="adr-error">{confirmError}</div>}
                                        <button type="submit" className="adr-btn adr-btn-confirm" disabled={confirmLoading}>
                                            {confirmLoading
                                                ? <><Loader2 size={15} className="adr-spin" /> Saqlanmoqda...</>
                                                : <><CheckCheck size={15} /> Tasdiqlash va klinikaga yuborish</>}
                                        </button>
                                    </form>
                                </section>
                            )}

                            {/* CANCEL ACTION */}
                            {isCancellable && (
                                <section className="adr-section adr-cancel-zone">
                                    <button
                                        className="adr-cancel-toggle"
                                        onClick={() => setShowCancel(!showCancel)}
                                        type="button"
                                    >
                                        <XCircle size={15} />
                                        Bronni bekor qilish
                                        {showCancel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    </button>
                                    {showCancel && (
                                        <form onSubmit={handleCancel} className="adr-cancel-form">
                                            <div className="adr-cancel-warning">
                                                <AlertTriangle size={14} />
                                                <span>Bu amalni qaytarib bo'lmaydi. Sababni kiriting:</span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                value={cancelReason}
                                                onChange={(e) => setCancelReason(e.target.value)}
                                                placeholder="Masalan: Bemor boshqa klinikani tanladi..."
                                                className="adr-textarea adr-textarea-danger"
                                            />
                                            {cancelError && <div className="adr-error">{cancelError}</div>}
                                            <div className="adr-cancel-btns">
                                                <button type="button" className="adr-btn adr-btn-ghost" onClick={() => setShowCancel(false)}>
                                                    Yopish
                                                </button>
                                                <button type="submit" className="adr-btn adr-btn-cancel" disabled={cancelLoading}>
                                                    {cancelLoading
                                                        ? <><Loader2 size={14} className="adr-spin" /> Bekor qilinmoqda...</>
                                                        : <><XCircle size={14} /> Ha, bekor qilish</>}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </section>
                            )}

                            {/* Activity Timeline */}
                            {Array.isArray(appt.logs) && appt.logs.length > 0 && (
                                <section className="adr-section">
                                    <h4 className="adr-section-title">Faoliyat tarixi</h4>
                                    <ul className="adr-timeline">
                                        {appt.logs.map((log) => (
                                            <li key={log.id} className="adr-timeline-item">
                                                <div className="adr-tl-dot" />
                                                <div className="adr-tl-body">
                                                    <div className="adr-tl-head">
                                                        <strong>{log.action}</strong>
                                                        <span>{new Date(log.createdAt).toLocaleString('uz-UZ')}</span>
                                                    </div>
                                                    {log.userName && <div className="adr-tl-user">{log.userName} ({log.userRole})</div>}
                                                    {log.note && <div className="adr-tl-note">{log.note}</div>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </>
                    ) : (
                        <div className="adr-loading">Ma'lumot topilmadi</div>
                    )}
                </div>
            </div>
        </>
    );
}
