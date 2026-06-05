import prisma from '../../../config/database';
import { NotificationEvent } from '../notification.types';
import { renderTemplate } from '../notification.templates';
import { NotificationChannel, DeliveryResult } from './channel';
import { isTelegramConfigured, getBot } from '../../telegram/telegram.bot';
import { sendMessage } from '../../telegram/telegram.service';

/**
 * Send the rendered telegram body to every TelegramAccount bound to the
 * recipient. For clinic-targeted events, fan out to every active CLINIC_ADMIN
 * with a linked Telegram account. Skipped (not failed) when nobody is bound.
 */
export const telegramChannel: NotificationChannel = {
    name: 'telegram',
    async send(event: NotificationEvent): Promise<DeliveryResult> {
        if (!isTelegramConfigured() || !getBot()) {
            return { ok: false, skipped: true, error: 'bot not configured' };
        }

        try {
            const tpl = renderTemplate(event);
            const text = (tpl.telegram || `*${tpl.title}*\n${tpl.body}`).slice(0, 4000);

            // Collect recipient chat ids.
            const chatIds: bigint[] = [];

            if (event.userId) {
                const acc = await (prisma as any).telegramAccount.findUnique({
                    where: { userId: event.userId },
                    select: { chatId: true, isBlocked: true },
                });
                if (acc && !acc.isBlocked) chatIds.push(acc.chatId);
            }

            if (event.clinicId) {
                const admins = await prisma.user.findMany({
                    where: {
                        clinicId: event.clinicId,
                        role: { in: ['CLINIC_ADMIN', 'PENDING_CLINIC'] },
                        isActive: true,
                    },
                    select: { id: true },
                });
                if (admins.length) {
                    const adminIds = admins.map(a => a.id);
                    const accs = await (prisma as any).telegramAccount.findMany({
                        where: { userId: { in: adminIds }, isBlocked: false },
                        select: { chatId: true },
                    });
                    for (const a of accs) chatIds.push(a.chatId);
                }
            }

            if (chatIds.length === 0) {
                return { ok: false, skipped: true, error: 'no telegram binding' };
            }

            // Best-effort fan out. Aggregate result: ok if at least one succeeded.
            const results = await Promise.allSettled(
                chatIds.map(id => sendMessage(id, text, event.link)),
            );
            const anyOk = results.some(r => r.status === 'fulfilled' && (r.value as any).ok);
            if (anyOk) {
                const firstOk = results.find(r => r.status === 'fulfilled' && (r.value as any).ok);
                const externalId = firstOk && firstOk.status === 'fulfilled' ? String((firstOk.value as any).messageId || '') : '';
                return { ok: true, externalId };
            }
            const firstErr = results.find(r => r.status === 'fulfilled' && !(r.value as any).ok);
            const errMsg = firstErr && firstErr.status === 'fulfilled' ? (firstErr.value as any).error : 'all sends failed';
            return { ok: false, error: errMsg };
        } catch (e: any) {
            return { ok: false, error: e?.message || 'telegram unexpected error' };
        }
    },
};
