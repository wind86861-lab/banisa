import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarX2, Plus, X, Loader2 } from 'lucide-react';
import api from '../../shared/api/axios';

/**
 * Self-contained "blocked booking dates" editor for one service.
 * Reads + writes /clinic/service-unavailable-dates (clinic derived from session).
 * Auto-persists on every add/remove — no separate save button.
 *
 * props: serviceType ('CHECKUP'|'DIAGNOSTIC'|'SURGICAL'|'SANATORIUM'|'DOCTOR'), serviceId
 */
const fmtHuman = (iso) => {
    try {
        return new Date(iso + 'T00:00:00').toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
};

export default function BlockedDatesPicker({ serviceType, serviceId }) {
    const qc = useQueryClient();
    const key = ['clinic', 'unavailable-dates', serviceType, serviceId];
    const todayStr = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);

    const { data: dates = [], isLoading } = useQuery({
        queryKey: key,
        queryFn: async () => (await api.get('/clinic/service-unavailable-dates', { params: { serviceType, serviceId } })).data.data.dates,
        enabled: !!serviceId,
        staleTime: 60_000,
    });

    const save = useMutation({
        mutationFn: async (next) => (await api.put('/clinic/service-unavailable-dates', { serviceType, serviceId, dates: next })).data.data.dates,
        onSuccess: (d) => qc.setQueryData(key, d),
    });

    const [pick, setPick] = useState('');
    const add = () => {
        if (!pick || dates.includes(pick)) { setPick(''); return; }
        save.mutate([...dates, pick].sort());
        setPick('');
    };
    const remove = (d) => save.mutate(dates.filter((x) => x !== d));

    return (
        <div style={{
            border: '1px solid rgba(148,163,184,0.28)', borderRadius: 12,
            padding: '14px', background: 'rgba(239,68,68,0.03)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontWeight: 700, fontSize: 14 }}>
                <CalendarX2 size={16} style={{ color: '#dc2626' }} /> Bron qilib bo'lmaydigan sanalar
                {(isLoading || save.isPending) && <Loader2 size={14} className="ca-spin" style={{ marginLeft: 'auto', color: '#94a3b8' }} />}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Belgilangan sanalarga bemorlar bron qila olmaydi (bayram, ta'til va h.k.).
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: dates.length ? 12 : 0 }}>
                <input
                    type="date"
                    value={pick}
                    min={todayStr}
                    onChange={(e) => setPick(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, fontSize: 13 }}
                />
                <button
                    type="button"
                    onClick={add}
                    disabled={!pick || save.isPending}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 14px',
                        background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: pick ? 'pointer' : 'not-allowed', opacity: pick ? 1 : 0.5,
                    }}
                >
                    <Plus size={15} /> Qo'shish
                </button>
            </div>

            {dates.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dates.map((d) => (
                        <span key={d} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 6px 5px 11px', background: '#fee2e2', color: '#991b1b',
                            borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                        }}>
                            {fmtHuman(d)}
                            <button type="button" onClick={() => remove(d)} aria-label="O'chirish"
                                style={{ display: 'inline-flex', background: 'rgba(153,27,27,0.12)', border: 'none', borderRadius: '50%', width: 18, height: 18, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#991b1b' }}>
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
