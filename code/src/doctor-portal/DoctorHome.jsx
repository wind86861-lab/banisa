import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, Upload, Loader2, FileText, X, Plus, LogOut, ListChecks, Building2, PartyPopper, ShieldCheck, Bell } from 'lucide-react';
import { useUserAuth } from '../shared/auth/UserAuthContext';
import { imgUrl } from '../shared/utils/format';
import { useMyDoctor, useDoctorStats, updateMyDoctor, uploadDoctorImage } from './useDoctor';
import BanisaLoader from '../shared/components/BanisaLoader';
import DoctorNav from './DoctorNav';
import './doctor-portal.css';

function DocUploader({ documents, onChange }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);

    const pick = () => inputRef.current?.click();

    const onFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setBusy(true);
        try {
            const uploaded = [];
            for (const f of files) {
                const url = await uploadDoctorImage(f);
                uploaded.push({ url, name: f.name, type: f.type });
            }
            const next = [...documents, ...uploaded];
            await updateMyDoctor({ documents: next });
            onChange(next);
        } catch {
            // best-effort; leave existing docs
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const remove = async (i) => {
        const next = documents.filter((_, idx) => idx !== i);
        await updateMyDoctor({ documents: next });
        onChange(next);
    };

    return (
        <div className="dp-docs">
            <div className="dp-docs-grid">
                {documents.map((d, i) => {
                    const url = imgUrl(d.url) || d.url;
                    const isImg = /\.(png|jpe?g|webp|gif)$/i.test(d.url || '');
                    return (
                        <div key={i} className="dp-doc">
                            {isImg ? <img src={url} alt="" loading="lazy" /> : <div className="dp-doc-file"><FileText size={20} /></div>}
                            <button className="dp-doc-x" onClick={() => remove(i)} aria-label="O'chirish"><X size={13} /></button>
                        </div>
                    );
                })}
                <button className="dp-doc-add" onClick={pick} disabled={busy}>
                    {busy ? <Loader2 size={20} className="dp-spin" /> : <><Plus size={20} /><span>Hujjat</span></>}
                </button>
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
        </div>
    );
}

// Money is the headline here, and som figures run long — compact anything from a
// million up so the hero figure never wraps on a 390px Mini App viewport.
const som = (n) => {
    const v = Number(n) || 0;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(/\.0$/, '')} mlrd`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '')} mln`;
    return v.toLocaleString('uz-UZ');
};
const plain = (n) => (Number(n) || 0).toLocaleString('uz-UZ');

/**
 * Referral statistics.
 *
 * Deliberately not a chart: these are headline numbers plus a short ranked list,
 * which is what a stat tile and a meter are for — a bar chart of four totals
 * would carry less and cost more space.
 *
 * Two money figures are kept apart on purpose. The hero is everything the doctor
 * referred; the tiles below say how much of it actually reached a finished
 * visit. Reporting only the first would flatter the numbers.
 */
function DoctorStats() {
    const { data, isLoading } = useDoctorStats();
    if (isLoading) return <div className="dp-card dp-stats-skel"><Loader2 size={18} className="dp-spin" /></div>;
    const t = data?.totals;
    if (!t || !t.all) {
        return (
            <div className="dp-card dp-stats-empty">
                <p>Hali tavsiya yubormagansiz. Birinchi tavsiyangizdan keyin statistika shu yerda ko'rinadi.</p>
            </div>
        );
    }
    const clinics = data.clinics || [];

    return (
        <div className="dp-stats">
            {/* Hero — exactly one per view. */}
            <div className="dp-hero">
                <span className="dp-hero-label">Umumiy tavsiya qilingan</span>
                <b className="dp-hero-value">{som(t.sum)} <small>so'm</small></b>
                <span className="dp-hero-sub">{plain(t.all)} ta tavsiya</span>
            </div>

            {/* The lifecycle, one tile per stage — these are four distinct things
                the doctor acts on differently, so none of them is folded into
                another. "Qabul qilingan" in particular is its own stage: the
                patient said yes but has not booked yet, which is where a nudge
                actually helps. Two columns so every label fits unabbreviated at
                390px. */}
            <div className="dp-tiles">
                <div className="dp-tile">
                    <span className="dp-tile-label">Javob kutilmoqda</span>
                    <b className="dp-tile-value">{plain(t.pending)}</b>
                </div>
                <div className="dp-tile">
                    <span className="dp-tile-label">Qabul qilingan</span>
                    <b className="dp-tile-value">{plain(t.accepted)}</b>
                    <span className="dp-tile-sub">hali bron qilinmagan</span>
                </div>
                <div className="dp-tile">
                    <span className="dp-tile-label">Bron qilingan</span>
                    <b className="dp-tile-value">{plain(t.booked)}</b>
                    <span className="dp-tile-sub">tashrif kutilmoqda</span>
                </div>
                <div className="dp-tile dp-tile--done">
                    <span className="dp-tile-label">Yakunlangan</span>
                    <b className="dp-tile-value">{plain(t.completed)}</b>
                    <span className="dp-tile-sub">{som(t.sumCompleted)} so'm</span>
                </div>
            </div>

            {/* Terminal states. Real, but not the story — kept off the tile grid
                so they never outweigh the four live stages. */}
            {(t.rejected > 0 || t.expired > 0) && (
                <p className="dp-stats-tail">
                    Rad etilgan: <b>{plain(t.rejected)}</b> · Muddati o'tgan: <b>{plain(t.expired)}</b>
                </p>
            )}

            {/* Per-clinic split. Each row is a meter: filled share = finished
                visits, track = a lighter step of the same hue. Counts and sums
                are direct-labelled, so nothing is carried by colour alone. */}
            {clinics.length > 0 && (
                <div className="dp-card">
                    <div className="dp-card-title"><Building2 size={16} /> Klinikalar bo'yicha</div>
                    <div className="dp-clinics">
                        {clinics.map(c => {
                            const pct = c.count ? Math.round((c.completed / c.count) * 100) : 0;
                            return (
                                <div key={c.clinicId} className="dp-clinic-row">
                                    <div className="dp-clinic-top">
                                        <b>{c.clinicName}</b>
                                        <span>{som(c.sum)} so'm</span>
                                    </div>
                                    <div className="dp-meter" role="img"
                                         aria-label={`${c.completed} / ${c.count} yakunlangan`}>
                                        <span className="dp-meter-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="dp-clinic-bot">
                                        <span>{plain(c.count)} tavsiya · {plain(c.completed)} yakunlangan</span>
                                        <span>{som(c.sumCompleted)} so'm yakunlandi</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DoctorHome() {
    const navigate = useNavigate();
    const location = useLocation();
    const justRegistered = !!location.state?.justRegistered;
    const { data: doc, isLoading } = useMyDoctor();
    const { logout } = useUserAuth();
    const qc = useQueryClient();
    const [docs, setDocs] = useState(null);

    if (isLoading || !doc) return <BanisaLoader message="Yuklanmoqda..." />;

    const documents = docs ?? doc.documents ?? [];
    const setDocuments = (next) => { setDocs(next); qc.setQueryData(['doctor-me'], (o) => o ? { ...o, documents: next } : o); };
    const name = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Shifokor';

    return (
        <div className={`dp${doc.status === 'APPROVED' ? ' dp--with-nav' : ''}`}>
            <header className="dp-top">
                <div className="dp-top-id"><div className="dp-badge dp-badge--sm"><span>{name.charAt(0).toUpperCase()}</span></div><b>{name}</b></div>
                <button className="dp-logout" onClick={() => logout?.()} aria-label="Chiqish"><LogOut size={17} /></button>
            </header>

            {doc.status === 'APPROVED' ? (
                <div className="dp-state dp-state--ok">
                    <div className="dp-state-ic"><CheckCircle2 size={40} /></div>
                    <h2>Tasdiqlandingiz 🎉</h2>
                    <p>Endi bemorlaringizga xizmat tavsiya qila olasiz.</p>
                    <button className="dp-btn dp-btn--primary dp-btn--lg" onClick={() => navigate('/doctor/recommend')}>
                        <Plus size={18} /> Bemor uchun tavsiya
                    </button>
                    <button className="dp-btn dp-btn--ghost dp-btn--lg" onClick={() => navigate('/doctor/recommendations')} style={{ marginTop: 8 }}>
                        <ListChecks size={18} /> Tavsiyalarim
                    </button>
                    <DoctorStats />
                </div>
            ) : doc.status === 'REJECTED' ? (
                <div className="dp-state dp-state--rej">
                    <div className="dp-state-ic"><XCircle size={40} /></div>
                    <h2>Ariza rad etildi</h2>
                    {doc.rejectionReason && <p className="dp-reason">“{doc.rejectionReason}”</p>}
                    <p>
                        Kamchilikni tuzatib, <b>yangi hujjat yuklang</b> — arizangiz
                        avtomatik ravishda qayta ko'rib chiqishga yuboriladi va admin xabardor qilinadi.
                    </p>
                    <div className="dp-card">
                        <div className="dp-card-title"><FileText size={16} /> Hujjatlar</div>
                        {/* A new file flips the account to IN_REVIEW server-side, so
                            refetch the profile — the screen then moves to the
                            re-review state instead of still saying "rad etildi". */}
                        <DocUploader
                            documents={documents}
                            onChange={(next) => { setDocuments(next); qc.invalidateQueries({ queryKey: ['doctor-me'] }); }}
                        />
                    </div>
                </div>
            ) : (
                /* Pending. This is where a doctor lands the moment they register and
                   where they stay until an admin decides — so it has to read as
                   "done, now waiting", not as a form still asking for uploads (the
                   old copy said "Hujjatlaringizni yuklang", which made a finished
                   registration look incomplete). */
                <div className="dp-state dp-state--pending dp-congrats">
                    <div className="dp-state-ic dp-congrats-ic"><PartyPopper size={38} /></div>
                    <h2>
                        {doc.status === 'IN_REVIEW'
                            ? 'Qayta ko\'rib chiqilmoqda'
                            : justRegistered ? 'Tabriklaymiz!' : 'Ro\'yxatdan o\'tgansiz'}
                    </h2>
                    <p className="dp-congrats-lead">
                        {doc.status === 'IN_REVIEW'
                            ? 'Yangi hujjatlaringiz yuborildi.'
                            : 'Siz shifokor sifatida ro\'yxatdan o\'tdingiz.'}
                        <br /><b>Admin tasdig'i kutilmoqda.</b>
                    </p>

                    {/* Where the application is in its lifecycle. */}
                    <ol className="dp-progress">
                        <li className="done"><span><CheckCircle2 size={16} /></span>
                            {doc.status === 'IN_REVIEW' ? 'Yangi hujjatlar yuborildi' : 'Ariza yuborildi'}</li>
                        <li className="now"><span><Clock size={16} /></span>
                            {doc.status === 'IN_REVIEW' ? 'Admin qayta tekshiruvi' : 'Admin tekshiruvi'}</li>
                        <li><span><ShieldCheck size={16} /></span>Tasdiqlash — tavsiya yuborish ochiladi</li>
                    </ol>

                    <div className="dp-card dp-congrats-card">
                        <div className="dp-card-title"><FileText size={16} /> Yuborilgan ma'lumotlar</div>
                        <dl className="dp-kv">
                            <div><dt>Ism</dt><dd>{name}</dd></div>
                            {doc.specialty && <div><dt>Mutaxassislik</dt><dd>{doc.specialty}</dd></div>}
                            {doc.workplace && <div><dt>Ish joyi</dt><dd>{doc.workplace}</dd></div>}
                            <div><dt>Hujjatlar</dt><dd>{documents.length} ta yuklangan</dd></div>
                        </dl>
                    </div>

                    <p className="dp-congrats-note">
                        <Bell size={15} /> Tasdiqlanganingizda botda xabar keladi.
                    </p>

                    {/* Still possible to add a certificate while waiting — but as
                        an optional extra below the fold, not the headline. */}
                    <details className="dp-card dp-congrats-more">
                        <summary><Upload size={15} /> Qo'shimcha hujjat yuklash</summary>
                        <DocUploader documents={documents} onChange={setDocuments} />
                    </details>
                </div>
            )}
            {doc.status === 'APPROVED' && <DoctorNav />}
        </div>
    );
}
