import { useNavigate } from 'react-router-dom';
import { Calendar, ShoppingBag, Sparkles, ArrowRight, Clock, MapPin, QrCode } from 'lucide-react';
import { useUserAuth } from '../../../shared/auth/UserAuthContext';
import { useUserHomeSummary } from '../../../hooks/useHomeData';
import { statusLabel, needsCheckIn } from '../../../shared/utils/appointmentStatus';
import { fmtSum } from '../../../shared/utils/format';

const fmt = fmtSum;

function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const isToday = dt.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = dt.toDateString() === tomorrow.toDateString();

    const time = dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Bugun · ${time}`;
    if (isTomorrow) return `Ertaga · ${time}`;
    return `${dt.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })} · ${time}`;
}

export default function PersonalizedBanner() {
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const { data } = useUserHomeSummary(!!user);

    if (!user) return null;

    const firstName = user.firstName || 'foydalanuvchi';
    const next = data?.nextAppointment;
    const cart = data?.cart || { itemCount: 0, total: 0 };

    return (
        <section className="hn-pers">
            <div className="hn-container">
                <h2 className="hn-pers-greet">👋 Salom, {firstName}!</h2>
                <div className="hn-pers-grid">

                    {/* Upcoming booking */}
                    <div
                        className="hn-pers-card"
                        onClick={() => navigate(next ? `/user/appointments/${next.id}` : '/klinikalar')}
                    >
                        <div className="hn-pers-icon" style={{ color: '#0891b2' }}>
                            <Calendar size={20} />
                        </div>
                        <div className="hn-pers-label">Yaqin bron</div>
                        {next ? (
                            <>
                                <div className="hn-pers-title">{next.serviceName}</div>
                                <div className="hn-pers-sub">
                                    <Clock size={12} style={{ verticalAlign: '-2px' }} /> {fmtDate(next.scheduledAt)}
                                </div>
                                <div className="hn-pers-sub">
                                    <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {next.clinic?.nameUz}
                                </div>
                                {next.status && (
                                    <div className="hn-pers-sub" style={{ marginTop: 4 }}>
                                        <span style={{ background: statusLabel(next.status).bg, color: statusLabel(next.status).color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                                            {statusLabel(next.status).text}
                                        </span>
                                    </div>
                                )}
                                {needsCheckIn(next) && (
                                    <div className="hn-pers-sub" style={{ color: '#9a3412', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <QrCode size={12} /> Klinikada QR scan kerak
                                    </div>
                                )}
                                <div className="hn-pers-cta">Tafsilotlar <ArrowRight size={13} /></div>
                            </>
                        ) : (
                            <>
                                <div className="hn-pers-title">Bron yo'q</div>
                                <div className="hn-pers-sub">Birinchi xizmat bron qilishni boshlash uchun klinikalarni ko'ring</div>
                                <div className="hn-pers-cta">Klinikalar <ArrowRight size={13} /></div>
                            </>
                        )}
                    </div>

                    {/* Cart */}
                    <div className="hn-pers-card cart" onClick={() => navigate('/user/cart')}>
                        <div className="hn-pers-icon" style={{ color: '#d97706' }}>
                            <ShoppingBag size={20} />
                        </div>
                        <div className="hn-pers-label">Savat</div>
                        {cart.itemCount > 0 ? (
                            <>
                                <div className="hn-pers-title">{cart.itemCount} ta xizmat</div>
                                <div className="hn-pers-sub" style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                                    {fmt(cart.total)} so'm
                                </div>
                                <div className="hn-pers-cta" style={{ color: '#d97706' }}>Savatga o'tish <ArrowRight size={13} /></div>
                            </>
                        ) : (
                            <>
                                <div className="hn-pers-title">Savat bo'sh</div>
                                <div className="hn-pers-sub">Xizmatlarni qo'shing va bir bron qilishda hammasini bron qiling</div>
                                <div className="hn-pers-cta" style={{ color: '#d97706' }}>Xizmatlar <ArrowRight size={13} /></div>
                            </>
                        )}
                    </div>

                    {/* Quick action */}
                    <div className="hn-pers-card action" onClick={() => navigate('/klinikalar')}>
                        <div className="hn-pers-icon" style={{ color: '#7c3aed' }}>
                            <Sparkles size={20} />
                        </div>
                        <div className="hn-pers-label">Tezkor</div>
                        <div className="hn-pers-title">Yangi bron qilish</div>
                        <div className="hn-pers-sub">Klinika tanlang va xizmat bron qiling</div>
                        <div className="hn-pers-cta" style={{ color: '#7c3aed' }}>Boshlash <ArrowRight size={13} /></div>
                    </div>

                </div>
            </div>
        </section>
    );
}
