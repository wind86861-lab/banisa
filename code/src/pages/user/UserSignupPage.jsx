import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock, User, Mail, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle, Building2 } from 'lucide-react';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import './css/UserAuth.css';

export default function UserSignupPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, login } = useUserAuth();
    const [form, setForm] = useState({ phone: '', password: '', confirmPassword: '', firstName: '', lastName: '', email: '' });
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const from = location.state?.from || '/user/dashboard';
    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirmPassword) { setError('Parollar bir xil emas'); return; }
        setLoading(true);
        try {
            await register({ phone: form.phone, password: form.password, firstName: form.firstName, lastName: form.lastName, email: form.email || undefined });
            // Registration succeeded — auto-login (failure is non-fatal)
            try {
                await login(form.phone, form.password);
                navigate(from, { replace: true });
            } catch {
                setLoading(false);
                navigate('/user/login', { state: { from, registered: true } });
            }
        } catch (err) {
            const status = err?.response?.status;
            const d = err?.response?.data;
            const code = d?.error?.code;
            let msg;
            if (!status) msg = 'Serverga ulanib bo\'lmadi. Internet yoki server holatini tekshiring.';
            else if (status === 429) msg = 'Juda ko\'p urinish. Biroz kuting va qayta urinib ko\'ring.';
            else if (code === 'DUPLICATE_ERROR' || status === 409) msg = d?.error?.message || 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan. Tizimga kiring.';
            else if (code === 'VALIDATION_ERROR') { const fi = d?.error?.details?.[0]; msg = fi?.message || d?.error?.message || 'Ma\'lumotlar noto\'g\'ri.'; }
            else if (status >= 500) msg = 'Server xatoligi yuz berdi. Biroz kuting va qayta urinib ko\'ring.';
            else msg = d?.error?.message || d?.message || (typeof d?.error === 'string' ? d.error : null) || err?.message || "Ro'yxatdan o'tishda xatolik yuz berdi";
            console.error('Signup error:', status, code, d);
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
                        <h2 className="auth-brand-heading">Bugun ro'yxatdan o'ting</h2>
                        <p className="auth-brand-sub">Minglab bemorlar bizning platformadan foydalanmoqda. Siz ham qo'shiling va sog'liq xizmatlaridan oson foydalaning.</p>
                    </div>
                    <div className="auth-brand-features">
                        <div className="auth-brand-feature"><span className="auth-brand-feature-ico">🔒</span><span>Xavfsiz va ishonchli</span></div>
                        <div className="auth-brand-feature"><span className="auth-brand-feature-ico">💬</span><span>Sharh qoldirish imkoni</span></div>
                        <div className="auth-brand-feature"><span className="auth-brand-feature-ico">📲</span><span>Qulay boshqaruv</span></div>
                    </div>
                </div>

                {/* ── RIGHT FORM ── */}
                <div className="auth-form-panel">
                    <Link to="/" className="auth-back"><ArrowLeft size={15} /> Bosh sahifa</Link>

                    <div className="auth-form-box">
                        <h1 className="auth-form-title">Hisob yaratish</h1>
                        <p className="auth-form-sub">Barcha maydonlarni to'ldiring</p>

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="auth-row">
                                <div className="auth-field">
                                    <label><User size={14} /> Ism</label>
                                    <div className="auth-field-wrap">
                                        <span className="auth-field-icon-wrap"><User size={16} /></span>
                                        <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Ismingiz" required autoFocus />
                                    </div>
                                </div>
                                <div className="auth-field">
                                    <label><User size={14} /> Familiya</label>
                                    <div className="auth-field-wrap">
                                        <span className="auth-field-icon-wrap"><User size={16} /></span>
                                        <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Familiyangiz" required />
                                    </div>
                                </div>
                            </div>

                            <div className="auth-field">
                                <label><Phone size={14} /> Telefon raqam</label>
                                <div className="auth-field-wrap">
                                    <span className="auth-field-icon-wrap"><Phone size={16} /></span>
                                    <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+998 90 123 45 67" required />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label><Mail size={14} /> Email <span style={{ color: '#9ca3af', fontWeight: 400 }}>(ixtiyoriy)</span></label>
                                <div className="auth-field-wrap">
                                    <span className="auth-field-icon-wrap"><Mail size={16} /></span>
                                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
                                </div>
                            </div>

                            <div className="auth-row">
                                <div className="auth-field">
                                    <label><Lock size={14} /> Parol</label>
                                    <div className="auth-field-wrap">
                                        <span className="auth-field-icon-wrap"><Lock size={16} /></span>
                                        <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Kamida 6 ta belgi" required minLength={6} />
                                        <button type="button" className="auth-field-toggle" onClick={() => setShowPass(p => !p)}>
                                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="auth-field">
                                    <label><Lock size={14} /> Tasdiqlash</label>
                                    <div className="auth-field-wrap">
                                        <span className="auth-field-icon-wrap"><Lock size={16} /></span>
                                        <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Qayta kiriting" required minLength={6} />
                                        <button type="button" className="auth-field-toggle" onClick={() => setShowConfirm(p => !p)}>
                                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="auth-error">
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                                </div>
                            )}

                            <button type="submit" className="auth-submit" disabled={loading}>
                                {loading ? <><Loader2 size={18} className="auth-spin" /> Yuklanmoqda...</> : "Ro'yxatdan o'tish"}
                            </button>
                        </form>

                        <div className="auth-footer">
                            Hisobingiz bormi? <Link to="/user/login" state={{ from }}>Tizimga kirish</Link>
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
