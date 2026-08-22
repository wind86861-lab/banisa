import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Search, Phone, Check, Loader2, AlertCircle, Plus, Minus,
    Building2, Send, CheckCircle2, X,
} from 'lucide-react';
import {
    lookupPatient, createRecommendation, usePublicServicesForBuilder, CATEGORY_TO_TYPE,
} from './useDoctor';
import './doctor-portal.css';

const fmt = (n) => (Number(n) || 0).toLocaleString('uz-UZ');

export default function DoctorRecommend() {
    const navigate = useNavigate();
    const { data: services = [], isLoading } = usePublicServicesForBuilder();

    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [patient, setPatient] = useState(null);
    const [checking, setChecking] = useState(false);
    const [err, setErr] = useState('');

    const [clinic, setClinic] = useState(null);
    const [clinicQ, setClinicQ] = useState('');
    const [svcQ, setSvcQ] = useState('');
    const [basket, setBasket] = useState({}); // key -> item
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(null);

    // Unique clinics from the service pool.
    const clinics = useMemo(() => {
        const m = new Map();
        services.forEach(s => { const c = s.clinic; if (c?.id && !m.has(c.id)) m.set(c.id, { id: c.id, name: c.name, region: c.region }); });
        return [...m.values()];
    }, [services]);

    const clinicList = useMemo(() => {
        const q = clinicQ.trim().toLowerCase();
        return clinics.filter(c => !q || (c.name || '').toLowerCase().includes(q)).slice(0, 40);
    }, [clinics, clinicQ]);

    const clinicServices = useMemo(() => {
        if (!clinic) return [];
        const q = svcQ.trim().toLowerCase();
        return services
            .filter(s => s.clinic?.id === clinic.id)
            .filter(s => !q || (s.title || '').toLowerCase().includes(q))
            .slice(0, 60);
    }, [services, clinic, svcQ]);

    const basketArr = Object.values(basket);
    const total = basketArr.reduce((s, i) => s + i.price * i.quantity, 0);

    const checkPatient = async () => {
        setErr(''); setChecking(true);
        try {
            const r = await lookupPatient(phone.trim());
            if (r.found) { setPatient(r); }
            else { setErr('Bu raqam bilan bemor botda topilmadi. Bemor avval botda ro\'yxatdan o\'tishi kerak.'); setPatient(null); }
        } catch { setErr('Tekshirishda xatolik.'); }
        finally { setChecking(false); }
    };

    const keyOf = (s) => `${CATEGORY_TO_TYPE(s.category)}:${s.serviceId || s.id}`;
    const addSvc = (s) => {
        const key = keyOf(s);
        setBasket(prev => {
            const ex = prev[key];
            return { ...prev, [key]: ex
                ? { ...ex, quantity: ex.quantity + 1 }
                : { key, serviceType: CATEGORY_TO_TYPE(s.category), serviceId: s.serviceId || s.id, name: s.title, price: Number(s.price) || 0, quantity: 1 } };
        });
    };
    const dec = (key) => setBasket(prev => {
        const ex = prev[key]; if (!ex) return prev;
        if (ex.quantity <= 1) { const n = { ...prev }; delete n[key]; return n; }
        return { ...prev, [key]: { ...ex, quantity: ex.quantity - 1 } };
    });

    const send = async () => {
        setErr(''); setSending(true);
        try {
            const res = await createRecommendation({
                patientPhone: patient.phone || phone.trim(),
                clinicId: clinic.id,
                items: basketArr.map(({ serviceType, serviceId, name, price, quantity }) => ({ serviceType, serviceId, name, price, quantity })),
            });
            setDone(res);
        } catch (e) {
            setErr(e?.response?.data?.message || 'Yuborishda xatolik.');
        } finally { setSending(false); }
    };

    if (done) {
        return (
            <div className="dp dp--center">
                <div className="dp-state dp-state--ok" style={{ maxWidth: 420 }}>
                    <div className="dp-state-ic"><CheckCircle2 size={40} /></div>
                    <h2>Tavsiya yuborildi ✅</h2>
                    <p>{done.patientName || 'Bemor'}ga {basketArr.length} ta xizmat tavsiya qilindi. Bemor botда ko'rib, qabul yoki rad qiladi.</p>
                    <button className="dp-btn dp-btn--primary dp-btn--lg" onClick={() => navigate('/doctor/recommendations')}>Tavsiyalarim</button>
                    <button className="dp-btn dp-btn--ghost dp-btn--lg" onClick={() => navigate('/doctor')} style={{ marginTop: 8 }}>Bosh sahifa</button>
                </div>
            </div>
        );
    }

    return (
        <div className="dp">
            <header className="dp-top">
                <button className="dp-back" onClick={() => step > 1 ? setStep(step - 1) : navigate('/doctor')}><ChevronLeft size={20} /></button>
                <b>Bemor uchun tavsiya</b>
                <span style={{ width: 38 }} />
            </header>

            <div className="dp-steps">
                {[1, 2, 3].map(n => <span key={n} className={`dp-dot${step >= n ? ' on' : ''}`} />)}
            </div>

            {/* Step 1 — patient */}
            {step === 1 && (
                <div className="dp-step">
                    <h3 className="dp-step-t">1. Bemor raqami</h3>
                    <div className="dp-inline">
                        <div className="dp-inline-input"><Phone size={16} /><input value={phone} onChange={e => { setPhone(e.target.value); setPatient(null); }} placeholder="+998 90 123 45 67" inputMode="tel" /></div>
                        <button className="dp-btn dp-btn--primary" onClick={checkPatient} disabled={checking || !phone.trim()}>
                            {checking ? <Loader2 size={16} className="dp-spin" /> : 'Tekshirish'}
                        </button>
                    </div>
                    {err && <div className="dp-error"><AlertCircle size={15} /> {err}</div>}
                    {patient && (
                        <div className="dp-found">
                            <div className="dp-found-ic"><Check size={18} /></div>
                            <div><b>{patient.name || 'Bemor'}</b><span>{patient.phone}</span></div>
                            <button className="dp-btn dp-btn--primary" onClick={() => setStep(2)}>Davom</button>
                        </div>
                    )}
                </div>
            )}

            {/* Step 2 — clinic */}
            {step === 2 && (
                <div className="dp-step">
                    <h3 className="dp-step-t">2. Klinikani tanlang</h3>
                    <div className="dp-inline-input"><Search size={16} /><input value={clinicQ} onChange={e => setClinicQ(e.target.value)} placeholder="Klinika qidirish..." /></div>
                    {isLoading ? <div className="dp-mini-load"><Loader2 size={22} className="dp-spin" /></div> : (
                        <div className="dp-picklist">
                            {clinicList.map(c => (
                                <button key={c.id} className="dp-pick" onClick={() => { setClinic(c); setStep(3); }}>
                                    <span className="dp-pick-ic"><Building2 size={16} /></span>
                                    <span className="dp-pick-main"><b>{c.name}</b>{c.region && <span>{c.region}</span>}</span>
                                </button>
                            ))}
                            {!clinicList.length && <p className="dp-hint">Klinika topilmadi</p>}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3 — services + basket */}
            {step === 3 && (
                <div className="dp-step dp-step--pad">
                    <div className="dp-clinic-tag"><Building2 size={14} /> {clinic?.name}</div>
                    <h3 className="dp-step-t">3. Xizmatlarni qo'shing</h3>
                    <div className="dp-inline-input"><Search size={16} /><input value={svcQ} onChange={e => setSvcQ(e.target.value)} placeholder="Xizmat qidirish..." /></div>
                    <div className="dp-svc-list">
                        {clinicServices.map(s => {
                            const key = keyOf(s); const inB = basket[key];
                            return (
                                <div key={key} className="dp-svc">
                                    <div className="dp-svc-main"><b>{s.title}</b><span>{fmt(s.price)} so'm</span></div>
                                    {inB ? (
                                        <div className="dp-qty">
                                            <button onClick={() => dec(key)}><Minus size={15} /></button>
                                            <span>{inB.quantity}</span>
                                            <button onClick={() => addSvc(s)}><Plus size={15} /></button>
                                        </div>
                                    ) : (
                                        <button className="dp-add" onClick={() => addSvc(s)}><Plus size={16} /></button>
                                    )}
                                </div>
                            );
                        })}
                        {!clinicServices.length && <p className="dp-hint">Xizmat topilmadi</p>}
                    </div>

                    {err && <div className="dp-error"><AlertCircle size={15} /> {err}</div>}

                    {basketArr.length > 0 && (
                        <div className="dp-basket-bar">
                            <div className="dp-basket-sum"><span>{basketArr.length} ta xizmat</span><b>{fmt(total)} so'm</b></div>
                            <button className="dp-btn dp-btn--primary" onClick={send} disabled={sending}>
                                {sending ? <Loader2 size={18} className="dp-spin" /> : <><Send size={17} /> Yuborish</>}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
