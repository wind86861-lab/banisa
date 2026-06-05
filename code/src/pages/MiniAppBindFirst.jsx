import { useEffect } from 'react';
import { Send, ArrowRight, ExternalLink } from 'lucide-react';
import './css/MiniAppBindFirst.css';

/**
 * Shown inside the Telegram Mini App when the user's Telegram account has
 * not yet been bound to a Banisa hisob. We can't sign them in, so we point
 * them at the web flow: log in (or sign up) on the site, then bind from
 * notification settings.
 *
 * Once binding is done in the web, reopening the Mini App will auto-login.
 */
export default function MiniAppBindFirst() {
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand?.();
            try { tg.MainButton?.hide?.(); } catch {}
        }
    }, []);

    const openInBrowser = (path) => {
        const url = `https://banisa.uz${path}`;
        const tg = window.Telegram?.WebApp;
        if (tg?.openLink) {
            tg.openLink(url);
        } else {
            window.open(url, '_blank', 'noopener');
        }
    };

    return (
        <div className="mab-page">
            <div className="mab-card">
                <div className="mab-icon"><Send size={28} /></div>
                <h1 className="mab-title">Telegram'ni bog'lash kerak</h1>
                <p className="mab-sub">
                    Bu Telegram akkauntingiz Banisa hisobi bilan hali bog'lanmagan.
                    Saytda kirgan holda Telegram'ni bog'lasangiz, keyingi safar shu Mini App'da avtomatik kirasiz.
                </p>

                <ol className="mab-steps">
                    <li><span className="mab-num">1</span> Saytda telefon orqali kiring (yoki ro'yxatdan o'ting)</li>
                    <li><span className="mab-num">2</span> Bildirishnoma sozlamalariga o'ting</li>
                    <li><span className="mab-num">3</span> "Telegram bot" → Bog'lash tugmasini bosing</li>
                </ol>

                <div className="mab-actions">
                    <button className="mab-btn" onClick={() => openInBrowser('/user/login')}>
                        Saytda kirish <ArrowRight size={16} />
                    </button>
                    <button className="mab-btn mab-btn--ghost" onClick={() => openInBrowser('/user/signup')}>
                        <ExternalLink size={14} /> Ro'yxatdan o'tish
                    </button>
                </div>

                <p className="mab-foot">Bog'lab bo'lgach, shu Mini App'ni qaytadan oching — sizni avtomatik taniydi.</p>
            </div>
        </div>
    );
}
