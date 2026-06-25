import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Banknote, Clock, Phone, User, RefreshCw, CheckCircle2, Loader2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../shared/api/axios';
import { fmtSum, shortBookingNo } from '../../shared/utils/format';
import CashConfirmModal from '../components/CashConfirmModal';
import { useMyClinicMembership } from '../hooks/useMyClinicMembership';
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
    const [expanded, setExpanded] = useState(() => new Set());
    const toggleExpand = (id) => setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const { can } = useMyClinicMembership();
    const canConfirmCash = can('PAYMENT_CONFIRM_CASH');

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
                    <p>Check-in qilingan + to'lov kutayotgan barcha bemorlar (naqd va onlayn). Avtomatik yangilanadi (5s).</p>
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
                        // Cart-style services come on `a.services`. Prefer them when
                        // present so multi-line bookings (e.g. checkup paketi + qo'shimcha
                        // xizmat) all surface, not just the first relation.
                        const cartSvcs = Array.isArray(a.services) ? a.services : [];
                        const checkupSvcs = cartSvcs.filter(s => s.serviceType === 'CHECKUP');
                        const svc = cartSvcs.length > 0
                            ? cartSvcs.map(s => s.serviceName).join(' + ')
                            : (a.diagnosticService?.nameUz
                                || a.surgicalService?.nameUz
                                || 'Xizmat');
                        const hasCheckupItems = checkupSvcs.some(s => (s.checkupItems?.length || 0) > 0);
                        const isOpen = expanded.has(a.id);
                        const finalP = a.finalPrice || a.price || 0;
                        const isOnline = a.paymentMethod === 'PAYME' || a.paymentMethod === 'CLICK';
                        const payLabel = isOnline
                            ? (a.paymentMethod === 'CLICK' ? '💳 Click — to\'lanmagan' : '💳 Payme — to\'lanmagan')
                            : '💵 Naqd';
                        return (
                            <div key={a.id} data-appt={a.id} className={`cq-row ${cls}`}>
                                <div className="cq-row-main">
                                    <div className="cq-row-name">
                                        <User size={16} /> {fullName}
                                        <span className="cq-bookno">{shortBookingNo(a.bookingNumber)}</span>
                                        <span style={{
                                            marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 999,
                                            background: isOnline ? '#fef3c7' : '#dbeafe',
                                            color: isOnline ? '#92400e' : '#1e40af',
                                            fontWeight: 600,
                                        }}>
                                            {payLabel}
                                        </span>
                                    </div>
                                    <div className="cq-row-svc">
                                        {svc}
                                        {hasCheckupItems && (
                                            <button
                                                type="button"
                                                className="cq-expand"
                                                onClick={() => toggleExpand(a.id)}
                                                title="Checkup tarkibini ko'rsatish"
                                            >
                                                <Package size={12} />
                                                {isOpen ? 'Yashirish' : `Tarkibi (${checkupSvcs.reduce((n, s) => n + (s.checkupItems?.length || 0), 0)} ta)`}
                                                {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                            </button>
                                        )}
                                    </div>
                                    {isOpen && hasCheckupItems && (
                                        <div className="cq-checkup-items">
                                            {checkupSvcs.map(s => (
                                                <div key={s.id} className="cq-checkup-block">
                                                    <div className="cq-checkup-title">
                                                        <Package size={11} /> {s.serviceName}
                                                    </div>
                                                    <ul className="cq-checkup-list">
                                                        {(s.checkupItems || []).map(it => (
                                                            <li key={it.id}>
                                                                <span className="cq-ck-name">
                                                                    {it.serviceName}
                                                                    {it.quantity > 1 && <span className="cq-ck-qty"> × {it.quantity}</span>}
                                                                </span>
                                                                {it.notes && <span className="cq-ck-note">{it.notes}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                    {isOnline && (
                                        <div style={{ marginTop: 6, fontSize: 12, color: '#92400e' }}>
                                            Bemor onlayn to'lashi kerak. Kerak bo'lsa qo'ng'iroq qiling yoki kassada naqd qabul qiling.
                                        </div>
                                    )}
                                </div>
                                <div className="cq-row-right">
                                    <div className="cq-amount">{fmtSum(finalP)} <span>so'm</span></div>
                                    {canConfirmCash && (
                                        <button className="cq-confirm-btn" onClick={() => setConfirmTarget(a)}>
                                            <CheckCircle2 size={14} />
                                            {isOnline ? 'Naqd qabul + yakunlash' : 'To\'lov qabul + yakunlash'}
                                        </button>
                                    )}
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
