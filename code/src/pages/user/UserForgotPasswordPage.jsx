import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Loader2, ArrowLeft, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import './css/UserAuth.css';

export default function UserForgotPasswordPage() {
    const [phone, setPhone] = useState('');
    const [phase, setPhase] = useState('form'); // form | sent | error
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await axiosInstance.post('/user/auth/forgot-password', { phone });
            setPhase('sent');
        } catch (err) {
            const msg = err?.response?.data?.error?.message
                || err?.response?.data?.message
                || 'Yuborishda xatolik';
            setError(String(msg));
            setPhase('error');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="auth-page">
            <div className="auth-form-panel" style={{ maxWidth: 460, margin: '40px auto', padding: 24 }}>
                <Link to="/user/login" className="auth-back"><ArrowLeft size={15} /> Kirish sahifasi</Link>
                <div className="auth-form-box">
                    <h1 className="auth-form-title">Parolni tiklash</h1>

                    {phase === 'sent' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
                            <CheckCircle2 size={42} style={{ color: '#16a34a' }} />
                            <p className="auth-form-sub">
                                Agar bu raqam tizimda mavjud bo'lsa, parol tiklash havolasi yuborildi. Telegram bot bilan bog'langan bo'lsangiz — botga, aks holda SMS orqali. Havola 15 daqiqa amal qiladi.
                            </p>
                            <Link to="/user/login" className="auth-submit" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                Kirish sahifasiga qaytish
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="auth-form-sub">
                                Telefon raqamingizni kiriting. Parol tiklash havolasini Telegram bot orqali (agar bog'langan bo'lsa) yoki SMS orqali yuboramiz.
                            </p>

                            <form className="auth-form" onSubmit={handleSubmit}>
                                <div className="auth-field">
                                    <label><Phone size={14} /> Telefon raqam</label>
                                    <div className="auth-field-wrap">
                                        <span className="auth-field-icon-wrap"><Phone size={16} /></span>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => { setPhone(e.target.value); setError(''); }}
                                            placeholder="+998 90 123 45 67"
                                            required autoFocus
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="auth-error">
                                        <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                                    </div>
                                )}

                                <button type="submit" className="auth-submit" disabled={submitting || !phone}>
                                    {submitting
                                        ? <><Loader2 size={18} className="auth-spin" /> Yuborilmoqda...</>
                                        : <><Send size={16} /> Havola yuborish</>}
                                </button>
                            </form>

                            <div className="auth-footer">
                                Eslatma: SMS havola 1 ta xabar hajmida bo'lib, qisqartirilgan formada keladi. Telegram bot bog'langanlar batafsil xabar oladi.
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
