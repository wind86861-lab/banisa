import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Split, Building2, Loader2, CheckCircle2, Clock, Info } from 'lucide-react';
import api from '../../../../shared/api/axios';

// Clinic admin fills in where their share of a split Click payment lands. The
// commission goes to Banisa automatically; this rekvizit is the clinic side.
// branch_id / cntrg_id default to the INN when left blank. Banisa (super-admin)
// still has to flip isActive before payments actually route through split.
export default function ClickSplitConfigCard() {
    const qc = useQueryClient();
    const [form, setForm] = useState(null);
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(''), 2600);
        return () => clearTimeout(t);
    }, [toast]);

    const { data, isLoading } = useQuery({
        queryKey: ['clinic', 'click', 'split-config'],
        queryFn: async () => (await api.get('/clinic/payments/click/split-config')).data?.data?.config,
    });

    useEffect(() => {
        if (data !== undefined) {
            setForm({
                inn: data?.inn ?? '',
                branchId: data?.branchId ?? '',
                cntrgId: data?.cntrgId ?? '',
                paymentAccount: data?.paymentAccount ?? '',
                paymentMfo: data?.paymentMfo ?? '',
                transitAccount: data?.transitAccount ?? '',
                transitMfo: data?.transitMfo ?? '',
            });
        }
    }, [data]);

    const save = useMutation({
        mutationFn: async (payload) =>
            (await api.put('/clinic/payments/click/split-config', payload)).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clinic', 'click', 'split-config'] });
            setToast('✅ Saqlandi');
        },
        onError: (err) => setToast('❌ ' + (err?.response?.data?.message || 'Xatolik')),
    });

    if (isLoading || !form) {
        return <div className="pay-card"><div className="pay-skel" style={{ height: 120 }} /></div>;
    }

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const onSubmit = (e) => { e.preventDefault(); save.mutate(form); };

    const isConfigured = data?.isConfigured;
    const isActive = data?.isActive;

    return (
        <div className="pay-card">
            <div className="pay-card__title"><Split size={14} /> To'lovni bo'lish (SHOP SPLIT)</div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 16px', lineHeight: 1.55 }}>
                Bemor to'lovi ikkiga bo'linadi: Banisa komissiyasi Banisa hisobiga, <b>qolgan qismi to'g'ridan-to'g'ri sizning hisobingizga</b> tushadi. Quyida o'z bank rekvizitlaringizni kiriting.
            </p>

            {/* Status line */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '9px 12px',
                borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                background: isActive ? 'rgba(16,185,129,.1)' : isConfigured ? 'rgba(251,191,36,.12)' : 'rgba(148,163,184,.12)',
                color: isActive ? '#059669' : isConfigured ? '#b45309' : 'var(--text-muted)',
            }}>
                {isActive ? <CheckCircle2 size={15} /> : isConfigured ? <Clock size={15} /> : <Info size={15} />}
                {isActive
                    ? 'Faol — to\'lovlar split orqali bo\'linmoqda'
                    : isConfigured
                        ? 'Rekvizit to\'ldirilgan — Banisa tomonidan faollashtirilishi kutilmoqda'
                        : 'Rekvizit to\'ldirilmagan'}
            </div>

            <form onSubmit={onSubmit} className="split-form">
                <div className="split-form__grid">
                    <Field label="INN (STIR)" hint="9 raqam — branch_id shu bo'ladi" required>
                        <input inputMode="numeric" maxLength={9} value={form.inn} onChange={set('inn')} placeholder="307979571" />
                    </Field>
                    <Field label="Hisob raqami (payment_account)" required>
                        <input inputMode="numeric" value={form.paymentAccount} onChange={set('paymentAccount')} placeholder="2020 8000 ..." />
                    </Field>
                    <Field label="Bank MFO (payment_mfo)" hint="5 raqam" required>
                        <input inputMode="numeric" maxLength={5} value={form.paymentMfo} onChange={set('paymentMfo')} placeholder="00014" />
                    </Field>
                    <Field label="Transit hisob (ixtiyoriy)">
                        <input inputMode="numeric" value={form.transitAccount} onChange={set('transitAccount')} placeholder="—" />
                    </Field>
                    <Field label="Transit MFO (ixtiyoriy)">
                        <input inputMode="numeric" maxLength={5} value={form.transitMfo} onChange={set('transitMfo')} placeholder="—" />
                    </Field>
                    <Field label="cntrg_id (ixtiyoriy)" hint="bo'sh qolsa = INN">
                        <input value={form.cntrgId} onChange={set('cntrgId')} placeholder="INN bilan bir xil" />
                    </Field>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                    <button type="submit" className="pay-btn pay-btn--primary" disabled={save.isPending}>
                        {save.isPending ? <Loader2 size={14} className="spin" /> : <Building2 size={14} />}
                        Saqlash
                    </button>
                    {toast && <span style={{ fontSize: 13, fontWeight: 600 }}>{toast}</span>}
                </div>
            </form>

            <style>{`
                .split-form__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 16px; }
                .split-field { display: flex; flex-direction: column; gap: 5px; }
                .split-field label { font-size: 12.5px; font-weight: 600; color: var(--text-main); }
                .split-field .req { color: #ef4444; margin-left: 2px; }
                .split-field .hint { font-size: 11px; color: var(--text-muted); font-weight: 400; }
                .split-field input {
                    padding: 9px 12px; border-radius: 9px; border: 1px solid var(--border-color);
                    background: var(--bg-input, #f1f5f9); color: var(--text-main); font-size: 13.5px; outline: none;
                    font-family: inherit; width: 100%;
                }
                .split-field input:focus { border-color: #00C9A7; box-shadow: 0 0 0 3px rgba(0,201,167,.12); }
                @media (max-width: 560px) { .split-form__grid { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}

function Field({ label, hint, required, children }) {
    return (
        <div className="split-field">
            <label>{label}{required && <span className="req">*</span>}{hint && <span className="hint"> · {hint}</span>}</label>
            {children}
        </div>
    );
}
