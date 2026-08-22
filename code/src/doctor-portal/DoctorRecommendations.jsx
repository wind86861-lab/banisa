import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Building2, User, Loader2, Inbox } from 'lucide-react';
import { useMyRecommendations } from './useDoctor';
import './doctor-portal.css';

const fmt = (n) => (Number(n) || 0).toLocaleString('uz-UZ');
const fmtDate = (d) => new Date(d).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
const ST = {
    PENDING:  { label: 'Kutilmoqda', cls: 'dp-chip--pending' },
    ACCEPTED: { label: 'Qabul qilindi', cls: 'dp-chip--acc' },
    REJECTED: { label: 'Rad etildi', cls: 'dp-chip--rej' },
    EXPIRED:  { label: 'Muddati o\'tdi', cls: 'dp-chip--exp' },
    BOOKED:   { label: 'Bron qilindi', cls: 'dp-chip--book' },
};
const TABS = [['', 'Hammasi'], ['PENDING', 'Kutilmoqda'], ['BOOKED', 'Bron'], ['REJECTED', 'Rad']];

export default function DoctorRecommendations() {
    const navigate = useNavigate();
    const { data: list = [], isLoading } = useMyRecommendations();
    const [tab, setTab] = useState('');

    const shown = useMemo(() => tab ? list.filter(r => r.status === tab) : list, [list, tab]);

    return (
        <div className="dp">
            <header className="dp-top">
                <button className="dp-back" onClick={() => navigate('/doctor')}><ChevronLeft size={20} /></button>
                <b>Tavsiyalarim</b>
                <span style={{ width: 38 }} />
            </header>

            <div className="dp-rtabs">
                {TABS.map(([k, l]) => (
                    <button key={k} className={`dp-rtab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
                ))}
            </div>

            {isLoading ? (
                <div className="dp-mini-load"><Loader2 size={24} className="dp-spin" /></div>
            ) : shown.length === 0 ? (
                <div className="dp-state" style={{ paddingTop: 50 }}><Inbox size={40} color="#8093a8" /><p>Tavsiya yo'q</p></div>
            ) : (
                <div className="dp-rlist">
                    {shown.map(r => {
                        const st = ST[r.status] || { label: r.status, cls: '' };
                        return (
                            <div key={r.id} className="dp-rcard">
                                <div className="dp-rcard-top">
                                    <span className="dp-rcard-name"><User size={13} /> {r.patientName}</span>
                                    <span className={`dp-chip ${st.cls}`}>{st.label}</span>
                                </div>
                                <div className="dp-rcard-clinic"><Building2 size={13} /> {r.clinicName || '—'}</div>
                                <div className="dp-rcard-foot">
                                    <span>{r.itemCount} ta xizmat · <b>{fmt(r.total)} so'm</b></span>
                                    <span className="dp-rcard-date">{fmtDate(r.createdAt)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
