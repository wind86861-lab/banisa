import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Search, Phone, Check, Loader2, AlertCircle, Plus, Minus,
    Building2, Send, CheckCircle2, Info, UserPlus, ChevronDown, Scissors,
    ClipboardList, FlaskConical, Mountain,
} from 'lucide-react';
import {
    lookupPatient, createRecommendation, usePublicServicesForBuilder, CATEGORY_TO_TYPE,
} from './useDoctor';
import './doctor-portal.css';

const fmt = (n) => (Number(n) || 0).toLocaleString('uz-UZ');

// ── Phone ───────────────────────────────────────────────────────────────────
// The field used to take any string, so "+656565652626522" sailed through to a
// referral nobody could ever claim. It now holds digits only, inside E.164's
// 7–15 range. Foreign numbers are allowed — patients are not always on an UZ
// SIM — so the country code is typed rather than pinned to 998.
//
// The one convenience: exactly 9 digits is unambiguous locally (an UZ national
// number), so it gets +998. Anything else is taken as already carrying its
// country code. The resolved number is echoed under the field so the doctor can
// always see what will actually be saved.
const E164_MIN = 7;
const E164_MAX = 15;
const UZ_NAT_LEN = 9;

const phoneDigitsOf = (v) => String(v || '').replace(/\D/g, '').slice(0, E164_MAX);
const isUzNational = (d) => d.length === UZ_NAT_LEN;
const toE164 = (d) => (isUzNational(d) ? `+998${d}` : `+${d}`);

/** Group for readability: UZ as 90 123 45 67, others in loose 3s after the CC. */
const formatPhone = (d) => {
    if (!d) return '';
    if (isUzNational(d)) return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
    return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
};

// ── Service sections ────────────────────────────────────────────────────────
// The picker was one flat alphabetical list of every service a clinic offers —
// hundreds of rows for a lab, so finding anything meant scrolling or knowing the
// exact name. Group by the payload's top-level `category`, then by `specialty`
// (the sub-category), so the doctor drills down instead of hunting.
const SECTIONS = [
    { key: 'operatsiya',  label: 'Operatsiyalar', icon: Scissors },
    { key: 'checkup',     label: 'Check-uplar',   icon: ClipboardList },
    { key: 'diagnostika', label: 'Diagnostika',   icon: FlaskConical },
    { key: 'sanatoriya',  label: 'Sanatoriyalar', icon: Mountain },
];

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
    // Accordion, not navigation: a section expands in place and the sub-category
    // expands under it. One open at each level keeps the list short enough to
    // scan on a Mini App viewport.
    const [openSection, setOpenSection] = useState(null);
    const [openSpec, setOpenSpec] = useState(null);
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

    // Everything this clinic offers, before any drill-down.
    const clinicAll = useMemo(
        () => (clinic ? services.filter(s => s.clinic?.id === clinic.id) : []),
        [services, clinic],
    );

    // Section (Operatsiyalar / Check-uplar / …) → how many services sit under it.
    const sectionCounts = useMemo(() => {
        const m = {};
        clinicAll.forEach(s => { m[s.category] = (m[s.category] || 0) + 1; });
        return m;
    }, [clinicAll]);

    // section → [{ name, count, services }] — built once, read by the accordion.
    const bySection = useMemo(() => {
        const out = {};
        for (const { key } of SECTIONS) {
            const m = new Map();
            clinicAll.filter(s => s.category === key).forEach(s => {
                const name = s.specialty || 'Boshqa';
                if (!m.has(name)) m.set(name, []);
                m.get(name).push(s);
            });
            out[key] = [...m.entries()]
                .map(([name, list]) => ({
                    name,
                    count: list.length,
                    services: list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'uz')),
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
        }
        return out;
    }, [clinicAll]);

    // A search cuts across the whole clinic — when the doctor knows the name,
    // making them open a section first would be the slower path.
    const searching = svcQ.trim().length > 0;
    const searchResults = useMemo(() => {
        const q = svcQ.trim().toLowerCase();
        if (!q) return [];
        return clinicAll.filter(s => (s.title || '').toLowerCase().includes(q)).slice(0, 80);
    }, [clinicAll, svcQ]);

    const basketArr = Object.values(basket);
    const total = basketArr.reduce((s, i) => s + i.price * i.quantity, 0);

    // `phone` holds raw digits; the + is UI furniture.
    const phoneReady = phone.length >= E164_MIN;
    const phoneE164 = toE164(phone);

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
                const r = await lookupPatient(phoneE164);
                if (!cancelled) setPatient(r?.found ? r : null);
            } catch {
                if (!cancelled) setPatient(null);
            } finally {
                if (!cancelled) setChecking(false);
            }
        }, 450);
        return () => { cancelled = true; clearTimeout(t); setChecking(false); };
    }, [phone, phoneReady, phoneE164]);

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
                patientPhone: patient?.phone || phoneE164,
                clinicId: clinic.id,
                items: basketArr.map(({ serviceType, serviceId, name, price, quantity }) => ({ serviceType, serviceId, name, price, quantity })),
            });
            setDone(res);
        } catch (e) {
            setErr(e?.response?.data?.message || 'Yuborishda xatolik.');
        } finally { setSending(false); }
    };

    // One service line. Declared here (not at module scope) so it closes over the
    // basket handlers — the accordion renders it from three different places.
    const SvcRow = ({ s }) => {
        const key = keyOf(s);
        const inB = basket[key];
        return (
            <div className="dp-svc">
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

                    <div className="dp-inputbox">
                        <span className="dp-inputbox-ic"><Phone size={17} /></span>
                        <span className="dp-inputbox-prefix">+</span>
                        <input
                            className="dp-inputbox-input"
                            value={formatPhone(phone)}
                            onChange={e => setPhone(phoneDigitsOf(e.target.value))}
                            placeholder="90 123 45 67"
                            inputMode="tel"
                            autoComplete="tel"
                            autoFocus
                        />
                        {checking && <Loader2 size={16} className="dp-spin dp-inputbox-spin" />}
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

                    {/* Always show what will be stored — with an optional country
                        code the typed digits and the saved number can differ. */}
                    {phoneReady && (
                        <p className="dp-resolved">
                            Saqlanadi: <b>{phoneE164}</b>
                            {isUzNational(phone) && <span> (O'zbekiston)</span>}
                        </p>
                    )}

                    {!phoneReady && phone !== '' && (
                        <div className="dp-note dp-note--info">
                            <span className="dp-note-ic"><Info size={16} /></span>
                            <div><span>Raqam juda qisqa — kamida {E164_MIN} ta raqam kiriting.</span></div>
                        </div>
                    )}

                    {phone === '' && (
                        <p className="dp-resolved dp-resolved--hint">
                            O'zbekiston raqami uchun 9 xonani kiriting (90 123 45 67).
                            Chet el raqami bo'lsa, davlat kodi bilan yozing.
                        </p>
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
                    <h3 className="dp-step-t">Xizmatlarni qo'shing</h3>

                    <div className="dp-inputbox dp-inputbox--sm">
                        <span className="dp-inputbox-ic"><Search size={16} /></span>
                        <input className="dp-inputbox-input" value={svcQ} onChange={e => setSvcQ(e.target.value)} placeholder="Xizmat nomi bo'yicha qidirish..." />
                    </div>

                    {/* Search overrides the tree — flat results across the clinic. */}
                    {searching && (
                        <div className="dp-svc-list">
                            {searchResults.map(s => <SvcRow key={keyOf(s)} s={s} />)}
                            {!searchResults.length && <p className="dp-hint">Xizmat topilmadi</p>}
                        </div>
                    )}

                    {/* Accordion: section → sub-category → services, all in place. */}
                    {!searching && (
                        <div className="dp-acc">
                            {SECTIONS.map(({ key, label, icon: Icon }) => {
                                const groups = bySection[key] || [];
                                const total = groups.reduce((n, g) => n + g.count, 0);
                                const open = openSection === key;
                                return (
                                    <div key={key} className={`dp-acc-sec${open ? ' open' : ''}`}>
                                        <button
                                            className="dp-acc-head"
                                            disabled={total === 0}
                                            aria-expanded={open}
                                            onClick={() => { setOpenSection(open ? null : key); setOpenSpec(null); }}
                                        >
                                            <span className="dp-section-ic"><Icon size={19} /></span>
                                            <span className="dp-section-body">
                                                <b>{label}</b>
                                                <span>{total > 0 ? `${total} ta xizmat` : 'Bu klinikada yo\'q'}</span>
                                            </span>
                                            {total > 0 && <ChevronDown size={18} className="dp-acc-chev" />}
                                        </button>

                                        {open && (
                                            <div className="dp-acc-body">
                                                {groups.map(g => {
                                                    const gOpen = openSpec === `${key}:${g.name}`;
                                                    return (
                                                        <div key={g.name} className={`dp-acc-sub${gOpen ? ' open' : ''}`}>
                                                            <button
                                                                className="dp-acc-subhead"
                                                                aria-expanded={gOpen}
                                                                onClick={() => setOpenSpec(gOpen ? null : `${key}:${g.name}`)}
                                                            >
                                                                <span className="dp-section-body">
                                                                    <b>{g.name}</b>
                                                                    <span>{g.count} ta xizmat</span>
                                                                </span>
                                                                <ChevronDown size={16} className="dp-acc-chev" />
                                                            </button>
                                                            {gOpen && (
                                                                <div className="dp-svc-list dp-svc-list--nested">
                                                                    {g.services.map(s => <SvcRow key={keyOf(s)} s={s} />)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {!groups.length && <p className="dp-hint">Bu bo'limda xizmat yo'q</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

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
