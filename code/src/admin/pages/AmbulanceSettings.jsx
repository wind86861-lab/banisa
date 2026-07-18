import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ambulance, Save, AlertTriangle, CheckCircle2, Loader2, Plus, Trash2, Route } from 'lucide-react';
import api from '../../shared/api/axios';

export default function AmbulanceSettings() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'ambulance-settings'],
        queryFn: async () => (await api.get('/admin/ambulance-settings')).data?.data,
    });

    const [defaultPricePerKm, setDefaultPricePerKm] = useState('');
    const [defaultBaseFee, setDefaultBaseFee] = useState('');

    useEffect(() => {
        if (data) {
            setDefaultPricePerKm(data.defaultPricePerKm ?? '');
            setDefaultBaseFee(data.defaultBaseFee ?? '');
        }
    }, [data]);

    const save = useMutation({
        mutationFn: async () => (await api.put('/admin/ambulance-settings', {
            defaultPricePerKm: defaultPricePerKm === '' ? null : Number(defaultPricePerKm),
            defaultBaseFee: defaultBaseFee === '' ? null : Number(defaultBaseFee),
        })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ambulance-settings'] }),
    });

    return (
        <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Ambulance size={24} color="#dc2626" />
                <h2 style={{ margin: 0, fontSize: 22 }}>Ambulans sozlamalari (global)</h2>
            </div>

            <div style={{
                background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10,
                padding: 12, marginBottom: 18, color: '#78350f', fontSize: 13, display: 'flex', gap: 8,
            }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                    <b>Bu qiymatlar barcha klinikalar uchun default.</b><br />
                    Klinika ambulansga o'zining narxini qo'ymasa — bu qiymat avtomatik ishlatiladi.
                    Agar shu yer ham bo'sh bo'lsa — klinika ambulansni AVAILABLE qila olmaydi.
                </div>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" /></div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
                    <Field label="1 km narxi (so'mda)" hint="Default qiymat. Klinika o'zinikini kiritsa, uniki ishlatiladi.">
                        <input
                            type="number"
                            min={0}
                            value={defaultPricePerKm}
                            onChange={(e) => setDefaultPricePerKm(e.target.value)}
                            placeholder="Masalan: 3000"
                            style={inputStyle}
                        />
                    </Field>

                    <Field label="Chaqiruv narxi (so'mda)" hint="Bazaviy narx, masofadan qat'i nazar.">
                        <input
                            type="number"
                            min={0}
                            value={defaultBaseFee}
                            onChange={(e) => setDefaultBaseFee(e.target.value)}
                            placeholder="Masalan: 50000"
                            style={inputStyle}
                        />
                    </Field>

                    {save.isError && (
                        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: 10, color: '#991b1b', fontSize: 13, marginBottom: 12 }}>
                            <AlertTriangle size={14} /> {save.error?.response?.data?.message || 'Saqlashda xato'}
                        </div>
                    )}

                    {save.isSuccess && !save.isPending && (
                        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: 10, color: '#166534', fontSize: 13, marginBottom: 12 }}>
                            <CheckCircle2 size={14} /> Saqlandi
                        </div>
                    )}

                    <button
                        onClick={() => save.mutate()}
                        disabled={save.isPending}
                        style={{
                            background: '#dc2626', color: '#fff', border: 0, borderRadius: 10,
                            padding: '12px 20px', fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14,
                        }}
                    >
                        {save.isPending ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                        Saqlash
                    </button>
                </div>
            )}

            <BandsManager />
        </div>
    );
}

// ─── Masofa poyaslari (dynamic distance bands) ──────────────────────────────
// SUPER_ADMIN defines the km bands; each ambulance later fills a per-band
// tariff (base + per-km). A tapering ladder (cheaper per-km at longer
// distances) is entered on the ambulance side — here we only shape the ranges.
function BandsManager() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'ambulance-bands'],
        queryFn: async () => (await api.get('/admin/ambulance-bands')).data?.data?.items ?? [],
    });
    const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'ambulance-bands'] });

    const create = useMutation({
        mutationFn: async (body) => (await api.post('/admin/ambulance-bands', body)).data,
        onSuccess: invalidate,
    });
    const update = useMutation({
        mutationFn: async ({ id, body }) => (await api.patch(`/admin/ambulance-bands/${id}`, body)).data,
        onSuccess: invalidate,
    });
    const remove = useMutation({
        mutationFn: async (id) => (await api.delete(`/admin/ambulance-bands/${id}`)).data,
        onSuccess: invalidate,
    });

    const [draft, setDraft] = useState({ label: '', minKm: '', maxKm: '' });

    return (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Route size={18} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: 17 }}>Masofa poyaslari</h3>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
                Bemor yo'li qaysi poyasga tushsa, o'sha poyas bo'yicha narxlanadi. Har ambulans
                bu poyaslar uchun o'z narxini (boshlang'ich + km) alohida kiritadi. Poyaslarni
                vaziyatga qarab qo'shib/o'chirib turishingiz mumkin.
            </p>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Loader2 className="spin" /></div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                        {(data ?? []).length === 0 && (
                            <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>
                                Hali poyas yo'q. Pastda birinchisini qo'shing (masalan: Yaqin 0–5, O'rta 5–15, Uzoq 15+).
                            </div>
                        )}
                        {(data ?? []).map((b) => (
                            <BandRow
                                key={b.id}
                                band={b}
                                onSave={(body) => update.mutate({ id: b.id, body })}
                                onDelete={() => { if (confirm(`"${b.label}" poyasini o'chirasizmi? Ambulanslarning shu poyas narxi ham o'chadi.`)) remove.mutate(b.id); }}
                            />
                        ))}
                    </div>

                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <MiniField label="Nom">
                            <input value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="Yaqin" style={miniInput} />
                        </MiniField>
                        <MiniField label="Dan (km)">
                            <input type="number" min={0} value={draft.minKm} onChange={(e) => setDraft((d) => ({ ...d, minKm: e.target.value }))} placeholder="0" style={{ ...miniInput, width: 90 }} />
                        </MiniField>
                        <MiniField label="Gacha (km)" hint="bo'sh = cheksiz">
                            <input type="number" min={0} value={draft.maxKm} onChange={(e) => setDraft((d) => ({ ...d, maxKm: e.target.value }))} placeholder="∞" style={{ ...miniInput, width: 90 }} />
                        </MiniField>
                        <button
                            onClick={() => {
                                if (!draft.label.trim()) return;
                                create.mutate({
                                    label: draft.label.trim(),
                                    minKm: draft.minKm === '' ? 0 : Number(draft.minKm),
                                    maxKm: draft.maxKm === '' ? null : Number(draft.maxKm),
                                    sortOrder: (data?.length ?? 0),
                                }, { onSuccess: () => setDraft({ label: '', minKm: '', maxKm: '' }) });
                            }}
                            disabled={create.isPending || !draft.label.trim()}
                            style={{ background: '#0f172a', color: '#fff', border: 0, borderRadius: 9, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                        >
                            {create.isPending ? <Loader2 size={13} className="spin" /> : <Plus size={14} />} Poyas qo'shish
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function BandRow({ band, onSave, onDelete }) {
    const [label, setLabel] = useState(band.label);
    const [minKm, setMinKm] = useState(band.minKm ?? 0);
    const [maxKm, setMaxKm] = useState(band.maxKm ?? '');
    const dirty = label !== band.label || String(minKm) !== String(band.minKm ?? 0) || String(maxKm) !== String(band.maxKm ?? '');
    const tariffCount = band._count?.tariffs ?? 0;

    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
            <MiniField label="Nom">
                <input value={label} onChange={(e) => setLabel(e.target.value)} style={miniInput} />
            </MiniField>
            <MiniField label="Dan">
                <input type="number" min={0} value={minKm} onChange={(e) => setMinKm(e.target.value)} style={{ ...miniInput, width: 80 }} />
            </MiniField>
            <MiniField label="Gacha">
                <input type="number" min={0} value={maxKm} onChange={(e) => setMaxKm(e.target.value)} placeholder="∞" style={{ ...miniInput, width: 80 }} />
            </MiniField>
            <span style={{ fontSize: 11, color: '#94a3b8', paddingBottom: 8 }}>{tariffCount} ambulans</span>
            <button
                onClick={() => onSave({ label: label.trim(), minKm: minKm === '' ? 0 : Number(minKm), maxKm: maxKm === '' ? null : Number(maxKm) })}
                disabled={!dirty}
                style={{ background: dirty ? '#16a34a' : '#cbd5e1', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: dirty ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            >
                <Save size={13} /> Saqlash
            </button>
            <button onClick={onDelete} style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
                <Trash2 size={14} />
            </button>
        </div>
    );
}

const miniInput = {
    padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', width: 130,
};
function MiniField({ label, hint, children }) {
    return (
        <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: 11, marginBottom: 4 }}>{label}</label>
            {children}
            {hint && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{hint}</div>}
        </div>
    );
}

const inputStyle = {
    width: '100%', padding: 12, borderRadius: 10, border: '1px solid #cbd5e1',
    fontSize: 15, fontFamily: 'inherit',
};

function Field({ label, hint, children }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', fontSize: 13, marginBottom: 6 }}>{label}</label>
            {children}
            {hint && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{hint}</div>}
        </div>
    );
}
