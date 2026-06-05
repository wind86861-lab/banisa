import { Request, Response } from 'express';
import prisma from '../../config/database';
import { DEFAULT_CHANNELS } from './notification.defaults';
import { Channel, EventType } from './notification.types';

const VALID_CHANNELS: Channel[] = ['inapp', 'sms', 'telegram'];
const VALID_EVENTS = Object.keys(DEFAULT_CHANNELS) as EventType[];

interface AuthedRequest extends Request {
    user?: { userId: string };
}

export const getPreferences = async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.userId;
    const pref = await (prisma as any).notificationPreference.findUnique({
        where: { userId },
    });

    // Synthesise defaults so the frontend can render every event row.
    const channels = (pref?.channels as Record<string, string[]>) || {};
    const resolved: Record<string, Channel[]> = {};
    for (const ev of VALID_EVENTS) {
        resolved[ev] = (channels[ev] as Channel[]) || DEFAULT_CHANNELS[ev];
    }

    return res.json({
        success: true,
        data: {
            channels: resolved,
            smsConsent: pref?.smsConsent ?? true,
            tgConsent: pref?.tgConsent ?? false,
            language: pref?.language ?? 'uz',
            events: VALID_EVENTS,
        },
    });
};

export const updatePreferences = async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { channels, smsConsent, tgConsent, language } = req.body || {};

    const sanitized: Record<string, Channel[]> = {};
    if (channels && typeof channels === 'object') {
        for (const [ev, chs] of Object.entries(channels)) {
            if (!VALID_EVENTS.includes(ev as EventType)) continue;
            if (!Array.isArray(chs)) continue;
            const valid = (chs as string[]).filter((c): c is Channel => VALID_CHANNELS.includes(c as Channel));
            sanitized[ev] = Array.from(new Set(valid));
        }
    }

    const data: any = {};
    if (Object.keys(sanitized).length) data.channels = sanitized;
    if (typeof smsConsent === 'boolean') data.smsConsent = smsConsent;
    if (typeof tgConsent === 'boolean') data.tgConsent = tgConsent;
    if (typeof language === 'string' && ['uz', 'ru'].includes(language)) data.language = language;

    const pref = await (prisma as any).notificationPreference.upsert({
        where: { userId },
        update: data,
        create: { userId, ...data },
    });

    return res.json({ success: true, data: pref });
};
