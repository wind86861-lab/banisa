import prisma from '../../../config/database';
import { NotificationEvent } from '../notification.types';
import { renderTemplate } from '../notification.templates';
import { SMS_DAILY_LIMIT_PER_USER } from '../notification.defaults';
import { NotificationChannel, DeliveryResult } from './channel';

const ESKIZ_BASE = process.env.ESKIZ_BASE_URL || 'https://notify.eskiz.uz/api';
const ESKIZ_EMAIL = process.env.ESKIZ_EMAIL || '';
const ESKIZ_PASSWORD = process.env.ESKIZ_PASSWORD || '';
const ESKIZ_FROM = process.env.ESKIZ_FROM || '4546';
const REQ_TIMEOUT_MS = 8000;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchJson(url: string, init: RequestInit & { timeoutMs?: number }): Promise<{ status: number; body: any }> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), init.timeoutMs ?? REQ_TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...init, signal: ctrl.signal });
        const text = await res.text();
        let body: any = null;
        try { body = text ? JSON.parse(text) : null; } catch { body = text; }
        return { status: res.status, body };
    } finally {
        clearTimeout(t);
    }
}

async function getToken(): Promise<string | null> {
    if (!ESKIZ_EMAIL || !ESKIZ_PASSWORD) return null;
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

    try {
        const { status, body } = await fetchJson(`${ESKIZ_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ESKIZ_EMAIL, password: ESKIZ_PASSWORD }),
        });
        if (status >= 400) {
            console.error('[eskiz] login failed status', status, body);
            return null;
        }
        const token = body?.data?.token;
        if (!token) return null;
        cachedToken = { token, expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000 };
        return token;
    } catch (e) {
        console.error('[eskiz] login error:', e);
        return null;
    }
}

function normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('998')) return digits;
    if (digits.length === 9) return '998' + digits;
    return null;
}

async function withinDailyLimit(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await (prisma as any).notificationLog.count({
        where: {
            userId,
            channel: 'sms',
            status: 'sent',
            createdAt: { gte: since },
        },
    });
    return count < SMS_DAILY_LIMIT_PER_USER;
}

async function postSms(token: string, phone: string, message: string): Promise<{ status: number; body: any }> {
    return fetchJson(`${ESKIZ_BASE}/message/sms/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mobile_phone: phone, message, from: ESKIZ_FROM }),
    });
}

export const eskizChannel: NotificationChannel = {
    name: 'sms',
    async send(event: NotificationEvent): Promise<DeliveryResult> {
        if (!event.userId) {
            return { ok: false, skipped: true, error: 'no userId' };
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: event.userId },
                select: { phone: true },
            });
            const phone = normalizePhone(user?.phone);
            if (!phone) return { ok: false, skipped: true, error: 'invalid phone' };

            if (!(await withinDailyLimit(event.userId))) {
                return { ok: false, skipped: true, error: 'daily limit' };
            }

            const token = await getToken();
            if (!token) return { ok: false, error: 'no token' };

            const tpl = renderTemplate(event);
            const message = tpl.sms.slice(0, 160);

            let { status, body } = await postSms(token, phone, message);
            if (status === 401) {
                cachedToken = null;
                const t2 = await getToken();
                if (!t2) return { ok: false, error: 'auth retry failed' };
                ({ status, body } = await postSms(t2, phone, message));
            }
            if (status >= 400) {
                return { ok: false, error: body?.message || `sms http ${status}` };
            }
            return { ok: true, externalId: String(body?.id || body?.data?.id || '') };
        } catch (e: any) {
            return { ok: false, error: e?.message || 'sms unexpected error' };
        }
    },
};
