import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Loader2, AlertCircle, ArrowRight, Phone, Upload, FileCheck2, X } from 'lucide-react';
import { useUserAuth } from '../shared/auth/UserAuthContext';
import { registerDoctor, getInitData, getTelegramUser, uploadDoctorDoc } from './useDoctor';
import './doctor-portal.css';

// One diploma uploader tile (image or PDF). Shows uploaded / uploading states.
function DiplomaField({ label, required, value, onChange }) {
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState('');
    const pick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setErr(''); setUploading(true);
        try {
            const url = await uploadDoctorDoc(file);
            onChange(url);
        } catch (ex) {
            setErr(ex?.response?.data?.message || 'Yuklashda xatolik');
        } finally { setUploading(false); }
    };
    return (
        <div className="dp-field">
            <span>{label}{required && ' *'}</span>
            {value ? (
                <div className="dp-doc-done">
                    <FileCheck2 size={18} />
                    <span>Yuklandi</span>
                    <a href={value} target="_blank" rel="noreferrer">Ko'rish</a>
                    <button type="button" onClick={() => onChange('')} aria-label="O'chirish"><X size={15} /></button>
                </div>
            ) : (
                <label className={`dp-doc-upload${uploading ? ' is-busy' : ''}`}>
                    <input type="file" accept="image/*,application/pdf" onChange={pick} disabled={uploading} hidden />
                    {uploading ? <><Loader2 size={16} className="dp-spin" /> Yuklanmoqda...</>
                              : <><Upload size={16} /> Fayl tanlash (rasm yoki PDF)</>}
                </label>
            )}
            {err && <div className="dp-error dp-error--sm"><AlertCircle size={13} /> {err}</div>}
        </div>
    );
}

export default function DoctorRegisterPage() {
    const navigate = useNavigate();
    const { user, ensurePatientAuth } = useUserAuth();
    const [form, setForm] = useState({ firstName: '', lastName: '', specialty: '', workplace: '', bio: '' });
    const [bakalavr, setBakalavr] = useState('');
    const [magistr, setMagistr] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);
    const hasTelegram = !!getInitData();

    // Prefill the name from Telegram (editable) + log in via the shared contact
    // so we have the verified phone. Already a doctor → straight to the portal.
    useEffect(() => {
        const tg = getTelegramUser();
        setForm((p) => ({
            ...p,
            firstName: p.firstName || tg?.first_name || '',
            lastName: p.lastName || tg?.last_name || '',
        }));
        (async () => {
            try { await ensurePatientAuth?.(); } catch { /* ignore */ }
            setChecking(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { if (user?.role === 'DOCTOR') navigate('/doctor', { replace: true }); }, [user, navigate]);

    const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

    // Verified phone comes from the contact the user shared in the bot.
    const verifiedPhone = user?.phone || '';

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!hasTelegram) { setError('Iltimos, ilovani Telegram orqali oching.'); return; }
        if (!verifiedPhone) { setError('Avval botda /start bosib 📱 telefon raqamingizni ulashing.'); return; }
        if (!form.firstName.trim() || !form.lastName.trim()) { setError('Ism va familiyani kiriting.'); return; }
        if (!form.workplace.trim()) { setError('Ishlash joyini kiriting.'); return; }
        if (!bakalavr) { setError('Bakalavr diplomini yuklang.'); return; }
        setBusy(true);
        try {
            const documents = [
                { url: bakalavr, name: 'Bakalavr diplomi', type: 'bakalavr' },
                ...(magistr ? [{ url: magistr, name: 'Magistr diplomi', type: 'magistr' }] : []),
            ];
            await registerDoctor({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                specialty: form.specialty.trim(),
                workplace: form.workplace.trim(),
                bio: form.bio.trim(),
                documents,
            });
            try { await ensurePatientAuth?.(); } catch { /* ignore */ }
            navigate('/doctor', { replace: true });
        } catch (err) {
            const code = err?.response?.status;
            const msg = err?.response?.data?.message
                || (code === 409 ? 'Bu Telegram boshqa rol bilan band.' : 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
            setError(String(msg));
        } finally {
            setBusy(false);
        }
    };

    const needContact = !checking && hasTelegram && !verifiedPhone;

    return (
        <div className="dp dp--center">
            <div className="dp-reg">
                <div className="dp-reg-hero">
                    <div className="dp-badge"><Stethoscope size={26} /></div>
                    <h1>Shifokor sifatida ro'yxatdan o'ting</h1>
                    <p>Tasdiqlangach, bemorlaringizga klinikadan xizmatlar tavsiya qila olasiz.</p>
                </div>

                {needContact && (
                    <div className="dp-error" style={{ marginBottom: 14 }}>
                        <AlertCircle size={15} /> Avval botda <b>/start</b> bosib 📱 telefon raqamingizni ulashing, keyin shu sahifani qayta oching.
                    </div>
                )}

                <form className="dp-form" onSubmit={submit}>
                    <div className="dp-row2">
                        <label className="dp-field">
                            <span>Ism *</span>
                            <input value={form.firstName} onChange={set('firstName')} placeholder="Ism" />
                        </label>
                        <label className="dp-field">
                            <span>Familiya *</span>
                            <input value={form.lastName} onChange={set('lastName')} placeholder="Familiya" />
                        </label>
                    </div>

                    {/* Verified phone — from the shared contact, not editable */}
                    <div className="dp-field">
                        <span>Telefon raqami (tasdiqlangan)</span>
                        <div className="dp-phone-locked">
                            <Phone size={16} />
                            <span>{verifiedPhone || (checking ? 'Tekshirilmoqda…' : '—')}</span>
                        </div>
                    </div>

                    <label className="dp-field">
                        <span>Mutaxassislik</span>
                        <input value={form.specialty} onChange={set('specialty')} placeholder="Masalan: Kardiolog" />
                    </label>
                    <label className="dp-field">
                        <span>Ishlash joyi *</span>
                        <input value={form.workplace} onChange={set('workplace')} placeholder="Klinika / kasalxona nomi" />
                    </label>

                    <DiplomaField label="Bakalavr diplomi" required value={bakalavr} onChange={setBakalavr} />
                    <DiplomaField label="Magistr diplomi (ixtiyoriy)" value={magistr} onChange={setMagistr} />

                    <label className="dp-field">
                        <span>Qisqacha (bio)</span>
                        <textarea value={form.bio} onChange={set('bio')} rows={3} placeholder="Tajriba, ish joyi..." />
                    </label>

                    {error && <div className="dp-error"><AlertCircle size={15} /> {error}</div>}

                    <button className="dp-btn dp-btn--primary" type="submit" disabled={busy || checking || needContact}>
                        {busy ? <><Loader2 size={18} className="dp-spin" /> Yuborilmoqda...</>
                              : <>Ro'yxatdan o'tish <ArrowRight size={18} /></>}
                    </button>
                    <p className="dp-hint">Ma'lumotlaringiz admin tomonidan tekshiriladi.</p>
                </form>
            </div>
        </div>
    );
}
