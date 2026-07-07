import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Split, Save, Loader2, CheckCircle2, Clock, Power, Building2 } from 'lucide-react';
import api from '../../shared/api/axios';

// Super-admin: the single Banisa "Split-Shop" merchant config + per-clinic
// activation gate. Clinics fill their own rekvizit in their panel; here Banisa
// enters the master credentials and flips each configured clinic live.
export default function AdminClickSplit() {
    const qc = useQueryClient();
    const [toast, setToast] = useState('');
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2800); return () => clearTimeout(t); }, [toast]);

    const { data: cfg } = useQuery({
        queryKey: ['admin', 'click-split', 'config'],
        queryFn: async () => (await api.get('/admin/click/split/config')).data?.data?.config,
    });
    const { data: clinics } = useQuery({
        queryKey: ['admin', 'click-split', 'clinics'],
        queryFn: async () => (await api.get('/admin/click/split/clinics')).data?.data?.items ?? [],
    });

    const [form, setForm] = useState(null);
    useEffect(() => {
        if (cfg !== undefined) setForm({
            serviceId: cfg?.serviceId ?? '', merchantId: cfg?.merchantId ?? '',
            merchantUserId: cfg?.merchantUserId ?? '', prodKey: '', testKey: '',
            isTestMode: cfg?.isTestMode ?? true, isActive: cfg?.isActive ?? false,
            banisaCntrgId: cfg?.banisaCntrgId ?? '', banisaInn: cfg?.banisaInn ?? '',
            banisaBranchId: cfg?.banisaBranchId ?? '',
            banisaPaymentAccount: cfg?.banisaPaymentAccount ?? '', banisaPaymentMfo: cfg?.banisaPaymentMfo ?? '',
            banisaTransitAccount: cfg?.banisaTransitAccount ?? '', banisaTransitMfo: cfg?.banisaTransitMfo ?? '',
        });
    }, [cfg]);

    const saveCfg = useMutation({
        mutationFn: async (payload) => (await api.put('/admin/click/split/config', payload)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'click-split', 'config'] }); setToast('✅ Saqlandi'); },
        onError: (e) => setToast('❌ ' + (e?.response?.data?.message || 'Xatolik')),
    });

    const toggleClinic = useMutation({
        mutationFn: async ({ clinicId, isActive }) =>
            (await api.patch(`/admin/click/split/clinics/${clinicId}/active`, { isActive })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'click-split', 'clinics'] }),
        onError: (e) => setToast('❌ ' + (e?.response?.data?.message || 'Xatolik')),
    });

    if (!form) return <div style={{ padding: 32 }}><Loader2 className="spin" /> Yuklanmoqda…</div>;

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    const submit = (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (!payload.prodKey) delete payload.prodKey;   // keep existing sealed key
        if (!payload.testKey) delete payload.testKey;
        saveCfg.mutate(payload);
    };

    return (
        <div style={S.page}>
            <div style={S.head}>
                <div style={S.iconBox}><Split size={22} /></div>
                <div>
                    <h1 style={S.h1}>Click SHOP SPLIT</h1>
                    <p style={S.sub}>Banisa Split-Shop merchant + klinikalarni faollashtirish. Komissiya Banisaga, qolgani klinikaga.</p>
                </div>
                {toast && <span style={S.toast}>{toast}</span>}
            </div>

            {/* Global config */}
            <form onSubmit={submit} style={S.card}>
                <div style={S.cardTitle}><Building2 size={15} /> Banisa Split-Shop kredensiallari</div>
                <div style={S.grid}>
                    <F label="Service ID"><input style={S.in} value={form.serviceId} onChange={set('serviceId')} placeholder="106290" /></F>
                    <F label="Merchant ID"><input style={S.in} value={form.merchantId} onChange={set('merchantId')} placeholder="15949" /></F>
                    <F label="Merchant User ID"><input style={S.in} value={form.merchantUserId} onChange={set('merchantUserId')} placeholder="87478" /></F>
                    <F label={`Secret key (prod) ${cfg?.hasProdKey ? '· ✔ saqlangan' : ''}`}><input style={S.in} type="password" value={form.prodKey} onChange={set('prodKey')} placeholder={cfg?.hasProdKey ? '•••••• (o\'zgartirish uchun yozing)' : 'SECRET_KEY'} /></F>
                    <F label="Test key (ixtiyoriy)"><input style={S.in} type="password" value={form.testKey} onChange={set('testKey')} placeholder="test secret" /></F>
                </div>

                <div style={{ ...S.cardTitle, marginTop: 20 }}>Banisa (Medikal Navigator) — komissiya kontragenti</div>
                <div style={S.grid}>
                    <F label="cntrg_id"><input style={S.in} value={form.banisaCntrgId} onChange={set('banisaCntrgId')} placeholder="307082044" /></F>
                    <F label="INN"><input style={S.in} value={form.banisaInn} onChange={set('banisaInn')} placeholder="307082044" /></F>
                    <F label="branch_id"><input style={S.in} value={form.banisaBranchId} onChange={set('banisaBranchId')} placeholder="307082044" /></F>
                    <F label="Hisob raqami"><input style={S.in} value={form.banisaPaymentAccount} onChange={set('banisaPaymentAccount')} /></F>
                    <F label="MFO"><input style={S.in} value={form.banisaPaymentMfo} onChange={set('banisaPaymentMfo')} /></F>
                </div>

                <div style={S.switchRow}>
                    <label style={S.switch}><input type="checkbox" checked={form.isTestMode} onChange={set('isTestMode')} /> Test rejimi (sandbox)</label>
                    <label style={S.switch}><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> <b>Global faol</b> (split yoqilgan)</label>
                    <button type="submit" style={S.btn} disabled={saveCfg.isPending}>
                        {saveCfg.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Saqlash
                    </button>
                </div>
            </form>

            {/* Clinics */}
            <div style={S.card}>
                <div style={S.cardTitle}><Power size={15} /> Klinikalar — split faollashtirish</div>
                <p style={S.hint}>Klinika o'z rekvizitini to'ldirгач (✔ Tayyor), bu yerдан faollashtiring. Faqat faol klinikalarга to'lov split orqali boradi.</p>
                <div style={S.tblWrap}>
                    <table style={S.tbl}>
                        <thead><tr><th style={S.th}>Klinika</th><th style={S.th}>branch_id</th><th style={S.th}>cntrg_id</th><th style={S.th}>Holat</th><th style={S.th}>Split</th></tr></thead>
                        <tbody>
                            {(clinics ?? []).map((c) => (
                                <tr key={c.clinicId} style={S.tr}>
                                    <td style={S.td}>{c.clinicName}</td>
                                    <td style={S.td}><code>{c.branchId || '—'}</code></td>
                                    <td style={S.td}><code>{c.cntrgId || '—'}</code></td>
                                    <td style={S.td}>
                                        {c.isConfigured
                                            ? <span style={S.badgeOk}><CheckCircle2 size={12} /> Tayyor</span>
                                            : <span style={S.badgeWait}><Clock size={12} /> Kutilmoqda</span>}
                                    </td>
                                    <td style={S.td}>
                                        <button
                                            onClick={() => toggleClinic.mutate({ clinicId: c.clinicId, isActive: !c.isActive })}
                                            disabled={!c.isConfigured || toggleClinic.isPending}
                                            style={{ ...S.toggle, ...(c.isActive ? S.toggleOn : {}), opacity: c.isConfigured ? 1 : 0.4 }}
                                            title={c.isConfigured ? '' : 'Klinika rekvizitni to\'ldirmagan'}
                                        >
                                            {c.isActive ? 'Faol' : 'O\'chiq'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function F({ label, children }) {
    return <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={S.lbl}>{label}</span>{children}</label>;
}

const S = {
    page: { padding: '24px 28px', maxWidth: 1000, margin: '0 auto' },
    head: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
    iconBox: { width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#0a9b9b,#5b5bd6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    h1: { margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-main)' },
    sub: { margin: '2px 0 0', fontSize: 13.5, color: 'var(--text-muted)' },
    toast: { marginLeft: 'auto', fontWeight: 700, fontSize: 14 },
    card: { background: 'var(--bg-card,#fff)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 14, padding: 20, marginBottom: 20 },
    cardTitle: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 },
    lbl: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' },
    in: { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-input,#f8fafc)', color: 'var(--text-main)', fontSize: 13.5, outline: 'none', width: '100%', fontFamily: 'inherit' },
    switchRow: { display: 'flex', alignItems: 'center', gap: 20, marginTop: 18, flexWrap: 'wrap' },
    switch: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--text-main)', cursor: 'pointer' },
    btn: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#0a9b9b', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' },
    hint: { fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' },
    tblWrap: { overflowX: 'auto', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 10 },
    tbl: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 620 },
    th: { textAlign: 'left', padding: '10px 14px', background: 'var(--hover-bg,#f8fafc)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color,#e2e8f0)' },
    tr: { borderBottom: '1px solid var(--border-color,#f1f5f9)' },
    td: { padding: '10px 14px', color: 'var(--text-main)' },
    badgeOk: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,.12)', color: '#059669', fontSize: 11.5, fontWeight: 700 },
    badgeWait: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'rgba(148,163,184,.15)', color: '#64748b', fontSize: 11.5, fontWeight: 700 },
    toggle: { padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-input,#f1f5f9)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' },
    toggleOn: { background: '#059669', color: '#fff', border: '1px solid #059669' },
};
