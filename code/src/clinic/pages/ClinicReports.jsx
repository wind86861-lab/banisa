import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, TrendingUp, TrendingDown, Minus, Download,
    DollarSign, Receipt, AlertCircle, Calculator,
    Activity, PieChart as PieIcon, ListOrdered, ChevronLeft, ChevronRight, Stethoscope,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../shared/api/axios';
import './clinic-reports.css';

const fmtMoney = (n) => {
    if (!n) return '0';
    return Number(n).toLocaleString('uz-UZ');
};
const fmtCompact = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
};
const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('uz-UZ', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
};
const fmtDayLabel = (key) => {
    if (!key) return '';
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
};

const RANGES = [
    { key: 'today', label: 'Bugun' },
    { key: '7d', label: '7 kun' },
    { key: '30d', label: '30 kun' },
    { key: '90d', label: '90 kun' },
    { key: 'all', label: 'Hammasi' },
];

const METHOD_COLORS = { PAYME: '#00bbe2', CASH: '#10b981', CARD: '#6366f1', OTHER: '#94a3b8' };
const METHOD_LABEL = { PAYME: 'Payme', CASH: 'Naqd', CARD: 'Karta', OTHER: 'Boshqa' };

function Delta({ pct }) {
    if (pct == null || pct === 0) {
        return <span className="rep-kpi__delta rep-kpi__delta--zero"><Minus size={12} /> 0%</span>;
    }
    if (pct > 0) return <span className="rep-kpi__delta rep-kpi__delta--up"><TrendingUp size={12} /> +{pct}%</span>;
    return <span className="rep-kpi__delta rep-kpi__delta--down"><TrendingDown size={12} /> {pct}%</span>;
}

function KpiCard({ icon, color, label, value, suffix, delta, prevLabel, prevValue }) {
    return (
        <motion.div
            className="rep-kpi"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className="rep-kpi__icon" style={{ background: `${color}1f`, color }}>
                {icon}
            </div>
            <div className="rep-kpi__label">{label}</div>
            <div className="rep-kpi__value">
                {value}
                {suffix && <span style={{ fontSize: 14, color: '#64748b', marginLeft: 4 }}>{suffix}</span>}
            </div>
            <Delta pct={delta} />
            {prevValue != null && (
                <div className="rep-kpi__prev">Oldingi: {prevLabel} {prevValue}</div>
            )}
        </motion.div>
    );
}

function RevenueChart({ data, isLoading }) {
    if (isLoading) return <div className="rep-skel" style={{ height: 280 }} />;
    if (!data || data.length === 0) return <div className="rep-empty">Hozircha to'lov yo'q</div>;
    return (
        <div className="rep-chart">
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.32} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={fmtDayLabel}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={fmtCompact}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                    />
                    <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                        formatter={(v) => [fmtMoney(v) + " so'm", 'Daromad']}
                        labelFormatter={(l) => fmtDayLabel(l)}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2.5} fill="url(#repRev)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function MethodPie({ items, isLoading }) {
    if (isLoading) return <div className="rep-skel" style={{ height: 260 }} />;
    if (!items || items.length === 0) return <div className="rep-empty">Ma'lumot yo'q</div>;
    const total = items.reduce((s, i) => s + i.revenue, 0);
    return (
        <>
            <div style={{ height: 200 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={items}
                            dataKey="revenue"
                            nameKey="method"
                            cx="50%"
                            cy="50%"
                            innerRadius={56}
                            outerRadius={86}
                            paddingAngle={2}
                            stroke="none"
                        >
                            {items.map((i) => (
                                <Cell key={i.method} fill={METHOD_COLORS[i.method] || METHOD_COLORS.OTHER} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                            formatter={(v, n) => [fmtMoney(v) + " so'm", METHOD_LABEL[n] || n]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="rep-legend">
                {items.map((it) => {
                    const pct = total > 0 ? Math.round((it.revenue / total) * 100) : 0;
                    return (
                        <div className="rep-legend__row" key={it.method}>
                            <div className="rep-legend__name">
                                <span
                                    className="rep-legend__dot"
                                    style={{ background: METHOD_COLORS[it.method] || METHOD_COLORS.OTHER }}
                                />
                                {METHOD_LABEL[it.method] || it.method}
                                <span className="rep-legend__cnt">· {it.count} ta</span>
                            </div>
                            <div className="rep-legend__val">{fmtCompact(it.revenue)} <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>{pct}%</span></div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function TopServices({ items, isLoading }) {
    if (isLoading) {
        return (
            <div style={{ display: 'grid', gap: 8 }}>
                {[1, 2, 3, 4].map((i) => <div key={i} className="rep-skel" style={{ height: 44 }} />)}
            </div>
        );
    }
    if (!items || items.length === 0) return <div className="rep-empty">Ma'lumot yo'q</div>;
    return (
        <div className="rep-top">
            {items.map((s, idx) => (
                <div className="rep-top__row" key={s.id}>
                    <div className="rep-top__rank">{idx + 1}</div>
                    <div style={{ minWidth: 0 }}>
                        <div className="rep-top__name">{s.name}</div>
                        <div className="rep-top__meta">{s.count} ta to'lov</div>
                    </div>
                    <div className="rep-top__val">{fmtMoney(s.revenue)}</div>
                </div>
            ))}
        </div>
    );
}

function TransactionsTable({ range }) {
    const [page, setPage] = useState(1);
    const [method, setMethod] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['clinic', 'reports', 'tx', range, page, method],
        queryFn: async () => (await api.get('/clinic/reports/transactions', {
            params: { range, page, pageSize: 15, method: method || undefined },
        })).data?.data,
        keepPreviousData: true,
    });

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;
    const total = data?.total ?? 0;

    return (
        <div className="rep-card">
            <div className="rep-card__title-row" style={{ marginBottom: 14 }}>
                <div className="rep-card__title" style={{ margin: 0 }}>
                    <ListOrdered size={14} /> Tranzaksiyalar
                </div>
                <div className="rep-tx-toolbar" style={{ margin: 0 }}>
                    <select
                        className="rep-select"
                        value={method}
                        onChange={(e) => { setPage(1); setMethod(e.target.value); }}
                    >
                        <option value="">Barcha turlari</option>
                        <option value="PAYME">Payme</option>
                        <option value="CASH">Naqd</option>
                        <option value="CARD">Karta</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: 'grid', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="rep-skel" style={{ height: 44 }} />)}
                </div>
            ) : items.length === 0 ? (
                <div className="rep-empty">Tranzaksiyalar topilmadi</div>
            ) : (
                <>
                    <table className="rep-tx-table">
                        <thead>
                            <tr>
                                <th>Booking</th>
                                <th>Sana</th>
                                <th>Bemor</th>
                                <th>Xizmat</th>
                                <th>Usul</th>
                                <th style={{ textAlign: 'right' }}>Summa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((tx) => (
                                <tr key={tx.id}>
                                    <td data-label="Booking" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                                        {tx.bookingNumber}
                                    </td>
                                    <td data-label="Sana">{fmtDate(tx.paidAt)}</td>
                                    <td data-label="Bemor">{tx.patientName}</td>
                                    <td data-label="Xizmat" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {tx.serviceName}
                                    </td>
                                    <td data-label="Usul">
                                        <span className={`rep-pill rep-pill--${(tx.paymentMethod || 'OTHER').toLowerCase()}`}>
                                            {METHOD_LABEL[tx.paymentMethod] || tx.paymentMethod || '—'}
                                        </span>
                                    </td>
                                    <td data-label="Summa" style={{ textAlign: 'right' }}>
                                        <span className="rep-money">{fmtMoney(tx.paidAmount)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="rep-tx-pager">
                        <span>{total} ta tranzaksiya • Sahifa {page} / {totalPages}</span>
                        <div className="rep-tx-pager__btns">
                            <button
                                className="rep-pg-btn"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            ><ChevronLeft size={14} /> Oldingi</button>
                            <button
                                className="rep-pg-btn"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >Keyingi <ChevronRight size={14} /></button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function ClinicReports() {
    const [range, setRange] = useState('30d');

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['clinic', 'reports', 'summary', range],
        queryFn: async () => (await api.get('/clinic/reports/summary', { params: { range } })).data?.data,
    });

    const { data: revenue, isLoading: revenueLoading } = useQuery({
        queryKey: ['clinic', 'reports', 'revenue', range],
        queryFn: async () => (await api.get('/clinic/reports/revenue', { params: { range } })).data?.data?.series ?? [],
    });

    const { data: byMethod, isLoading: methodLoading } = useQuery({
        queryKey: ['clinic', 'reports', 'by-method', range],
        queryFn: async () => (await api.get('/clinic/reports/by-method', { params: { range } })).data?.data?.items ?? [],
    });

    const { data: byService, isLoading: serviceLoading } = useQuery({
        queryKey: ['clinic', 'reports', 'by-service', range],
        queryFn: async () => (await api.get('/clinic/reports/by-service', { params: { range, limit: 6 } })).data?.data?.items ?? [],
    });

    const { data: referrals, isLoading: referralsLoading } = useQuery({
        queryKey: ['clinic', 'reports', 'referrals', range],
        queryFn: async () => (await api.get('/clinic/reports/referrals', { params: { range } })).data?.data ?? { rows: [], totals: {} },
    });

    const exportUrl = useMemo(() => {
        const token = localStorage.getItem('banisa-token') || '';
        // Build via API base. We rely on cookie/header auth on the same origin in prod.
        return `/api/clinic/reports/export?range=${range}`;
    }, [range]);

    const handleExport = async () => {
        try {
            const resp = await api.get('/clinic/reports/export', {
                params: { range },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `banisa-reports-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error('Export failed', err);
        }
    };

    return (
        <div className="rep-page">
            <motion.header
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rep-header"
            >
                <div className="rep-header__left">
                    <div className="rep-header__icon">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h1 className="rep-header__title">Hisobotlar</h1>
                        <p className="rep-header__sub">Klinika daromadi va tranzaksiyalar tahlili</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div className="rep-range" role="tablist">
                        {RANGES.map((r) => (
                            <button
                                key={r.key}
                                role="tab"
                                className={`rep-range__btn ${range === r.key ? 'rep-range__btn--active' : ''}`}
                                onClick={() => setRange(r.key)}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button className="rep-btn rep-btn--primary" onClick={handleExport}>
                        <Download size={14} /> CSV eksport
                    </button>
                </div>
            </motion.header>

            {/* KPI cards */}
            <div className="rep-kpis">
                {summaryLoading ? (
                    [1, 2, 3, 4].map((i) => <div key={i} className="rep-skel" style={{ height: 130 }} />)
                ) : (
                    <>
                        <KpiCard
                            icon={<DollarSign size={18} />}
                            color="#10b981"
                            label="Jami daromad"
                            value={fmtMoney(summary?.revenue ?? 0)}
                            suffix="so'm"
                            delta={summary?.deltas?.revenue}
                            prevLabel=""
                            prevValue={summary ? fmtCompact(summary.prev.revenue) + " so'm" : null}
                        />
                        <KpiCard
                            icon={<Receipt size={18} />}
                            color="#06b6d4"
                            label="To'langan bron"
                            value={summary?.paidCount ?? 0}
                            delta={summary?.deltas?.paidCount}
                            prevLabel=""
                            prevValue={summary ? summary.prev.paidCount + ' ta' : null}
                        />
                        <KpiCard
                            icon={<Calculator size={18} />}
                            color="#6366f1"
                            label="O'rtacha chek"
                            value={fmtMoney(summary?.avgTicket ?? 0)}
                            suffix="so'm"
                            delta={summary?.deltas?.avgTicket}
                            prevLabel=""
                            prevValue={summary ? fmtCompact(summary.prev.avgTicket) + " so'm" : null}
                        />
                        <KpiCard
                            icon={<AlertCircle size={18} />}
                            color="#f59e0b"
                            label="To'lanmagan"
                            value={summary?.unpaidCount ?? 0}
                            suffix="ta"
                            delta={null}
                            prevLabel=""
                            prevValue={summary ? fmtCompact(summary.unpaidAmount) + " so'm jami" : null}
                        />
                    </>
                )}
            </div>

            {/* Main grid: revenue chart + method pie */}
            <div className="rep-grid">
                <div className="rep-card">
                    <div className="rep-card__title"><Activity size={14} /> Kunlik daromad</div>
                    <RevenueChart data={revenue} isLoading={revenueLoading} />
                </div>
                <div className="rep-card">
                    <div className="rep-card__title"><PieIcon size={14} /> To'lov usullari</div>
                    <MethodPie items={byMethod} isLoading={methodLoading} />
                </div>
            </div>

            {/* Top services + transactions */}
            <div className="rep-grid">
                <TransactionsTable range={range} />
                <div className="rep-card">
                    <div className="rep-card__title">
                        <TrendingUp size={14} /> Top xizmatlar
                    </div>
                    <TopServices items={byService} isLoading={serviceLoading} />
                </div>
            </div>

            {/* Doctor referrals — bookings that came from doctor recommendations */}
            <div className="rep-card" style={{ marginTop: 18 }}>
                <div className="rep-card__title"><Stethoscope size={14} /> Shifokor tavsiyalari</div>
                {referralsLoading ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#8093a8' }}>Yuklanmoqda...</div>
                ) : !referrals?.rows?.length ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#8093a8' }}>Bu davrda shifokor tavsiyasidan bron bo'lmagan.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="rep-tx-table">
                            <thead>
                                <tr>
                                    <th>Shifokor</th>
                                    <th style={{ textAlign: 'right' }}>Bemorlar</th>
                                    <th style={{ textAlign: 'right' }}>Bronlar</th>
                                    <th style={{ textAlign: 'right' }}>Xizmatlar</th>
                                    <th style={{ textAlign: 'right' }}>Summa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals.rows.map((r) => (
                                    <tr key={r.doctorId}>
                                        <td>{r.doctorName}</td>
                                        <td style={{ textAlign: 'right' }}>{r.patients}</td>
                                        <td style={{ textAlign: 'right' }}>{r.bookings}</td>
                                        <td style={{ textAlign: 'right' }}>{r.services}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtCompact(r.sum)} so'm</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
