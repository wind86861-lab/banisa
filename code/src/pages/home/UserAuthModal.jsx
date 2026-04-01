import { useState } from 'react';
import { X, User, Phone, Lock, Mail } from 'lucide-react';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import './css/UserAuthModal.css';

export default function UserAuthModal({ isOpen, onClose, onSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        phone: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
    });
    const [error, setError] = useState('');
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login, register } = useUserAuth();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(formData.phone, formData.password);
            } else {
                const registerData = {
                    phone: formData.phone,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email || undefined,
                };
                await register(registerData);
                // Registration succeeded — attempt auto-login (failure is non-fatal)
                try {
                    await login(formData.phone, formData.password);
                } catch {
                    // Auto-login failed but registration succeeded; switch to login form
                    setIsLogin(true);
                    setError('Ro\'yxatdan o\'tdingiz! Iltimos, tizimga kiring.');
                    setLoading(false);
                    return;
                }
            }

            if (onSuccess) {
                onSuccess();
            } else {
                onClose();
            }
        } catch (err) {
            const status = err?.response?.status;
            const d = err?.response?.data;
            const code = d?.error?.code;
            let errorMsg;
            setIsDuplicate(false);

            if (!status) {
                errorMsg = 'Serverga ulanib bo\'lmadi. Internet yoki server holatini tekshiring.';
            } else if (status === 429) {
                errorMsg = 'Juda ko\'p urinish. Biroz kuting va qayta urinib ko\'ring.';
            } else if (status === 401) {
                errorMsg = 'Telefon raqam yoki parol noto\'g\'ri.';
            } else if (code === 'DUPLICATE_ERROR' || status === 409) {
                errorMsg = d?.error?.message || 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan.';
                setIsDuplicate(true);
            } else if (code === 'VALIDATION_ERROR') {
                const firstIssue = d?.error?.details?.[0];
                errorMsg = firstIssue?.message || d?.error?.message || 'Ma\'lumotlar noto\'g\'ri.';
            } else if (status >= 500) {
                errorMsg = 'Server xatoligi yuz berdi. Biroz kuting va qayta urinib ko\'ring.';
            } else {
                errorMsg =
                    d?.error?.message ||
                    d?.message ||
                    (typeof d?.error === 'string' ? d.error : null) ||
                    err?.message ||
                    'Xatolik yuz berdi';
            }
            console.error('Auth error:', status, code, d);
            setError(String(errorMsg));
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setIsDuplicate(false);
        setFormData({
            phone: '',
            password: '',
            firstName: '',
            lastName: '',
            email: '',
        });
    };

    if (!isOpen) return null;

    return (
        <div className="uam-overlay" onClick={onClose}>
            <div className="uam-modal" onClick={(e) => e.stopPropagation()}>
                <button className="uam-close" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="uam-header">
                    <h2>{isLogin ? 'Tizimga kirish' : 'Ro\'yxatdan o\'tish'}</h2>
                    <p>{isLogin ? 'Sharh qoldirish uchun tizimga kiring' : 'Yangi hisob yarating'}</p>
                </div>

                <form className="uam-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="uam-form-group">
                                <label>
                                    <User size={18} />
                                    Ism
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Ismingizni kiriting"
                                    required
                                />
                            </div>

                            <div className="uam-form-group">
                                <label>
                                    <User size={18} />
                                    Familiya
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Familiyangizni kiriting"
                                    required
                                />
                            </div>

                            <div className="uam-form-group">
                                <label>
                                    <Mail size={18} />
                                    Email (ixtiyoriy)
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@example.com"
                                />
                            </div>
                        </>
                    )}

                    <div className="uam-form-group">
                        <label>
                            <Phone size={18} />
                            Telefon raqam
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+998 90 123 45 67"
                            required
                        />
                    </div>

                    <div className="uam-form-group">
                        <label>
                            <Lock size={18} />
                            Parol
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Parolni kiriting"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className="uam-error">
                            {typeof error === 'string' ? error : 'Xatolik yuz berdi'}
                            {isDuplicate && (
                                <button
                                    type="button"
                                    onClick={() => { setIsLogin(true); setError(''); setIsDuplicate(false); }}
                                    style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: '#1dbfc1', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}
                                >
                                    Tizimga kirish →
                                </button>
                            )}
                        </div>
                    )}

                    <button type="submit" className="uam-submit" disabled={loading}>
                        {loading ? 'Yuklanmoqda...' : isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
                    </button>
                </form>

                <div className="uam-footer">
                    <p>
                        {isLogin ? 'Hisobingiz yo\'qmi?' : 'Hisobingiz bormi?'}
                        {' '}
                        <button type="button" onClick={toggleMode} className="uam-toggle">
                            {isLogin ? 'Ro\'yxatdan o\'tish' : 'Tizimga kirish'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
