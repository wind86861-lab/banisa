import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle, Building2 } from 'lucide-react';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import './css/UserAuth.css';

export default function UserLoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useUserAuth();
    const [form, setForm] = useState({ phone: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const from = location.state?.from || '/user/dashboard';
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

    return (
        <div className="auth-page">
            <div className="auth-split">

                {/* ── LEFT BRAND ── */}
                <div className="auth-brand">
                    <div className="auth-brand-logo">
                        <div className="auth-brand-logo-icon">
                            <svg viewBox="0 0 46 46" fill="none">
                                <rect width="46" height="46" rx="12" fill="#fff" fillOpacity="0.15" />
                                <rect x="13" y="20" width="20" height="6" rx="1.5" fill="#fff" />
                                <rect x="20" y="13" width="6" height="20" rx="1.5" fill="#fff" />
                            </svg>
                        </div>
                        <div className="auth-brand-name">BANISA <span>Medical</span></div>
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
                            Hisobingiz yo'qmi? <Link to="/user/signup" state={{ from }}>Ro'yxatdan o'tish</Link>
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
