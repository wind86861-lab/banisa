import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ambulance, Save, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
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
