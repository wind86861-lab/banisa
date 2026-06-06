import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Phone, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { useUserAuth } from '../shared/auth/UserAuthContext';
import './css/MiniAppBindFirst.css';

/**
 * In-Telegram register/login screen for the Mini App.
 *
 * Flow:
 *   1. Show a single "Share my phone" CTA.
 *   2. Tap → Telegram.WebApp.requestContact() opens the native dialog.
 *   3. User confirms → Telegram sends the contact to the BOT (not to us).
 *   4. The bot's `message:contact` handler registers the user and links the
 *      chatId to the freshly created Banisa account.
 *   5. We poll /miniapp-login every 2s until it returns 200 (max ~30s).
 *   6. On success → JWT applied via UserAuthContext, navigate to home.
 *
 * Fallback paths:
 *   • requestContact() unsupported (older Telegram clients) → open the bot
 *     in a chat so the user can tap the share button there.
 *   • Outside Telegram entirely → static instructions to use the web site.
 */
export default function MiniAppBindFirst() {
    const navigate = useNavigate();
    const { loginViaTelegramMiniApp } = useUserAuth();
    const [phase, setPhase] = useState('idle'); // idle | requesting | polling | error
    const [errorMsg, setErrorMsg] = useState('');
    const pollAbortRef = useRef(false);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            try { tg.ready(); } catch {}
            try { tg.expand?.(); } catch {}
            try { tg.MainButton?.hide?.(); } catch {}
        }
        return () => { pollAbortRef.current = true; };
    }, []);

    const insideTelegram = Boolean(window.Telegram?.WebApp?.initData);
    const canRequestContact = typeof window.Telegram?.WebApp?.requestContact === 'function';

    /** Poll the miniapp-login endpoint until the bot has created the account. */
    const pollUntilBound = async () => {
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData;
        if (!initData) {
            setPhase('error');
            setErrorMsg('Telegram ma\'lumotlari topilmadi. Mini App\'ni qaytadan oching.');
            return;
        }

        const MAX_ATTEMPTS = 15; // ~30s at 2s interval
        const INTERVAL_MS = 2000;
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            if (pollAbortRef.current) return;
            try {
                await loginViaTelegramMiniApp(initData);
                // Clear the once-per-session guard the auth context sets so
                // a future hard reload (e.g. user closing & reopening) still
                // works cleanly.
                try { sessionStorage.removeItem('banisa_miniapp_tried'); } catch {}
                navigate('/', { replace: true });
                return;
            } catch (e) {
                const status = e?.response?.status;
                // 404 = not_bound yet — bot hasn't processed the contact.
                // Anything else (network, 500, etc.) → keep trying briefly,
                // the bot processing can be slow under cold start.
                if (status && status !== 404) {
                    setPhase('error');
                    setErrorMsg('Kirishda xato. Iltimos, qaytadan urinib ko\'ring.');
                    return;
                }
            }
            await new Promise(r => setTimeout(r, INTERVAL_MS));
        }
        setPhase('error');
        setErrorMsg('Bot javob bermadi. Telegram chatda Banisa botiga o\'tib, "Telefon yuborish" tugmasini bosing va qaytaring.');
    };

    const handleShareContact = () => {
        const tg = window.Telegram?.WebApp;
        if (!tg) return;
        setErrorMsg('');
        if (!canRequestContact) {
            // Fallback: send the user to the bot chat where they can tap the
            // share button (the bot sends a request_contact keyboard on /start).
            const username = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'banisauzbot').replace(/^@/, '');
            try { tg.openTelegramLink?.(`https://t.me/${username}?start=share`); }
            catch { window.open(`https://t.me/${username}`, '_blank'); }
            return;
        }

        setPhase('requesting');
        try {
            tg.requestContact((shared) => {
                if (!shared) {
                    setPhase('idle');
                    return;
                }
                setPhase('polling');
                pollUntilBound();
            });
        } catch (e) {
            setPhase('error');
            setErrorMsg('Tizim Telegram bilan bog\'lana olmadi.');
        }
    };

    return (
        <div className="mab-page">
            <div className="mab-card">
                <div className="mab-icon"><Send size={28} /></div>
                <h1 className="mab-title">Banisa'ga xush kelibsiz</h1>
                <p className="mab-sub">
                    Bron qilish, bildirishnomalar va to'lovlardan foydalanish uchun
                    telefon raqamingizni Telegram orqali tasdiqlang. Sayt orqali
                    alohida ro'yxatdan o'tish shart emas.
                </p>

                <ul className="mab-perks">
                    <li><ShieldCheck size={16} /> Faqat Banisa'da saqlanadi</li>
                    <li><Phone size={16} /> Bir tugma — bir sekund</li>
                </ul>

                {phase === 'error' && (
                    <div className="mab-error" role="alert">
                        <AlertTriangle size={16} /> <span>{errorMsg}</span>
                    </div>
                )}

                <div className="mab-actions">
                    {(phase === 'idle' || phase === 'error') && (
                        <button
                            type="button"
                            className="mab-btn mab-btn--primary"
                            onClick={handleShareContact}
                            disabled={!insideTelegram}
                        >
                            <Phone size={16} /> Telefon raqamni yuborish
                        </button>
                    )}
                    {phase === 'requesting' && (
                        <div className="mab-pending">
                            <Loader2 size={18} className="mab-spin" />
                            <span>Telegram dialogi ochildi — tasdiqlang.</span>
                        </div>
                    )}
                    {phase === 'polling' && (
                        <div className="mab-pending">
                            <Loader2 size={18} className="mab-spin" />
                            <span>Hisob yaratilmoqda... bir necha soniya.</span>
                        </div>
                    )}
                </div>

                {!insideTelegram && (
                    <p className="mab-foot">
                        Bu sahifa Telegram Mini App orqali ishlaydi.
                        Saytda ro'yxatdan o'tish uchun{' '}
                        <a href="/user/signup">bu yerga</a> o'ting.
                    </p>
                )}
            </div>
        </div>
    );
}
