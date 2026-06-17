import prisma from '../../../config/database';
import { NotificationEvent } from '../notification.types';
import { renderTemplate } from '../notification.templates';
import { NotificationChannel, DeliveryResult } from './channel';

/**
 * In-app channel — writes to the existing Notification table.
 * When the recipient is a clinic, fan out to every active CLINIC_ADMIN
 * (mirroring legacy notifyClinicAdmins behaviour).
 */
export const inAppChannel: NotificationChannel = {
    name: 'inapp',
    async send(event: NotificationEvent): Promise<DeliveryResult> {
        try {
            const tpl = renderTemplate(event);
            const base = {
                type: event.type.toUpperCase(),
                title: tpl.title,
                body: tpl.body,
                data: (event as any).data || extractMeta(event),
                link: event.link,
                priority: event.priority || 'NORMAL',
            };

            if (event.userId) {
                await (prisma as any).notification.create({
                    data: { recipientUserId: event.userId, ...base },
                });
                return { ok: true };
            }

            if (event.clinicId) {
                // Resolve recipients via active ClinicMembership — the
                // legacy User.clinicId column only knows the admin's first
                // clinic, so multi-clinic admins invited via the team flow
                // would never have seen a notification for any clinic
                // except their initial one.
                const memberships = await prisma.clinicMembership.findMany({
                    where: { clinicId: event.clinicId, isActive: true },
                    select: { userId: true },
                });
                const adminIds = memberships.map(m => m.userId);

                if (adminIds.length === 0) {
                    await (prisma as any).notification.create({
                        data: { recipientClinicId: event.clinicId, ...base },
                    });
                } else {
                    await (prisma as any).notification.createMany({
                        data: adminIds.map(id => ({
                            recipientUserId: id,
                            recipientClinicId: event.clinicId,
                            ...base,
                        })),
                    });
                }
                return { ok: true };
            }

            return { ok: false, error: 'no recipient' };
        } catch (e: any) {
            return { ok: false, error: e?.message || 'inapp send failed' };
        }
    },
};

function extractMeta(event: NotificationEvent): Record<string, any> | undefined {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(event)) {
        if (k === 'type' || k === 'userId' || k === 'clinicId' || k === 'link' || k === 'priority' || k === 'forceChannels') continue;
        if (v === undefined || v === null) continue;
        out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
}
