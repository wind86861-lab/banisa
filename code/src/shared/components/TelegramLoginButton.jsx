import { useEffect, useRef } from 'react';

const BOT_USERNAME = 'banisauzbot';

/**
 * Telegram Login Widget — official iframe button.
 * Mounted inside a hidden container; Telegram's script writes the iframe in.
 *
 * Props:
 *  - onAuth(user): called with the verified payload
 *      { id, first_name, last_name?, username?, photo_url?, auth_date, hash }
 *  - size: 'small' | 'medium' | 'large'  (default 'large')
 *  - cornerRadius: optional integer
 *  - requestWriteAccess: boolean — ask Telegram for permission to message user
 */
export default function TelegramLoginButton({
    onAuth,
    size = 'large',
    cornerRadius = 12,
    requestWriteAccess = true,
}) {
    const containerRef = useRef(null);
    const onAuthRef = useRef(onAuth);
    onAuthRef.current = onAuth;

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        container.innerHTML = '';

        // Bridge: Telegram widget calls a global by name.
        const callbackName = '__banisaTgAuth__';
        window[callbackName] = (user) => {
            try { onAuthRef.current?.(user); } catch (e) { console.error('[tg-widget] auth callback failed:', e); }
        };

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', BOT_USERNAME);
        script.setAttribute('data-size', size);
        script.setAttribute('data-onauth', `${callbackName}(user)`);
        if (typeof cornerRadius === 'number') script.setAttribute('data-radius', String(cornerRadius));
        if (requestWriteAccess) script.setAttribute('data-request-access', 'write');
        container.appendChild(script);

        return () => {
            try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
            container.innerHTML = '';
        };
    }, [size, cornerRadius, requestWriteAccess]);

    return <div ref={containerRef} className="tg-login-widget" />;
}
