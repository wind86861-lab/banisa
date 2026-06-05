import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, Link2, Unlink, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import './TelegramBindCard.css';

/**
 * Self-contained Telegram-bot bind/unbind UI.
 * Works for any authenticated role (patient or clinic admin) — both share
 * the /api/user/telegram/* endpoints.
 *
 * Props:
 *  - variant: 'patient' | 'clinic'  (affects copy only)
 *  - className: optional wrapper class
 */
export default function TelegramBindCard({ variant = 'patient', className = '' }) {
    const [tgLink, setTgLink] = useState(null);

    const { data: tgStatus, refetch } = useQuery({
        queryKey: ['telegram-status', variant],
        queryFn: async () => (await api.get('/user/telegram/status')).data.data,
    });

    const linkMutation = useMutation({
        mutationFn: async () => (await api.post('/user/telegram/link-token')).data.data,
        onSuccess: (d) => setTgLink(d),
    });
    const unlinkMutation = useMutation({
        mutationFn: async () => (await api.delete('/user/telegram/link')).data,
        onSuccess: () => { setTgLink(null); refetch(); },
    });

    const linked = tgStatus?.linked;
    const configured = tgStatus?.configured !== false;

    const hint = linked
        ? `Bog'langan${tgStatus.firstName ? ` — ${tgStatus.firstName}` : ''}${tgStatus.username ? ` (@${tgStatus.username})` : ''}`
        : !configured
            ? "Bot hozircha sozlanmagan"
            : variant === 'clinic'
                ? "Yangi bron, check-in va naqd to'lov xabarlarini Telegram'da olish uchun bog'lang."
                : "Botga ulangan emas. Tezroq bildirishnoma uchun bog'lang.";

    return (
        <div className={`tg-bind-card ${className}`}>
            <div className="tg-bind-head">
                <div className="tg-bind-icon"><Send size={18} /></div>
                <div className="tg-bind-titles">
                    <div className="tg-bind-title">Telegram bot</div>
                    <div className="tg-bind-hint">{hint}</div>
                </div>
                <div className="tg-bind-actions">
                    {linked ? (
                        <button
                            type="button"
                            className="tg-bind-btn tg-bind-btn--ghost"
                            onClick={() => unlinkMutation.mutate()}
                            disabled={unlinkMutation.isPending}
                        >
                            <Unlink size={14} /> Uzish
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="tg-bind-btn"
                            onClick={() => linkMutation.mutate()}
                            disabled={linkMutation.isPending || !configured}
                        >
                            <Link2 size={14} /> Bog'lash
                        </button>
                    )}
                </div>
            </div>
            {tgLink && !linked && (
                <a
                    className="tg-bind-deeplink"
                    href={tgLink.deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setTimeout(() => refetch(), 4000)}
                >
                    <ExternalLink size={14} /> Telegramda ochish
                    <span className="tg-bind-deeplink-hint">— 1 soat ichida tasdiqlang</span>
                </a>
            )}
        </div>
    );
}
