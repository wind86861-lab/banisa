import { Star, CreditCard, CalendarCheck } from 'lucide-react';
import '../../pages/clinic-admin.css';

export default function CustomizationExtrasTab({ formData, setFormData }) {
    const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Booking Requirements */}
            <div style={{
                padding: 16,
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <CalendarCheck size={18} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Bron talablari</span>
                </div>

                <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', cursor: 'pointer', fontSize: 13,
                }}>
                    <input
                        type="checkbox"
                        checked={formData.requiresAppointment ?? true}
                        onChange={e => set('requiresAppointment', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                    />
                    <div>
                        <div>Oldindan bron qilish talab etiladi</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Bemorlar xizmatdan foydalanish uchun oldindan bron qilishi kerak
                        </div>
                    </div>
                </label>

                <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', cursor: 'pointer', fontSize: 13,
                    borderTop: '1px solid var(--border-color)',
                }}>
                    <input
                        type="checkbox"
                        checked={formData.requiresPrepayment ?? false}
                        onChange={e => {
                            set('requiresPrepayment', e.target.checked);
                            if (!e.target.checked) set('prepaymentPercentage', null);
                        }}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                    />
                    <div>
                        <div>Oldindan to&#39;lov talab etiladi</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Bemorlar bron paytida qisman to&#39;lov qilishlari kerak
                        </div>
                    </div>
                </label>

                {formData.requiresPrepayment && (
                    <div className="ca-form-group" style={{ marginTop: 10 }}>
                        <label className="ca-label">Oldindan to&#39;lov foizi (%)</label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={formData.prepaymentPercentage || ''}
                            onChange={e => set('prepaymentPercentage', parseInt(e.target.value) || null)}
                            placeholder="50"
                        />
                    </div>
                )}
            </div>

            {/* Display Settings */}
            <div style={{
                padding: 16,
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Star size={18} style={{ color: '#FFD700' }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Ko&#39;rinish sozlamalari</span>
                </div>

                <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', cursor: 'pointer', fontSize: 13,
                }}>
                    <input
                        type="checkbox"
                        checked={formData.isHighlighted ?? false}
                        onChange={e => set('isHighlighted', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#FFD700' }}
                    />
                    <div>
                        <div>Mashhur / tavsiya etilgan xizmat</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Bemor sahifasida maxsus belgi bilan ko&#39;rsatiladi
                        </div>
                    </div>
                </label>

                <div className="ca-form-group" style={{ marginTop: 10 }}>
                    <label className="ca-label">Ko&#39;rsatish tartibi (raqam — kichik = birinchi)</label>
                    <input
                        type="number"
                        min={1}
                        max={1000}
                        value={formData.displayOrder || ''}
                        onChange={e => set('displayOrder', parseInt(e.target.value) || null)}
                        placeholder="Avtomatik (alifbo bo'yicha)"
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        Bo&#39;sh qoldirsa — alifbo tartibida ko&#39;rsatiladi
                    </small>
                </div>
            </div>

            {/* Payment Info */}
            <div style={{
                padding: 16,
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
            }}>
                <CreditCard size={18} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <strong>Eslatma:</strong> Xizmat narxi Super Admin tomonidan belgilangan{' '}
                    narx oralig&#39;ida bo&#39;lishi kerak. Narxni o&#39;zgartirish uchun{' '}
                    &quot;Xizmatlar&quot; sahifasiga o&#39;ting.
                </div>
            </div>
        </div>
    );
}
