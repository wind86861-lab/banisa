import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Ambulance, Loader2, CheckCircle2, AlertTriangle, Wallet, CreditCard, Banknote,
} from 'lucide-react';
import './SkoryPaymentPage.css';

const METHOD_META = {
    CASH:  { label: 'Naqd', hint: "Pulni tez yordam xodimiga bering", icon: Banknote, color: '#16a34a' },
    CLICK: { label: 'Click', hint: 'Karta orqali onlayn', icon: CreditCard, color: '#00aaff' },
    PAYME: { label: 'Payme', hint: 'Karta orqali onlayn', icon: CreditCard, color: '#33c7b0' },
    ALIF:  { label: 'Alif Nasiya', hint: 'Onlayn / bo\'lib to\'lash', icon: CreditCard, color: '#7b2ff7' },
};

const som = (n) => (n || 0).toLocaleString('uz-UZ') + " so'm";

export default function SkoryPaymentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyMethod, setBusyMethod] = useState(null);
    const [cashChosen, setCashChosen] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await axios.get(`/api/skory/${id}/payment`);
            setInfo(res.data?.data || null);
        } catch {
            setError('To\'lov ma\'lumoti topilmadi');
        } finally { setLoading(false); }
    }, [id]);

    // Poll so the page flips to "paid" the moment cash is confirmed or the
    // online payment clears (server reconciles on read).
    useEffect(() => {
        load();
        const t = setInterval(load, 4000);
        return () => clearInterval(t);
    }, [load]);

    const pay = async (method) => {
        setBusyMethod(method);
        setError('');
        try {
            const res = await axios.post(`/api/skory/${id}/pay`, { method }, { withCredentials: true });
            const d = res.data?.data;
            if (method === 'CASH') { setCashChosen(true); setBusyMethod(null); return; }
            // Online → hand off to the existing provider page with the bridge appointment.
            const target = method === 'CLICK' ? '/payment/click' : method === 'ALIF' ? '/payment/alif' : '/payment';
            navigate(target, {
                state: {
                    bookingData: {
                        skipCreate: true,
                        appointmentId: d.appointmentId,
                        clinicId: d.clinicId,
                        price: d.price,
                        clinicName: d.clinicName,
                        serviceName: 'Tez yordam',
                        scheduledAt: new Date().toISOString(),
                        selectedDate: new Date().toISOString().split('T')[0],
                        returnTo: `/skory/pay/${id}`,
                    },
                },
            });
        } catch (err) {
            const msg = err?.response?.data?.message;
            if (err?.response?.status === 401) {
                navigate(`/user/login?redirect=/skory/pay/${id}`);
                return;
            }
            setError(msg || 'To\'lovni boshlashda xato');
            setBusyMethod(null);
        }
    };

    if (loading) {
        return <div className="skp"><div className="skp__box"><Loader2 className="skp__spin" size={30} /></div></div>;
    }
    if (error && !info) {
        return <div className="skp"><div className="skp__box skp__center"><AlertTriangle size={40} color="#dc2626" /><p>{error}</p></div></div>;
    }

    const paid = info?.paymentStatus === 'PAID';

    return (
        <div className="skp">
            <div className="skp__box">
                <div className="skp__head">
                    <Ambulance size={26} />
                    <div>
                        <div className="skp__title">Tez yordam to'lovi</div>
                        <div className="skp__sub">{info?.clinicName} · {info?.callSign}</div>
                    </div>
                </div>

                {paid ? (
                    <div className="skp__center skp__paid">
                        <CheckCircle2 size={54} color="#16a34a" />
                        <h2>To'lov qabul qilindi</h2>
                        <div className="skp__amount">{som(info.paidAmount || info.totalPrice)}</div>
                        <p className="skp__thanks">Rahmat! Tez tuzalishingizni tilaymiz.</p>
                    </div>
                ) : (
                    <>
                        <div className="skp__amountbox">
                            <div className="skp__amountbox__lbl">To'lov summasi</div>
                            <div className="skp__amountbox__val">{som(info.totalPrice)}</div>
                            <div className="skp__breakdown">
                                <span>Borish: {som(info.tripFee)}</span>
                                {info.waitingFee > 0 && <span> · Kutish ({info.waitingMinutes} daq): {som(info.waitingFee)}</span>}
                            </div>
                        </div>

                        {cashChosen ? (
                            <div className="skp__cash-note">
                                <Banknote size={22} color="#16a34a" />
                                <div>
                                    <b>{som(info.totalPrice)}</b>ni tez yordam xodimiga bering.
                                    <div className="skp__cash-sub">Xodim qabul qilgach, bu sahifa avtomatik yangilanadi.</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="skp__methods-lbl"><Wallet size={13} /> To'lov usulini tanlang</div>
                                <div className="skp__methods">
                                    {(info.methods || []).map((m) => {
                                        const meta = METHOD_META[m] || METHOD_META.CASH;
                                        const Icon = meta.icon;
                                        return (
                                            <button
                                                key={m}
                                                className="skp__method"
                                                onClick={() => pay(m)}
                                                disabled={!!busyMethod}
                                                style={{ borderColor: meta.color + '55' }}
                                            >
                                                <span className="skp__method__icon" style={{ background: meta.color + '18', color: meta.color }}>
                                                    {busyMethod === m ? <Loader2 size={18} className="skp__spin" /> : <Icon size={18} />}
                                                </span>
                                                <span className="skp__method__body">
                                                    <span className="skp__method__name">{meta.label}</span>
                                                    <span className="skp__method__hint">{meta.hint}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {error && <div className="skp__err"><AlertTriangle size={14} /> {error}</div>}
                    </>
                )}
            </div>
        </div>
    );
}
