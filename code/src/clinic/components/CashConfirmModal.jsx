import { useEffect, useState } from 'react';
import { Wallet, X, Check, AlertTriangle } from 'lucide-react';
import { useConfirmCash } from '../hooks/useClinicData';

const fmt = (n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');

export default function CashConfirmModal({ booking, onClose, onSuccess }) {
    const expected = booking?.finalPrice || booking?.price || 0;
    const original = booking?.price || 0;
    const discount = booking?.discountAmount || (original - expected) || 0;
    const discountPct = booking?.discountPercent || (original > 0 ? Math.round((discount / original) * 100) : 0);

    const [amount, setAmount] = useState(expected);
    const [note, setNote] = useState('');
    const [showNote, setShowNote] = useState(false);
    const confirmCash = useConfirmCash();

    useEffect(() => { setAmount(expected); }, [expected]);

    const isShort = amount < expected;
    const noteRequired = isShort;

    const handleSubmit = async () => {
        if (noteRequired && !note.trim()) {
            alert('Kam summa qabul qilish uchun sabab kiriting');
            return;
        }
        try {
            await confirmCash.mutateAsync({
                id: booking.id,
                amount: Number(amount),
                note: note.trim() || undefined,
            });
            if (onSuccess) onSuccess();
            onClose();
        } catch (e) {
            alert(e.response?.data?.error?.message || e.response?.data?.message || 'Xatolik yuz berdi');
        }
    };

    if (!booking) return null;

    return (
        <div className="ca-dialog-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
            <div
                className="ca-dialog"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: 460, padding: 0, overflow: 'hidden' }}
            >
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Wallet size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>Naqd to'lovni tasdiqlash</div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>Bemordan qabul qilingan summani kiriting</div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)', border: 'none',
                            color: '#fff', width: 30, height: 30, borderRadius: 8,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px' }}>
                    {/* Patient info */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Bemor</div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                            {booking.patient?.firstName} {booking.patient?.lastName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {booking.patient?.phone} · Bron #{booking.bookingNumber}
                        </div>
                    </div>

                    {/* Price breakdown */}
                    <div style={{
                        background: 'var(--bg-page, #f8fafc)',
                        borderRadius: 12, padding: 16, marginBottom: 16,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Asl narx</span>
                            <span style={{
                                textDecoration: discount > 0 ? 'line-through' : 'none',
                                color: discount > 0 ? 'var(--text-muted)' : 'var(--text-main)',
                            }}>
                                {fmt(original)} so'm
                            </span>
                        </div>
                        {discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                <span style={{ color: '#dc2626' }}>Chegirma {discountPct > 0 ? `(${discountPct}%)` : ''}</span>
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>−{fmt(discount)} so'm</span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            paddingTop: 8, marginTop: 4,
                            borderTop: '1px dashed var(--border-color, #ddd)',
                            fontSize: 16, fontWeight: 700,
                        }}>
                            <span>Yakuniy</span>
                            <span style={{ color: '#10b981' }}>{fmt(expected)} so'm</span>
                        </div>
                    </div>

                    {/* Amount input */}
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                            Qabul qilingan summa (so'm)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            min={0}
                            style={{
                                width: '100%', padding: '12px 14px',
                                borderRadius: 10, fontSize: 18, fontWeight: 600,
                                border: `2px solid ${isShort ? '#f59e0b' : 'var(--border-color, #ddd)'}`,
                                background: 'var(--bg-card, #fff)',
                                color: 'var(--text-main)',
                                outline: 'none',
                            }}
                        />
                        {amount !== expected && (
                            <div style={{
                                marginTop: 6, fontSize: 12,
                                color: isShort ? '#f59e0b' : '#10b981',
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                {isShort && <AlertTriangle size={12} />}
                                {isShort
                                    ? `Yakuniy summadan ${fmt(expected - amount)} so'm kam`
                                    : `Yakuniy summadan ${fmt(amount - expected)} so'm ko'p`}
                            </div>
                        )}
                    </div>

                    {/* Note (toggleable, required if short) */}
                    {(showNote || noteRequired) ? (
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                                Sabab {noteRequired && <span style={{ color: '#dc2626' }}>*</span>}
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={2}
                                placeholder={noteRequired ? 'Nima uchun kam summa qabul qilindi?' : 'Izoh (ixtiyoriy)'}
                                style={{
                                    width: '100%', padding: '10px 12px',
                                    borderRadius: 10, fontSize: 13,
                                    border: '1px solid var(--border-color, #ddd)',
                                    background: 'var(--bg-card, #fff)',
                                    resize: 'vertical', outline: 'none',
                                }}
                            />
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowNote(true)}
                            style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--color-primary, #00bde0)',
                                fontSize: 12, cursor: 'pointer', fontWeight: 600,
                                marginBottom: 12, padding: 0,
                            }}
                        >
                            + Izoh qo'shish
                        </button>
                    )}
                </div>

                {/* Footer actions */}
                <div style={{
                    padding: '14px 24px', borderTop: '1px solid var(--border-color, #eee)',
                    display: 'flex', gap: 10, justifyContent: 'flex-end',
                }}>
                    <button
                        onClick={onClose}
                        className="ca-btn-secondary"
                        disabled={confirmCash.isPending}
                    >
                        Bekor qilish
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={confirmCash.isPending || amount === '' || amount < 0}
                        style={{
                            background: '#10b981', color: '#fff',
                            border: 'none', padding: '10px 20px',
                            borderRadius: 10, fontSize: 14, fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            opacity: confirmCash.isPending ? 0.6 : 1,
                        }}
                    >
                        <Check size={16} />
                        {confirmCash.isPending ? 'Saqlanmoqda...' : 'Tasdiqlash'}
                    </button>
                </div>
            </div>
        </div>
    );
}
