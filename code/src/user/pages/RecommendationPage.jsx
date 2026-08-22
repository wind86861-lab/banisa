import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stethoscope, Building2, X, Check, Ban, Loader2, ShieldCheck, Clock, XCircle, CheckCircle2, CalendarCheck,
} from 'lucide-react';
import api from '../../shared/api/axios';
import { imgUrl } from '../../shared/utils/format';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './RecommendationPage.css';

const fmt = (n) => (Number(n) || 0).toLocaleString('uz-UZ');

const DONE = {
    ACCEPTED: { ic: <CheckCircle2 size={38} />, cls: 'rp-done--ok', title: 'Qabul qilindi', text: 'Tavsiyani qabul qildingiz. Vaqt va to\'lov turini tanlab bron qilishingiz mumkin.' },
    REJECTED: { ic: <XCircle size={38} />, cls: 'rp-done--rej', title: 'Rad etildi', text: 'Bu tavsiyani rad etdingiz.' },
    EXPIRED:  { ic: <Clock size={38} />, cls: 'rp-done--exp', title: 'Muddati o\'tdi', text: 'Bu tavsiyaga javob berish muddati tugadi.' },
    BOOKED:   { ic: <CalendarCheck size={38} />, cls: 'rp-done--book', title: 'Bron qilindi', text: 'Bu tavsiya bo\'yicha bron qilingan.' },
};

export default function RecommendationPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [busy, setBusy] = useState('');

    const { data: rec, isLoading, error } = useQuery({
        queryKey: ['recommendation', id],
        queryFn: async () => (await api.get(`/user/recommendations/${id}`)).data.data,
        retry: false,
    });

    const removeItem = useMutation({
        mutationFn: async (itemId) => (await api.post(`/user/recommendations/${id}/remove-item`, { itemId })).data.data,
        onSuccess: (data) => qc.setQueryData(['recommendation', id], data),
    });
    const respond = useMutation({
        mutationFn: async (action) => (await api.post(`/user/recommendations/${id}/${action}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendation', id] }),
    });

    if (isLoading) return <BanisaLoader message="Yuklanmoqda..." />;
    if (error || !rec) {
        return (
            <div className="rp rp--center">
                <div className="rp-done rp-done--rej"><div className="rp-done-ic"><XCircle size={38} /></div>
                    <h2>Topilmadi</h2><p>Bu tavsiya mavjud emas.</p>
                    <button className="rp-btn rp-btn--ghost" onClick={() => navigate('/user/dashboard')}>Bosh sahifa</button>
                </div>
            </div>
        );
    }

    const isPending = rec.status === 'PENDING';

    return (
        <div className="rp">
            <div className="rp-hero">
                <div className="rp-hero-ic"><Stethoscope size={22} /></div>
                <div className="rp-hero-txt">
                    <span className="rp-hero-eyebrow">Shifokor tavsiyasi</span>
                    <h1>{rec.doctorName} sizga tavsiya qildi</h1>
                </div>
            </div>

            <div className="rp-clinic">
                {rec.clinic?.logo
                    ? <img src={imgUrl(rec.clinic.logo)} alt="" className="rp-clinic-logo" />
                    : <div className="rp-clinic-logo rp-clinic-logo--ph"><Building2 size={18} /></div>}
                <div><b>{rec.clinic?.name || 'Klinika'}</b><span>Tavsiya etilgan klinika</span></div>
            </div>

            {!isPending && DONE[rec.status] && (
                <div className={`rp-banner ${DONE[rec.status].cls}`}>
                    {DONE[rec.status].ic}
                    <div><b>{DONE[rec.status].title}</b><span>{DONE[rec.status].text}</span></div>
                </div>
            )}

            <div className="rp-items">
                <div className="rp-items-head">
                    <span>Tavsiya etilgan xizmatlar</span>
                    {isPending && <span className="rp-items-hint">keraksizni olib tashlang</span>}
                </div>
                {rec.items.map((it) => (
                    <div key={it.id} className="rp-item">
                        <div className="rp-item-main">
                            <b>{it.name}</b>
                            <span>{fmt(it.price)} so'm{it.quantity > 1 ? ` × ${it.quantity}` : ''}</span>
                        </div>
                        {isPending && rec.items.length > 1 && (
                            <button className="rp-item-x" onClick={() => removeItem.mutate(it.id)} disabled={removeItem.isPending} aria-label="Olib tashlash">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="rp-total">
                <span>Umumiy summa</span>
                <b>{fmt(rec.total)} so'm</b>
            </div>

            {isPending ? (
                <div className="rp-actions">
                    <button className="rp-btn rp-btn--reject" disabled={respond.isPending} onClick={() => { setBusy('reject'); respond.mutate('reject'); }}>
                        {respond.isPending && busy === 'reject' ? <Loader2 size={18} className="rp-spin" /> : <Ban size={17} />} Rad etish
                    </button>
                    <button className="rp-btn rp-btn--accept" disabled={respond.isPending} onClick={() => { setBusy('accept'); respond.mutate('accept'); }}>
                        {respond.isPending && busy === 'accept' ? <Loader2 size={18} className="rp-spin" /> : <Check size={18} />} Qabul qilish
                    </button>
                </div>
            ) : rec.status === 'ACCEPTED' ? (
                <button className="rp-btn rp-btn--accept rp-btn--full" onClick={() => navigate('/user/cart')}>
                    <CalendarCheck size={18} /> Bron qilishga o'tish
                </button>
            ) : null}

            <p className="rp-safe"><ShieldCheck size={13} /> To'lov va vaqtni o'zingiz tanlaysiz. Tizim komissiya olmaydi.</p>
        </div>
    );
}
