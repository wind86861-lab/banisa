import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import './css/UserAuth.css';

export default function UserResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const [phase, setPhase] = useState('checking'); // checking | form | invalid | done
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) { setPhase('invalid'); return; }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axiosInstance.get('/user/auth/reset-password/check', { params: { token } });
                if (cancelled) return;
                setPhase(data?.data?.valid ? 'form' : 'invalid');
            } catch {
                if (!cancelled) setPhase('invalid');
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) { setError('Parol kamida 6 ta belgi bo\'lishi kerak'); return; }
        if (password !== confirmPassword) { setError('Parollar mos kelmaydi'); return; }
        setSubmitting(true);
        try {
            await axiosInstance.post('/user/auth/reset-password', { token, newPassword: password });
            setPhase('done');
            setTimeout(() => navigate('/user/login', { replace: true }), 2500);
        } catch (err) {
            const msg = err?.response?.data?.error?.message
                || err?.response?.data?.message
                || 'Parolni o\'zgartirishda xatolik';
            setError(String(msg));
        } finally { setSubmitting(false); }
    };

    if (phase === 'checking') {
        return (
            <div className="auth-page">
                <div className="auth-form-panel" style={{ maxWidth: 460, margin: '40px auto', padding: 24, textAlign: 'center' }}>
                    <Loader2 size={36} className="auth-spin" style={{ color: '#229ED9', marginTop: 32 }} />
                    <p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>Havola tekshirilmoqda...</p>
                </div>
            </div>
        );
    }

    if (phase === 'invalid') {
        return (
            <div className="auth-page">
                <div className="auth-form-panel" style={{ maxWidth: 460, margin: '40px auto', padding: 24 }}>
                    <div className="auth-form-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <AlertCircle size={42} style={{ color: '#ef4444', alignSelf: 'center' }} />
                        <h1 className="auth-form-title">Havola noto'g'ri yoki muddati o'tgan</h1>
                        <p className="auth-form-sub">
                            Parolni tiklash havolasi 15 daqiqa amal qiladi. Yangi havola olish uchun qaytadan urinib ko'ring.
                        </p>
                        <Link to="/user/forgot-password" className="auth-submit" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            Yangi havola so'rash
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'done') {
        return (
            <div className="auth-page">
                <div className="auth-form-panel" style={{ maxWidth: 460, margin: '40px auto', padding: 24 }}>
                    <div className="auth-form-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <CheckCircle2 size={42} style={{ color: '#16a34a', alignSelf: 'center' }} />
                        <h1 className="auth-form-title">Parol o'zgartirildi</h1>
                        <p className="auth-form-sub">Yangi parolingiz bilan kirishingiz mumkin. Sahifa qayta yo'naltirilmoqda...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-form-panel" style={{ maxWidth: 460, margin: '40px auto', padding: 24 }}>
                <Link to="/user/login" className="auth-back"><ArrowLeft size={15} /> Kirish sahifasi</Link>
                <div className="auth-form-box">
                    <h1 className="auth-form-title">Yangi parol</h1>
                    <p className="auth-form-sub">Yangi parolingizni o'rnating</p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label><Lock size={14} /> Yangi parol</label>
                            <div className="auth-field-wrap">
                                <span className="auth-field-icon-wrap"><Lock size={16} /></span>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Kamida 6 ta belgi"
                                    required minLength={6}
                                    autoFocus
                                />
                                <button type="button" className="auth-field-toggle" onClick={() => setShowPass(p => !p)}>
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label><Lock size={14} /> Parolni tasdiqlang</label>
                            <div className="auth-field-wrap">
                                <span className="auth-field-icon-wrap"><Lock size={16} /></span>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                                    placeholder="Parolni qayta kiriting"
                                    required minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="auth-error">
                                <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                            </div>
                        )}

                        <button type="submit" className="auth-submit" disabled={submitting || !password || !confirmPassword}>
                            {submitting
                                ? <><Loader2 size={18} className="auth-spin" /> Saqlanmoqda...</>
                                : 'Parolni saqlash'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
