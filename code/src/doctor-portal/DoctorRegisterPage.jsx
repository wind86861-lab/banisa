import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useUserAuth } from '../shared/auth/UserAuthContext';
import { registerDoctor, getInitData } from './useDoctor';
import './doctor-portal.css';

export default function DoctorRegisterPage() {
    const navigate = useNavigate();
    const { user, ensurePatientAuth } = useUserAuth();
    const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', specialty: '', bio: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const hasTelegram = !!getInitData();

    // Already a doctor → straight to the portal.
    useEffect(() => { if (user?.role === 'DOCTOR') navigate('/doctor', { replace: true }); }, [user, navigate]);

    const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!hasTelegram) { setError('Iltimos, ilovani Telegram orqali oching.'); return; }
        if (!form.phone.trim()) { setError('Telefon raqamini kiriting.'); return; }
        setBusy(true);
        try {
            await registerDoctor({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: form.phone.trim(),
                specialty: form.specialty.trim(),
                bio: form.bio.trim(),
            });
            try { await ensurePatientAuth?.(); } catch { /* ignore */ }
            navigate('/doctor', { replace: true });
        } catch (err) {
            const code = err?.response?.status;
            const msg = err?.response?.data?.message
                || (code === 409 ? 'Bu Telegram yoki telefon allaqachon band.' : 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
            setError(String(msg));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="dp dp--center">
            <div className="dp-reg">
                <div className="dp-reg-hero">
                    <div className="dp-badge"><Stethoscope size={26} /></div>
                    <h1>Shifokor sifatida ro'yxatdan o'ting</h1>
                    <p>Tasdiqlangach, bemorlaringizga klinikadan xizmatlar tavsiya qila olasiz.</p>
                </div>

                <form className="dp-form" onSubmit={submit}>
                    <div className="dp-row2">
                        <label className="dp-field">
                            <span>Ism</span>
                            <input value={form.firstName} onChange={set('firstName')} placeholder="Ism" />
                        </label>
                        <label className="dp-field">
                            <span>Familiya</span>
                            <input value={form.lastName} onChange={set('lastName')} placeholder="Familiya" />
                        </label>
                    </div>
                    <label className="dp-field">
                        <span>Telefon raqami *</span>
                        <input value={form.phone} onChange={set('phone')} placeholder="+998 90 123 45 67" inputMode="tel" />
                    </label>
                    <label className="dp-field">
                        <span>Mutaxassislik</span>
                        <input value={form.specialty} onChange={set('specialty')} placeholder="Masalan: Kardiolog" />
                    </label>
                    <label className="dp-field">
                        <span>Qisqacha (bio)</span>
                        <textarea value={form.bio} onChange={set('bio')} rows={3} placeholder="Tajriba, ish joyi..." />
                    </label>

                    {error && <div className="dp-error"><AlertCircle size={15} /> {error}</div>}

                    <button className="dp-btn dp-btn--primary" type="submit" disabled={busy}>
                        {busy ? <><Loader2 size={18} className="dp-spin" /> Yuborilmoqda...</>
                              : <>Davom etish <ArrowRight size={18} /></>}
                    </button>
                    <p className="dp-hint">Keyingi qadamda hujjatlaringizni (diplom/sertifikat) yuklaysiz.</p>
                </form>
            </div>
        </div>
    );
}
