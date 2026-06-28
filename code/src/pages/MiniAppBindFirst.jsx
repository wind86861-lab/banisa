import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Send, Phone, ShieldCheck, Loader2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useUserAuth } from '../shared/auth/UserAuthContext';
import './css/MiniAppBindFirst.css';

const BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'banisauzbot').replace(/^@/, '');

// Exponential-ish polling cadence. Bot processes a fresh contact almost
// instantly on warm pods; on a cold start it can take 8-12s. Linear 2s
// polling for 30s used to burn battery + flood telemetry for no win.
// We probe quick early, then back off.
const POLL_DELAYS_MS = [1500, 2000, 2500, 3500, 5000, 5000, 5000, 7000];

/**
 * In-Telegram register/login screen for the Mini App.
 *
 * Flow:
 *   1. Show a single "Share my phone" CTA.
 *   2. Tap → Telegram.WebApp.requestContact() opens the native dialog.
 *   3. User confirms → Telegram sends the contact to the BOT (not to us).
 *   4. The bot's `message:contact` handler registers the user and links the
 *      chatId to the freshly created Banisa account.
 *   5. We poll /miniapp-login until it returns 200 (~35s total budget).
 *   6. On success → JWT applied via UserAuthContext, navigate to home.
 *
 * Fallback paths:
 *   • requestContact() unsupported (older Telegram clients) → open the bot
 *     in a chat so the user can tap the share button there.
 *   • Outside Telegram entirely → React Router link to /user/signup.
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

    const openBotChat = () => {
        const tg = window.Telegram?.WebApp;
        try { tg?.openTelegramLink?.(`https://t.me/${BOT_USERNAME}?start=share`); }
        catch { window.open(`https://t.me/${BOT_USERNAME}`, '_blank'); }
    };

    /** Poll the miniapp-login endpoint until the bot has created the account. */
    const pollUntilBound = async () => {
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData;
        if (!initData) {
            setPhase('error');
            setErrorMsg('Telegram ma\'lumotlari topilmadi. Mini App\'ni qaytadan oching.');
            return;
        }

        // Reset the cancel flag so a fresh retry can run after a previous
        // poll was aborted by clicking the close → reopen → bind cycle.
        pollAbortRef.current = false;

        for (const delay of POLL_DELAYS_MS) {
            if (pollAbortRef.current) return;
            try {
                await loginViaTelegramMiniApp(initData);
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
            await new Promise(r => setTimeout(r, delay));
        }
        setPhase('error');
        setErrorMsg('Bot javob bermadi. Telegram chatda Banisa botiga o\'tib, "Telefon yuborish" tugmasini bosing va qaytaring.');
    };

    const handleShareContact = () => {
        const tg = window.Telegram?.WebApp;
        if (!tg) return;
        setErrorMsg('');
        if (!canRequestContact) {
            // Older Telegram clients don't expose requestContact yet —
            // bounce to the bot chat where the start-keyboard offers the
            // same "share contact" button at the platform level.
            openBotChat();
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

    // Retry from the error state — clears the message and re-runs the
    // share dialog. Previously the error overlay was terminal and the
    // patient had to reload the Mini App.
    const handleRetry = () => {
        setErrorMsg('');
        setPhase('idle');
        handleShareContact();
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
                    {/* The primary CTA is only useful inside Telegram. Out of
                        the embed we hide it entirely instead of showing a
                        disabled button that can't do anything. */}
                    {insideTelegram && phase === 'idle' && (
                        <button
                            type="button"
                            className="mab-btn mab-btn--primary"
                            onClick={handleShareContact}
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
                    {/* Error state offers two real escape hatches: retry
                        the share dialog, or open the bot chat directly so
                        the patient can tap the bot's start-keyboard
                        "Telefon yuborish" button instead. */}
                    {phase === 'error' && insideTelegram && (
                        <>
                            <button
                                type="button"
                                className="mab-btn mab-btn--primary"
                                onClick={handleRetry}
                            >
                                <RefreshCw size={16} /> Qayta urinish
                            </button>
                            <button
                                type="button"
                                className="mab-btn mab-btn--ghost"
                                onClick={openBotChat}
                            >
                                <ExternalLink size={16} /> Botni chat'da ochish
                            </button>
                        </>
                    )}
                </div>

                {!insideTelegram && (
                    <p className="mab-foot">
                        Bu sahifa Telegram Mini App orqali ishlaydi.
                        Saytda ro'yxatdan o'tish uchun{' '}
                        {/* React Router Link — a plain <a> would full-page
                            reload and tear down the UserAuthContext. */}
                        <Link to="/user/signup">bu yerga</Link> o'ting.
                    </p>
                )}
            </div>
        </div>
    );
}
