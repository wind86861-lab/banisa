import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, AlertTriangle, CheckCircle2, ExternalLink, FileCheck } from 'lucide-react';
import api from '../../shared/api/axios';

/**
 * Super-admin global fiscal defaults. These values populate the Payme
 * receipt's `detail.items[]` whenever a clinic-service doesn't have its
 * own per-service override. Soliq Komiteti reads MXIK / package_code /
 * vat_percent off the receipt so every clinic must be wired correctly.
 */
export default function FiscalSettings() {
    const qc = useQueryClient();
    const [form, setForm] = useState({ fiscalMxikCode: '', fiscalPackageCode: '', fiscalVatPercent: '' });
    const [savedMsg, setSavedMsg] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'fiscal-settings'],
        queryFn: async () => (await api.get('/admin/settings/fiscal')).data?.data,
    });

    useEffect(() => {
        if (data) {
            setForm({
                fiscalMxikCode: data.fiscalMxikCode ?? '',
                fiscalPackageCode: data.fiscalPackageCode ?? '',
                fiscalVatPercent: data.fiscalVatPercent ?? '',
            });
        }
    }, [data]);

    const save = useMutation({
        mutationFn: async () => {
            const payload = {
                fiscalMxikCode: form.fiscalMxikCode || null,
                fiscalPackageCode: form.fiscalPackageCode || null,
                fiscalVatPercent: form.fiscalVatPercent === '' ? null : Number(form.fiscalVatPercent),
            };
            const res = await api.put('/admin/settings/fiscal', payload);
            return res.data?.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'fiscal-settings'] });
            setSavedMsg('Saqlandi');
            setTimeout(() => setSavedMsg(''), 2000);
        },
    });

    if (isLoading) {
        return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spin" size={28} /></div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
            <h1 style={{ marginTop: 0, marginBottom: 4, fontSize: 22, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileCheck size={22} color="#0ea5e9" /> Fiskal kodlar (Soliq)
            </h1>
            <p style={{ marginTop: 0, marginBottom: 24, color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                Bu qiymatlar har bir Payme chekida <code>detail.items[]</code> ichida ketadi va Soliq Komiteti hisobotiga
                tushadi. Bu yerda kiritgan qiymatlar — barcha klinikalar uchun <b>standart defolt</b>. Agar bironta
                xizmat boshqa kod talab qilsa, klinika admini shu xizmatni faollashtirayotganda override yozadi
                (Per-service → klinika → global → tibbiy default).
            </p>

            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#075985' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                    MXIK kodi va o'lchov birligini <a href="https://tasnif.soliq.uz" target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: 3 }}>tasnif.soliq.uz<ExternalLink size={11} /></a> dan tasdiqlang.
                    Bo'sh qoldirilsa, tibbiy xizmatlar uchun mahkamlangan defolt <b>10902004002000999 / 1322039 / 12%</b> ishlatiladi.
                </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'grid', gap: 16 }}>
                    <Field
                        label="MXIK kodi"
                        hint="Mahsulot/xizmat klassifikatori (Tasnif Soliq). Tibbiy xizmatlar standart: 10902004002000999"
                        value={form.fiscalMxikCode}
                        onChange={(v) => setForm({ ...form, fiscalMxikCode: v.replace(/\D/g, '') })}
                        placeholder="10902004002000999"
                        maxLength={32}
                    />
                    <Field
                        label="O'lchov birligi (package_code)"
                        hint="MXIK ga bog'langan o'lchov birligi kodi. Tibbiy xizmatlar uchun standart: 1322039 (xizmat / marta)"
                        value={form.fiscalPackageCode}
                        onChange={(v) => setForm({ ...form, fiscalPackageCode: v.replace(/\D/g, '') })}
                        placeholder="1322039"
                        maxLength={32}
                    />
                    <NumberField
                        label="QQS foizi (vat_percent)"
                        hint="0 yoki 12 odatda. Klinika QQS to'lamasa — 0 yozing"
                        value={form.fiscalVatPercent}
                        onChange={(v) => setForm({ ...form, fiscalVatPercent: v })}
                        placeholder="12"
                        min={0}
                        max={100}
                    />
                </div>

                {data?.updatedAt && (
                    <div style={{ marginTop: 18, fontSize: 12, color: '#94a3b8' }}>
                        Oxirgi o'zgartirilgan: {new Date(data.updatedAt).toLocaleString('uz-UZ')}
                        {data.updatedBy && ` · ${data.updatedBy.slice(0, 8)}…`}
                    </div>
                )}

                {save.isError && (
                    <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
                        <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        {save.error?.response?.data?.message || save.error?.message || 'Xato'}
                    </div>
                )}

                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => save.mutate()}
                        disabled={save.isPending}
                        style={{
                            background: '#0ea5e9', color: '#fff', border: 'none',
                            padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        {save.isPending ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                        Saqlash
                    </button>
                    {savedMsg && (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                            <CheckCircle2 size={16} /> {savedMsg}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, hint, value, onChange, placeholder, maxLength }) {
    return (
        <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#334155' }}>{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1',
                    borderRadius: 8, fontSize: 14, fontFamily: 'monospace',
                }}
            />
            {hint && <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{hint}</div>}
        </div>
    );
}

function NumberField({ label, hint, value, onChange, placeholder, min, max }) {
    return (
        <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#334155' }}>{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                min={min}
                max={max}
                style={{
                    width: 200, padding: '10px 12px', border: '1px solid #cbd5e1',
                    borderRadius: 8, fontSize: 14,
                }}
            />
            {hint && <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{hint}</div>}
        </div>
    );
}
