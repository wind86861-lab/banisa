import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stethoscope, Phone, Calendar, FileText, X, Check, Ban, Loader2, ExternalLink, ChevronRight,
} from 'lucide-react';
import api from '../../shared/api/axios';
import { imgUrl } from '../../shared/utils/format';
import './AdminDoctors.css';

const STATUS = {
    PENDING:  { label: 'Kutilmoqda',   cls: 'adr-st--pending' },
    APPROVED: { label: 'Tasdiqlangan', cls: 'adr-st--approved' },
    REJECTED: { label: 'Rad etilgan',  cls: 'adr-st--rejected' },
};
const TABS = [
    { key: '',         label: 'Hammasi' },
    { key: 'PENDING',  label: 'Kutilmoqda' },
    { key: 'APPROVED', label: 'Tasdiqlangan' },
    { key: 'REJECTED', label: 'Rad etilgan' },
];

const fmtDate = (d) => new Date(d).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
const fullName = (x) => [x.firstName, x.lastName].filter(Boolean).join(' ') || 'Ismsiz';

function StatusChip({ status }) {
    const s = STATUS[status] || { label: status, cls: '' };
    return <span className={`adr-st ${s.cls}`}>{s.label}</span>;
}

function DoctorDrawer({ id, onClose }) {
    const qc = useQueryClient();
    const [reason, setReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    const { data: d, isLoading } = useQuery({
        queryKey: ['admin-doctor', id],
        queryFn: async () => (await api.get(`/admin/doctors/${id}`)).data.data,
        enabled: !!id,
    });

    const approve = useMutation({
        mutationFn: async () => (await api.post(`/admin/doctors/${id}/approve`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-doctors'] }); qc.invalidateQueries({ queryKey: ['admin-doctor', id] }); onClose(); },
    });
    const reject = useMutation({
        mutationFn: async () => (await api.post(`/admin/doctors/${id}/reject`, { reason })).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-doctors'] }); qc.invalidateQueries({ queryKey: ['admin-doctor', id] }); onClose(); },
    });

    return (
        <div className="adr-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <aside className="adr-drawer">
                <header className="adr-drawer-head">
                    <h3>Shifokor arizasi</h3>
                    <button className="adr-icon-btn" onClick={onClose} aria-label="Yopish"><X size={18} /></button>
                </header>

                {isLoading || !d ? (
                    <div className="adr-drawer-loading"><Loader2 size={26} className="adr-spin" /></div>
                ) : (
                    <div className="adr-drawer-body">
                        <div className="adr-id">
                            <div className="adr-avatar">{fullName(d).charAt(0).toUpperCase()}</div>
                            <div>
                                <div className="adr-id-name">{fullName(d)}</div>
                                <div className="adr-id-meta"><Phone size={13} /> {d.phone}</div>
                            </div>
                            <StatusChip status={d.status} />
                        </div>

                        <dl className="adr-facts">
                            <div><dt>Mutaxassislik</dt><dd>{d.specialty || '—'}</dd></div>
                            <div><dt>Ariza sanasi</dt><dd>{fmtDate(d.createdAt)}</dd></div>
                            {d.bio && <div className="adr-facts-wide"><dt>Bio</dt><dd>{d.bio}</dd></div>}
                            {d.status === 'REJECTED' && d.rejectionReason && (
                                <div className="adr-facts-wide"><dt>Rad sababi</dt><dd>{d.rejectionReason}</dd></div>
                            )}
                        </dl>

                        <div className="adr-docs">
                            <div className="adr-docs-title"><FileText size={15} /> Hujjatlar ({d.documents?.length || 0})</div>
                            {d.documents?.length ? (
                                <div className="adr-docs-grid">
                                    {d.documents.map((doc, i) => {
                                        const url = imgUrl(doc.url) || doc.url;
                                        const isImg = /\.(png|jpe?g|webp|gif)$/i.test(doc.url || '');
                                        return (
                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="adr-doc">
                                                {isImg
                                                    ? <img src={url} alt={doc.name || 'hujjat'} loading="lazy" />
                                                    : <div className="adr-doc-file"><FileText size={22} /></div>}
                                                <span className="adr-doc-name">{doc.name || `Hujjat ${i + 1}`} <ExternalLink size={11} /></span>
                                            </a>
                                        );
                                    })}
                                </div>
                            ) : <p className="adr-empty-sm">Hujjat yuklanmagan</p>}
                        </div>

                        {d.status === 'PENDING' && (
                            <div className="adr-actions">
                                {!rejecting ? (
                                    <>
                                        <button className="adr-btn adr-btn--approve" disabled={approve.isPending} onClick={() => approve.mutate()}>
                                            {approve.isPending ? <Loader2 size={16} className="adr-spin" /> : <Check size={16} />} Tasdiqlash
                                        </button>
                                        <button className="adr-btn adr-btn--reject-ghost" onClick={() => setRejecting(true)}>
                                            <Ban size={16} /> Rad etish
                                        </button>
                                    </>
                                ) : (
                                    <div className="adr-reject-box">
                                        <textarea
                                            className="adr-reject-input"
                                            placeholder="Rad etish sababi (ixtiyoriy)"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            rows={3}
                                        />
                                        <div className="adr-reject-row">
                                            <button className="adr-btn adr-btn--ghost" onClick={() => setRejecting(false)}>Bekor</button>
                                            <button className="adr-btn adr-btn--reject" disabled={reject.isPending} onClick={() => reject.mutate()}>
                                                {reject.isPending ? <Loader2 size={16} className="adr-spin" /> : <Ban size={16} />} Rad etish
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </aside>
        </div>
    );
}

export default function AdminDoctors() {
    const [tab, setTab] = useState('');
    const [openId, setOpenId] = useState(null);

    const { data: doctors = [], isLoading } = useQuery({
        queryKey: ['admin-doctors', tab],
        queryFn: async () => (await api.get('/admin/doctors', { params: tab ? { status: tab } : {} })).data.data,
    });

    return (
        <div className="adr">
            <header className="adr-head">
                <div className="adr-head-icon"><Stethoscope size={22} /></div>
                <div>
                    <h1>Shifokorlar</h1>
                    <p>Tavsiya berish uchun ro'yxatdan o'tgan shifokorlar. Hujjatni tekshirib tasdiqlang yoki rad qiling.</p>
                </div>
            </header>

            <div className="adr-tabs">
                {TABS.map(t => (
                    <button key={t.key} className={`adr-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="adr-loading"><Loader2 size={28} className="adr-spin" /></div>
            ) : doctors.length === 0 ? (
                <div className="adr-empty"><Stethoscope size={40} /><p>Bu bo'limda shifokor yo'q</p></div>
            ) : (
                <div className="adr-list">
                    {doctors.map(doc => (
                        <button key={doc.id} className="adr-card" onClick={() => setOpenId(doc.id)}>
                            <div className="adr-card-avatar">{fullName(doc).charAt(0).toUpperCase()}</div>
                            <div className="adr-card-main">
                                <div className="adr-card-name">{fullName(doc)}</div>
                                <div className="adr-card-meta">
                                    <span><Phone size={12} /> {doc.phone}</span>
                                    {doc.specialty && <span><Stethoscope size={12} /> {doc.specialty}</span>}
                                    <span><FileText size={12} /> {doc.documentsCount} hujjat</span>
                                    <span><Calendar size={12} /> {fmtDate(doc.createdAt)}</span>
                                </div>
                            </div>
                            <StatusChip status={doc.status} />
                            <ChevronRight size={18} className="adr-card-arrow" />
                        </button>
                    ))}
                </div>
            )}

            {openId && <DoctorDrawer id={openId} onClose={() => setOpenId(null)} />}
        </div>
    );
}
