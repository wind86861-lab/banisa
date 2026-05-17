import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Phone, Lock, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle, Building2 } from 'lucide-react';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './css/UserAuth.css';

// Only allow internal redirects to prevent open-redirect via ?redirect=https://...
function safeRedirect(target, fallback = '/user/dashboard') {
    if (!target || typeof target !== 'string') return fallback;
    if (!target.startsWith('/') || target.startsWith('//')) return fallback;
    return target;
}

export default function UserLoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { login } = useUserAuth();
    const [form, setForm] = useState({ phone: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const redirectParam = searchParams.get('redirect');
    const from = safeRedirect(redirectParam || location.state?.from, '/user/dashboard');
    const signupHref = redirectParam ? `/user/signup?redirect=${encodeURIComponent(redirectParam)}` : '/user/signup';
    const justRegistered = location.state?.registered === true;

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.phone, form.password);
            navigate(from, { replace: true });
        } catch (err) {
            const status = err?.response?.status;
            const d = err?.response?.data;
            let msg;
            if (!status) msg = 'Serverga ulanib bo\'lmadi. Internet yoki server holatini tekshiring.';
            else if (status === 429) msg = 'Juda ko\'p urinish. Biroz kuting va qayta urinib ko\'ring.';
            else if (status === 401 || status === 400) msg = 'Telefon raqam yoki parol noto\'g\'ri.';
            else if (status >= 500) msg = 'Server xatoligi yuz berdi. Biroz kuting va qayta urinib ko\'ring.';
            else msg = d?.error?.message || d?.message || (typeof d?.error === 'string' ? d.error : null) || err?.message || 'Tizimga kirishda xatolik yuz berdi';
            setError(String(msg));
        } finally { setLoading(false); }
    };

    if (loading) {
        return <BanisaLoader message="Kirish..." />;
    }

    return (
        <div className="auth-page">
            <div className="auth-split">

                {/* ── LEFT BRAND ── */}
                <div className="auth-brand">
                    <div className="auth-brand-logo">
                        <img
                            src="/images/banisa-logo.png?v=3"
                            alt="Banisa"
                            style={{
                                width: 84, height: 84, borderRadius: 16,
                                objectFit: 'cover', display: 'block',
                                border: 'none', outline: 'none',
                                filter: 'drop-shadow(0 0 18px rgba(0,189,224,0.4))',
                            }}
                        />
                        <div className="auth-brand-name">BANISA</div>
                    </div>
                    <div className="auth-brand-body">
                        <h2 className="auth-brand-heading">Sog'liqingiz bizning ustuvorligimiz</h2>
                        <p className="auth-brand-sub">O'zbekistondagi yetakchi klinikalar bilan bog'laning. Bron qiling, sharh qoldiring va o'z sog'lig'ingizni nazorat qiling.</p>
                    </div>
                    <div className="auth-brand-features">
                        <div className="auth-brand-feature"><span className="auth-brand-feature-ico">🏥</span><span>500+ klinika</span></div>
                        <div className="auth-brand-feature"><span className="auth-brand-feature-ico">📅</span><span>Onlayn bron qilish</span></div>
                        <div className="auth-brand-feature"><span className="auth-brand-feature-ico">⭐</span><span>Ishonchli sharhlar</span></div>
                    </div>
                </div>

                {/* ── RIGHT FORM ── */}
                <div className="auth-form-panel">
                    <Link to="/" className="auth-back"><ArrowLeft size={15} /> Bosh sahifa</Link>

                    <div className="auth-form-box">
                        <h1 className="auth-form-title">Xush kelibsiz!</h1>
                        <p className="auth-form-sub">Hisobingizga kiring</p>

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="auth-field">
                                <label><Phone size={14} /> Telefon raqam</label>
                                <div className="auth-field-wrap">
                                    <span className="auth-field-icon-wrap"><Phone size={16} /></span>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => set('phone', e.target.value)}
                                        placeholder="+998 90 123 45 67"
                                        required autoFocus
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label><Lock size={14} /> Parol</label>
                                <div className="auth-field-wrap">
                                    <span className="auth-field-icon-wrap"><Lock size={16} /></span>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => set('password', e.target.value)}
                                        placeholder="Parolni kiriting"
                                        required minLength={6}
                                    />
                                    <button type="button" className="auth-field-toggle" onClick={() => setShowPass(p => !p)}>
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {justRegistered && !error && (
                                <div className="auth-success" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#16a34a', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    ✓ Ro'yxatdan muvaffaqiyatli o'tdingiz! Endi tizimga kiring.
                                </div>
                            )}

                            {error && (
                                <div className="auth-error">
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                                </div>
                            )}

                            <button type="submit" className="auth-submit" disabled={loading}>
                                {loading ? <><Loader2 size={18} className="auth-spin" /> Yuklanmoqda...</> : 'Kirish'}
                            </button>
                        </form>

                        <div className="auth-footer">
                            Hisobingiz yo'qmi? <Link to={signupHref} state={{ from }}>Ro'yxatdan o'tish</Link>
                        </div>

                        <div className="auth-divider">yoki</div>

                        <Link to="/login" className="auth-clinic-link">
                            <Building2 size={16} /> Klinika admin sifatida kirish
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
