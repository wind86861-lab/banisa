import { useState } from 'react';
import { Phone, X, Copy, CheckCircle2, Tag } from 'lucide-react';
import api from '../../shared/api/axios';
import './AppointmentsPage.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function OperatorCallModal({ appointment, onClose, onDone }) {
    const clinicDefault = appointment.clinic?.defaultDiscountPercent ?? 0;
    const [callNote, setCallNote] = useState('');
    const [discountPercent, setDiscountPercent] = useState(
        appointment.discountPercent ?? clinicDefault
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const copyPhone = async () => {
        try {
            await navigator.clipboard.writeText(appointment.patient?.phone || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* noop */ }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!callNote.trim()) {
            setError('Iltimos, qo\'ng\'iroq natijasini yozib qoldiring');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await api.post(`/admin/appointments/${appointment.id}/confirm`, {
                callNote,
                discountPercent: Number(discountPercent),
            });
            onDone?.();
        } catch (err) {
            setError(err.response?.data?.message || 'Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    const service = appointment.diagnosticService?.nameUz || appointment.surgicalService?.nameUz || 'Xizmat';
    const date = new Date(appointment.scheduledAt);
    const price = appointment.price ?? 0;
    const discountAmount = Math.floor((price * discountPercent) / 100);
    const finalPrice = price - discountAmount;

    return (
        <div className="apm-overlay" onClick={onClose}>
            <div className="apm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="apm-header">
                    <div className="apm-title">
                        <Phone size={20} /> Bemorga qo'ng'iroq
                    </div>
                    <button className="apm-close" onClick={onClose}><X size={20} /></button>
                </div>

                <form className="apm-body" onSubmit={onSubmit}>
                    {/* Booking info */}
                    <div className="apm-booking">
                        <div className="apm-booking-num">{appointment.bookingNumber}</div>
                        <div className="apm-row"><span>Bemor:</span><strong>{appointment.patient?.firstName} {appointment.patient?.lastName}</strong></div>
                        <div className="apm-row apm-phone-row">
                            <span>Telefon:</span>
                            <strong>{appointment.patient?.phone}</strong>
                            <button type="button" className="apm-copy" onClick={copyPhone}>
                                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                {copied ? 'Nusxalandi' : 'Nusxalash'}
                            </button>
                        </div>
                        <div className="apm-row"><span>Xizmat:</span><strong>{service}</strong></div>
                        <div className="apm-row"><span>Sana:</span><strong>{date.toLocaleString('uz-UZ')}</strong></div>
                        <div className="apm-row"><span>Klinika:</span><strong>{appointment.clinic?.nameUz}</strong></div>
                    </div>

                    {/* Discount */}
                    <div className="apm-section">
                        <label className="apm-label">
                            <Tag size={14} /> Chegirma foizi
                            <span className="apm-hint">Klinika default: {clinicDefault}%</span>
                        </label>
                        <div className="apm-discount-input">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value)}
                            />
                            <span>%</span>
                        </div>
                        <div className="apm-price-preview">
                            <div><span>Narx:</span><span>{fmt(price)} so'm</span></div>
                            <div className="apm-price-discount">
                                <span>Chegirma:</span><span>-{fmt(discountAmount)} so'm</span>
                            </div>
                            <div className="apm-price-final">
                                <span>To'lov:</span><strong>{fmt(finalPrice)} so'm</strong>
                            </div>
                        </div>
                    </div>

                    {/* Call note */}
                    <div className="apm-section">
                        <label className="apm-label">Qo'ng'iroq natijasi *</label>
                        <textarea
                            rows={4}
                            value={callNote}
                            onChange={(e) => setCallNote(e.target.value)}
                            placeholder="Masalan: Bemor bilan gaplashdim, tasdiqladi. Och qoringa kelishini eslatdim..."
                            required
                        />
                    </div>

                    {error && <div className="apm-error">{error}</div>}

                    <div className="apm-actions">
                        <button type="button" className="apm-btn apm-btn-secondary" onClick={onClose}>
                            Bekor qilish
                        </button>
                        <button type="submit" className="apm-btn apm-btn-primary" disabled={submitting}>
                            {submitting ? 'Saqlanmoqda...' : 'Tasdiqlash va Klinikaga yuborish'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
