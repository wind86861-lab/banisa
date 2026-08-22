import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, Upload, Loader2, FileText, X, Plus, LogOut, ListChecks } from 'lucide-react';
import { useUserAuth } from '../shared/auth/UserAuthContext';
import { imgUrl } from '../shared/utils/format';
import { useMyDoctor, updateMyDoctor, uploadDoctorImage } from './useDoctor';
import BanisaLoader from '../shared/components/BanisaLoader';
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

export default function DoctorHome() {
    const navigate = useNavigate();
    const { data: doc, isLoading } = useMyDoctor();
    const { logout } = useUserAuth();
    const qc = useQueryClient();
    const [docs, setDocs] = useState(null);

    if (isLoading || !doc) return <BanisaLoader message="Yuklanmoqda..." />;

    const documents = docs ?? doc.documents ?? [];
    const setDocuments = (next) => { setDocs(next); qc.setQueryData(['doctor-me'], (o) => o ? { ...o, documents: next } : o); };
    const name = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Shifokor';

    return (
        <div className="dp">
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
                </div>
            ) : doc.status === 'REJECTED' ? (
                <div className="dp-state dp-state--rej">
                    <div className="dp-state-ic"><XCircle size={40} /></div>
                    <h2>Ariza rad etildi</h2>
                    {doc.rejectionReason && <p className="dp-reason">“{doc.rejectionReason}”</p>}
                    <p>Ma'lumotlaringizni tekshirib, qo'shimcha hujjat yuklang.</p>
                    <div className="dp-card">
                        <div className="dp-card-title"><FileText size={16} /> Hujjatlar</div>
                        <DocUploader documents={documents} onChange={setDocuments} />
                    </div>
                </div>
            ) : (
                <div className="dp-state dp-state--pending">
                    <div className="dp-state-ic"><Clock size={40} /></div>
                    <h2>Arizangiz ko'rib chiqilmoqda</h2>
                    <p>Hujjatlaringizni yuklang — admin tekshirib tasdiqlaydi.</p>
                    <div className="dp-card">
                        <div className="dp-card-title"><Upload size={16} /> Hujjatlar (diplom, sertifikat)</div>
                        <DocUploader documents={documents} onChange={setDocuments} />
                        <p className="dp-hint" style={{ marginTop: 10 }}>
                            {documents.length ? `${documents.length} ta hujjat yuklandi` : 'Kamida bitta hujjat yuklang'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
