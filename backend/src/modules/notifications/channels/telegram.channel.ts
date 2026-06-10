import { ClinicPermission } from '@prisma/client';
import prisma from '../../../config/database';
import { NotificationEvent } from '../notification.types';
import { renderTemplate } from '../notification.templates';
import { NotificationChannel, DeliveryResult } from './channel';
import { isTelegramConfigured, getBot } from '../../telegram/telegram.bot';
import { sendMessage } from '../../telegram/telegram.service';

/**
 * Pick the ClinicPermission that gates each clinic-targeted notification.
 * In the simplified 2-role world:
 *   - CLINIC_ADMIN holds all the BOOKING_ACCEPT/PAYMENT_CONFIRM_CASH perms,
 *     so it receives every operational event.
 *   - DIRECTOR only holds REPORTS_DAILY (plus VIEW perms), so it only gets
 *     the daily report — exactly what the user asked for.
 */
function requiredPermsForEvent(type: NotificationEvent['type']): ClinicPermission[] {
    switch (type) {
        case 'clinic_new_booking':           return [ClinicPermission.BOOKING_ACCEPT];
        case 'clinic_patient_checked_in':    return [ClinicPermission.BOOKING_ACCEPT];
        case 'clinic_cash_pending':          return [ClinicPermission.PAYMENT_CONFIRM_CASH];
        case 'clinic_daily_report':          return [ClinicPermission.REPORTS_DAILY];
        default:                              return []; // empty → no perm gate; everyone bound gets it
    }
}

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
            // Collect (chatId, language) pairs so each recipient gets their own
            // localised text. We render lazily inside the per-chat sender.
            const targets: { chatId: bigint; language: 'uz' | 'ru' }[] = [];

            if (event.userId) {
                const acc = await (prisma as any).telegramAccount.findUnique({
                    where: { userId: event.userId },
                    select: { chatId: true, isBlocked: true, language: true },
                });
                if (acc && !acc.isBlocked) targets.push({ chatId: acc.chatId, language: acc.language === 'ru' ? 'ru' : 'uz' });
            }

            if (event.clinicId) {
                // Resolve recipients via active ClinicMembership rather than the
                // legacy User.clinicId column so multi-account clinics work, and
                // gate by the permission appropriate for the event type so the
                // RECEPTIONIST gets new-booking pings and the CASHIER gets cash
                // pings (instead of every member spamming every event).
                const requiredPerms = requiredPermsForEvent(event.type as any);
                const memberships = await prisma.clinicMembership.findMany({
                    where: {
                        clinicId: event.clinicId,
                        isActive: true,
                        ...(requiredPerms.length > 0
                            ? { role: { permissions: { hasSome: requiredPerms } } }
                            : {}),
                    },
                    select: { userId: true },
                });
                if (memberships.length) {
                    const memberIds = memberships.map(m => m.userId);
                    const accs = await (prisma as any).telegramAccount.findMany({
                        where: { userId: { in: memberIds }, isBlocked: false },
                        select: { chatId: true, language: true },
                    });
                    for (const a of accs) targets.push({ chatId: a.chatId, language: a.language === 'ru' ? 'ru' : 'uz' });
                }
            }

            if (targets.length === 0) {
                return { ok: false, skipped: true, error: 'no telegram binding' };
            }

            // Best-effort fan out. Aggregate result: ok if at least one succeeded.
            const results = await Promise.allSettled(
                targets.map(({ chatId, language }) => {
                    const tpl = renderTemplate(event, language);
                    const text = (tpl.telegram || `*${tpl.title}*\n${tpl.body}`).slice(0, 4000);
                    return sendMessage(chatId, text, event.link);
                }),
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
