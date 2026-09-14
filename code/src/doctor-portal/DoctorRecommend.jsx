import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Search, Phone, Check, Loader2, AlertCircle, Plus, Minus,
    Building2, Send, CheckCircle2, Info, UserPlus,
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

    // A phone is "usable" once it carries a full local number; the doctor types
    // it by hand, so we count digits rather than demanding a fixed format.
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneReady = phoneDigits.length >= 9;

    // The lookup is advisory ONLY. A doctor may refer someone who has never
    // opened the bot — the backend stores the referral against the phone and
    // links it on that number's first /start. So this just tells the doctor
    // whether the patient will see it now or once they join; it never blocks.
    useEffect(() => {
        if (!phoneReady) { setPatient(null); setErr(''); return; }
        let cancelled = false;
        setChecking(true);
        const t = setTimeout(async () => {
            try {
                const r = await lookupPatient(phone.trim());
                if (!cancelled) setPatient(r?.found ? r : null);
            } catch {
                if (!cancelled) setPatient(null);
            } finally {
                if (!cancelled) setChecking(false);
            }
        }, 450);
        return () => { cancelled = true; clearTimeout(t); setChecking(false); };
    }, [phone, phoneReady]);

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
                patientPhone: patient?.phone || phone.trim(),
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
                    {done.patientPending ? (
                        <p>
                            {done.patientPhone || 'Bemor'} uchun {basketArr.length} ta xizmat saqlandi.
                            Bemor botga kirib <b>/start</b> bosishi bilan tavsiya unga avtomatik ko'rinadi.
                        </p>
                    ) : (
                        <p>{done.patientName || 'Bemor'}ga {basketArr.length} ta xizmat tavsiya qilindi. Bemor botda ko'rib, qabul yoki rad qiladi.</p>
                    )}
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
                    <h3 className="dp-step-t">Bemor raqami</h3>
                    <p className="dp-step-hint">Tavsiya shu raqamga biriktiriladi.</p>

                    <div className="dp-field">
                        <span className="dp-field-ic"><Phone size={17} /></span>
                        <input
                            className="dp-field-input"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="+998 90 123 45 67"
                            inputMode="tel"
                            autoFocus
                        />
                        {checking && <Loader2 size={16} className="dp-spin dp-field-spin" />}
                    </div>

                    {/* Status is informational in both directions — neither state
                        stops the doctor from continuing. */}
                    {phoneReady && !checking && patient && (
                        <div className="dp-note dp-note--ok">
                            <span className="dp-note-ic"><Check size={16} /></span>
                            <div>
                                <b>{patient.name || 'Bemor'}</b>
                                <span>Botda ro'yxatdan o'tgan — tavsiyani darhol oladi.</span>
                            </div>
                        </div>
                    )}

                    {phoneReady && !checking && !patient && (
                        <div className="dp-note dp-note--wait">
                            <span className="dp-note-ic"><UserPlus size={16} /></span>
                            <div>
                                <b>Bu raqam hali botda yo'q</b>
                                <span>Tavsiyani baribir yuborishingiz mumkin — bemor botga
                                kirib <b>/start</b> bosishi bilan avtomatik ko'rinadi.</span>
                            </div>
                        </div>
                    )}

                    {!phoneReady && phone.trim() !== '' && (
                        <div className="dp-note dp-note--info">
                            <span className="dp-note-ic"><Info size={16} /></span>
                            <div><span>Raqamni to'liq kiriting.</span></div>
                        </div>
                    )}

                    {err && <div className="dp-error"><AlertCircle size={15} /> {err}</div>}

                    <button
                        className="dp-btn dp-btn--primary dp-btn--lg dp-step-cta"
                        disabled={!phoneReady}
                        onClick={() => setStep(2)}
                    >
                        Davom etish
                    </button>
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
