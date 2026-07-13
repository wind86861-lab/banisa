import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Copy, CheckCircle2, ShieldCheck, Zap, Power } from 'lucide-react';
import api from '../../../shared/api/axios';

// Per-clinic Alif (Nasiya) connection. The clinic pastes its own Alif merchant
// Token + Key (prod, optionally test), then activates. Alif's checkout offers
// the customer card OR Nasiya installment.
export default function AlifTab() {
    const qc = useQueryClient();
    const [toast, setToast] = useState('');
    const [form, setForm] = useState({ prodToken: '', prodKey: '', testToken: '', testKey: '' });

    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);

    const { data, isLoading } = useQuery({
        queryKey: ['clinic', 'alif', 'config'],
        queryFn: async () => (await api.get('/clinic/payments/alif/config')).data?.data,
    });
    const config = data?.config;
    const webhookUrl = data?.webhookUrl;

    const save = useMutation({
        mutationFn: async () => (await api.put('/clinic/payments/alif/config', form)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinic', 'alif', 'config'] }); setForm({ prodToken: '', prodKey: '', testToken: '', testKey: '' }); setToast('✅ Saqlandi'); },
        onError: (e) => setToast('❌ ' + (e?.response?.data?.message || 'Xatolik')),
    });
    const toggleActive = useMutation({
        mutationFn: async (next) => (await api.patch('/clinic/payments/alif/config/active', { isActive: next })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'alif', 'config'] }),
        onError: (e) => setToast('❌ ' + (e?.response?.data?.message || 'Xatolik')),
    });
    const toggleMode = useMutation({
        mutationFn: async (next) => (await api.patch('/clinic/payments/alif/config/mode', { isTestMode: next })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'alif', 'config'] }),
        onError: (e) => setToast('❌ ' + (e?.response?.data?.message || 'Xatolik')),
    });

    if (isLoading) return <div className="pay-card"><div className="pay-skel" style={{ height: 160 }} /></div>;

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const connected = config?.hasProdToken;
    const copy = (t) => { try { navigator.clipboard?.writeText(t); setToast('📋 Nusxa olindi'); } catch { /* ignore */ } };

    return (
        <div className="pay-tab">
            <div className="pay-card">
                <div className="pay-card__title" style={{ color: '#7c3aed' }}><ShieldCheck size={15} /> Alif Nasiya — ulanish</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 16px', lineHeight: 1.55 }}>
                    Alif merchant kabinetingizdan olgan <b>Token</b> va <b>Key</b>'ni kiriting. Bemor Alif sahifasида karta yoki <b>Nasiya (muddatli to'lov)</b>ни tanlaydi. Har klinika o'z Alif hisobiga ulanadi.
                </p>

                {/* Status */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '9px 12px', borderRadius: 10,
                    fontSize: 12.5, fontWeight: 600,
                    background: config?.isActive ? 'rgba(16,185,129,.1)' : connected ? 'rgba(251,191,36,.12)' : 'rgba(148,163,184,.12)',
                    color: config?.isActive ? '#059669' : connected ? '#b45309' : 'var(--text-muted)',
                }}>
                    <CheckCircle2 size={15} />
                    {config?.isActive ? `Faol · ${config.isTestMode ? 'Test' : 'Live'} rejimi`
                        : connected ? 'Ulangan — faollashtirilmagan' : 'Ulanmagan'}
                </div>

                <div className="split-form__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                    <Field label={`Prod Token ${config?.hasProdToken ? '· ✔' : ''}`}>
                        <input className="alif-in" type="password" value={form.prodToken} onChange={set('prodToken')} placeholder={config?.hasProdToken ? '•••••• (o\'zgartirish uchun)' : 'Token (prod)'} />
                    </Field>
                    <Field label={`Prod Key ${config?.hasProdKey ? '· ✔' : ''}`}>
                        <input className="alif-in" type="password" value={form.prodKey} onChange={set('prodKey')} placeholder={config?.hasProdKey ? '••••••' : 'Key (prod)'} />
                    </Field>
                    <Field label="Test Token (ixtiyoriy)">
                        <input className="alif-in" type="password" value={form.testToken} onChange={set('testToken')} placeholder="Token (test)" />
                    </Field>
                    <Field label="Test Key (ixtiyoriy)">
                        <input className="alif-in" type="password" value={form.testKey} onChange={set('testKey')} placeholder="Key (test)" />
                    </Field>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                    <button className="pay-btn pay-btn--primary" onClick={() => save.mutate()} disabled={save.isPending}>
                        {save.isPending ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Saqlash
                    </button>
                    {connected && (
                        <>
                            <button className="pay-btn" onClick={() => toggleActive.mutate(!config.isActive)} disabled={toggleActive.isPending}>
                                <Power size={14} /> {config.isActive ? 'O\'chirish' : 'Faollashtirish'}
                            </button>
                            <button className="pay-btn" onClick={() => toggleMode.mutate(!config.isTestMode)} disabled={toggleMode.isPending} title="Test ↔ Live">
                                <Zap size={14} /> {config.isTestMode ? 'Live ga o\'tish' : 'Test ga o\'tish'}
                            </button>
                        </>
                    )}
                    {toast && <span style={{ fontSize: 13, fontWeight: 600 }}>{toast}</span>}
                </div>
            </div>

            {webhookUrl && (
                <div className="pay-card">
                    <div className="pay-card__title">Alif'ga beriladigan ma'lumot</div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                        Alif merchant sozlamalarida webhook (bildirishnoma) URL sifatida shuni ko'rsating:
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-input,#f1f5f9)', borderRadius: 9, padding: '9px 12px' }}>
                        <code style={{ fontSize: 12.5, flex: 1, wordBreak: 'break-all' }}>{webhookUrl}</code>
                        <button className="pay-btn" onClick={() => copy(webhookUrl)}><Copy size={13} /></button>
                    </div>
                </div>
            )}

            <style>{`
                .alif-in { padding: 9px 12px; border-radius: 9px; border: 1px solid var(--border-color); background: var(--bg-input,#f1f5f9); color: var(--text-main); font-size: 13.5px; outline: none; width: 100%; font-family: inherit; }
                .alif-in:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
                @media (max-width: 560px) { .pay-tab .split-form__grid { grid-template-columns: 1fr !important; } }
            `}</style>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>{label}</span>
            {children}
        </label>
    );
}
