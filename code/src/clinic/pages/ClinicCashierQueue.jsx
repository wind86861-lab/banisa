import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Banknote, Clock, Phone, User, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../../shared/api/axios';
import { fmtSum, shortBookingNo } from '../../shared/utils/format';
import CashConfirmModal from '../components/CashConfirmModal';
import './ClinicCashierQueue.css';

function waitedMinutes(checkedInAt) {
    if (!checkedInAt) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(checkedInAt).getTime()) / 60000));
}

function urgencyClass(min) {
    if (min >= 15) return 'cq-row--urgent';
    if (min >= 5) return 'cq-row--warn';
    return '';
}

export default function ClinicCashierQueue() {
    const qc = useQueryClient();
    const [searchParams] = useSearchParams();
    const focusId = searchParams.get('focus');
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [tick, setTick] = useState(0);

    const { data, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: ['clinic', 'cashier-queue'],
        queryFn: async () => {
            const res = await api.get('/clinic/appointments/cashier-queue');
            return res.data;
        },
        refetchInterval: 5000,
        // Stop hammering the API when the tab is hidden — clinic admins often
        // leave this open in the background; 5s × all tabs adds up fast.
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    });

    const items = data?.data || [];

    // Re-render every 30s to keep wait-time chips fresh.
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    // Highlight focused row when navigated from a notification.
    useEffect(() => {
        if (!focusId) return;
        const el = document.querySelector(`[data-appt="${focusId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('cq-row--flash');
            setTimeout(() => el.classList.remove('cq-row--flash'), 2400);
        }
    }, [focusId, items.length]);

    const sorted = useMemo(() => {
        return [...items].sort((a, b) => new Date(a.checkedInAt || a.scheduledAt) - new Date(b.checkedInAt || b.scheduledAt));
    }, [items, tick]);

    return (
        <div className="cq-page">
            <header className="cq-header">
                <div>
                    <h1><Banknote size={22} /> Kassa navbati</h1>
                    <p>Naqd to'lov kutayotgan bemorlar. Avtomatik yangilanadi (5s).</p>
                </div>
                <button className="cq-refresh" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw size={16} className={isFetching ? 'cq-spin' : ''} />
                    Yangilash
                </button>
            </header>

            {isLoading ? (
                <div className="cq-empty">
                    <Loader2 size={28} className="cq-spin" />
                    <p>Yuklanmoqda...</p>
                </div>
            ) : isError ? (
                <div className="cq-empty">
                    <h3>Navbatni yuklab bo'lmadi</h3>
                    <p>Internet aloqasini tekshirib, qayta urinib ko'ring.</p>
                    <button className="cq-refresh" onClick={() => refetch()}>Qayta urinish</button>
                </div>
            ) : sorted.length === 0 ? (
                <div className="cq-empty">
                    <CheckCircle2 size={36} style={{ color: '#10b981' }} />
                    <h3>Navbat bo'sh</h3>
                    <p>Hozircha naqt to'lov kutayotgan bemor yo'q.</p>
                </div>
            ) : (
                <div className="cq-list">
                    {sorted.map(a => {
                        const min = waitedMinutes(a.checkedInAt);
                        const cls = urgencyClass(min);
                        const fullName = [a.patient?.firstName, a.patient?.lastName].filter(Boolean).join(' ') || a.patient?.phone || 'Bemor';
                        const svc = a.diagnosticService?.nameUz
                            || a.surgicalService?.nameUz
                            || a.checkupPackage?.nameUz
                            || a.sanatoriumService?.nameUz
                            || 'Xizmat';
                        const finalP = a.finalPrice || a.price || 0;
                        return (
                            <div key={a.id} data-appt={a.id} className={`cq-row ${cls}`}>
                                <div className="cq-row-main">
                                    <div className="cq-row-name">
                                        <User size={16} /> {fullName}
                                        <span className="cq-bookno">{shortBookingNo(a.bookingNumber)}</span>
                                    </div>
                                    <div className="cq-row-svc">{svc}</div>
                                    <div className="cq-row-meta">
                                        {a.patient?.phone && (
                                            <a href={`tel:${a.patient.phone}`} className="cq-phone">
                                                <Phone size={13} /> {a.patient.phone}
                                            </a>
                                        )}
                                        <span className={`cq-wait cq-wait--${cls ? 'high' : 'low'}`}>
                                            <Clock size={13} /> {min} daq kutmoqda
                                        </span>
                                    </div>
                                </div>
                                <div className="cq-row-right">
                                    <div className="cq-amount">{fmtSum(finalP)} <span>so'm</span></div>
                                    <button className="cq-confirm-btn" onClick={() => setConfirmTarget(a)}>
                                        Tasdiqlash
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {confirmTarget && (
                <CashConfirmModal
                    booking={confirmTarget}
                    onClose={() => setConfirmTarget(null)}
                    onSuccess={() => {
                        setConfirmTarget(null);
                        qc.invalidateQueries({ queryKey: ['clinic', 'cashier-queue'] });
                    }}
                />
            )}
        </div>
    );
}
