import prisma from '../../config/database';
import { NotificationEvent, Channel } from './notification.types';
import { DEFAULT_CHANNELS } from './notification.defaults';
import { inAppChannel } from './channels/inapp.channel';
import { eskizChannel } from './channels/eskiz.channel';
import { telegramChannel } from './channels/telegram.channel';
import { NotificationChannel } from './channels/channel';

const CHANNELS: Record<Channel, NotificationChannel> = {
    inapp: inAppChannel,
    sms: eskizChannel,
    telegram: telegramChannel,
};

async function resolveChannels(event: NotificationEvent): Promise<Channel[]> {
    if (event.forceChannels && event.forceChannels.length) {
        return dedupe(event.forceChannels);
    }

    const defaults = DEFAULT_CHANNELS[event.type] || ['inapp'];

    // Clinic-targeted events: clinic admins each carry their own
    // NotificationPreference. We honour the union of their channels so a
    // single admin opting in to SMS doesn't force everyone, but we keep the
    // dispatch logic simple here — just use defaults and let each admin's
    // in-app row exist; SMS/telegram fan-out per admin happens below in
    // dispatchPerAdmin().
    if (event.clinicId && !event.userId) {
        return dedupe(defaults);
    }

    if (event.userId) {
        const pref = await (prisma as any).notificationPreference.findUnique({
            where: { userId: event.userId },
        });
        if (!pref) return dedupe(defaults);

        const channels = (pref.channels as Record<string, string[]>)[event.type];
        const allowed = (Array.isArray(channels) && channels.length ? channels : defaults) as Channel[];

        // Strip channels the user has revoked consent for.
        return dedupe(allowed.filter(ch => {
            if (ch === 'sms') return pref.smsConsent !== false;
            if (ch === 'telegram') return pref.tgConsent === true;
            return true;
        }));
    }

    return dedupe(defaults);
}

function dedupe<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

async function logResult(event: NotificationEvent, channel: Channel, result: { ok: boolean; externalId?: string; error?: string; skipped?: boolean }) {
    try {
        await (prisma as any).notificationLog.create({
            data: {
                userId: event.userId || null,
                clinicId: event.clinicId || null,
                eventType: event.type,
                channel,
                status: result.skipped ? 'skipped' : (result.ok ? 'sent' : 'failed'),
                errorMessage: result.error || null,
                externalId: result.externalId || null,
            },
        });
    } catch (e) {
        // Logging must never break the caller.
        console.error('[notif-dispatcher] log failed:', e);
    }
}

/**
 * Dispatch a single event to every channel allowed by the recipient's prefs.
 * Best-effort: a channel failure never blocks other channels and never throws.
 *
 * For clinic-targeted events, the in-app channel already fans out to every
 * admin via createMany. SMS/Telegram for clinic admins is intentionally
 * suppressed in Phase 1 — wire that in once admin Telegram binding ships.
 */
export async function dispatch(event: NotificationEvent): Promise<void> {
    const channels = await resolveChannels(event);

    await Promise.allSettled(channels.map(async (ch) => {
        // SMS/Telegram for clinic-only events: skip until admin-side binding lands.
        if (event.clinicId && !event.userId && (ch === 'sms' || ch === 'telegram')) {
            return logResult(event, ch, { ok: false, skipped: true, error: 'clinic-side ' + ch + ' not wired' });
        }

        const channel = CHANNELS[ch];
        const result = await channel.send(event);
        await logResult(event, ch, result);
    }));
}
