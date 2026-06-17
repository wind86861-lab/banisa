import { ClinicPermission } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { sendMessage } from '../../telegram/telegram.service';

const BCRYPT_ROUNDS = 12;

function normalizePhone(raw: string | undefined): string | null {
    if (!raw) return null;
    let s = String(raw).trim().replace(/[\s\-()]/g, '');
    if (!s) return null;
    if (!s.startsWith('+')) {
        if (/^\d{9,15}$/.test(s)) s = '+' + s;
    }
    if (!/^\+\d{9,15}$/.test(s)) return null;
    return s;
}

export interface TeamMemberDTO {
    membershipId: string;
    userId: string;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    joinedAt: Date;
    lastSeenAt: Date | null;
    role: { id: string; name: string; isSystem: boolean; permissions: ClinicPermission[] };
    /** True when the member has a non-blocked TelegramAccount row. */
    telegramBound: boolean;
    /** Last time the bot saw this user — useful to spot dead bindings. */
    telegramLastSeen: Date | null;
}

export const teamService = {
    /**
     * List all roles defined on the clinic. System roles are returned with
     * isSystem=true so the UI can mark them read-only.
     */
    async listRoles(clinicId: string) {
        // Hide legacy roles (OWNER-LEGACY, MANAGER-LEGACY, CASHIER-LEGACY, …)
        // from every dropdown. The 20260610190000 migration renamed the
        // pre-simplification roles with a -LEGACY suffix and flipped
        // isSystem to false so the UI would stop offering them; the row
        // itself stays around because AppointmentLog/ClinicAuditLog
        // entries reference it by name. Filter on isSystem=true here
        // (DIRECTOR + CLINIC_ADMIN are the only seeded system roles in
        // the new 2-role world).
        return prisma.clinicRole.findMany({
            where: { clinicId, isSystem: true },
            orderBy: [{ name: 'asc' }],
            select: {
                id: true, name: true, description: true,
                permissions: true, isSystem: true,
            },
        });
    },

    async listMembers(clinicId: string): Promise<TeamMemberDTO[]> {
        const rows = await prisma.clinicMembership.findMany({
            where: { clinicId },
            orderBy: [{ isActive: 'desc' }, { joinedAt: 'asc' }],
            include: {
                user: {
                    select: {
                        id: true, phone: true, firstName: true, lastName: true,
                        telegramAccount: { select: { isBlocked: true, lastSeenAt: true } },
                    },
                },
                role: { select: { id: true, name: true, isSystem: true, permissions: true } },
            },
        });
        return rows.map(r => {
            const tg = r.user.telegramAccount;
            return {
                membershipId: r.id,
                userId: r.user.id,
                phone: r.user.phone,
                firstName: r.user.firstName,
                lastName: r.user.lastName,
                isActive: r.isActive,
                joinedAt: r.joinedAt,
                lastSeenAt: r.lastSeenAt,
                role: r.role,
                telegramBound: !!tg && !tg.isBlocked,
                telegramLastSeen: tg?.lastSeenAt ?? null,
            };
        });
    },

    /**
     * Generate a fresh `t.me/<bot>?start=<token>` deep link for a specific
     * member so the inviter can paste it into any channel (SMS, WhatsApp,
     * email) and the member binds with one tap. Reuses the existing
     * TelegramLoginToken model so the bot's /start handler picks it up via
     * the same code path that web "Link Telegram" uses.
     */
    async generateBindLinkFor(input: {
        clinicId: string;
        actorId: string;
        userId: string;
    }): Promise<{ deepLink: string; expiresAt: Date }> {
        // Make sure the target is actually a member of this clinic.
        const membership = await prisma.clinicMembership.findUnique({
            where: { clinicId_userId: { clinicId: input.clinicId, userId: input.userId } },
        });
        if (!membership) throw new AppError('A\'zo topilmadi', 404, ErrorCodes.NOT_FOUND);

        // Lazy import to avoid pulling the bot module into the team controller
        // request path; the bot lives in a sibling module.
        const { createLinkToken } = await import('../../telegram/telegram.service');
        const info = await createLinkToken(input.userId);
        if (!info) throw new AppError('Bot URL hozircha mavjud emas', 503, ErrorCodes.SERVER_ERROR);

        await this.audit(input.clinicId, input.actorId, 'team.bot_link_generated', 'user', input.userId, {});
        return { deepLink: info.deepLink, expiresAt: info.expiresAt };
    },

    /**
     * Invite by phone. If a User with that phone already exists we add them
     * directly; otherwise we create a minimal CLINIC_ADMIN user with a random
     * password and try to push the bot link so they can take it from there.
     */
    async invite(input: {
        clinicId: string;
        invitedBy: string;
        phone: string;
        roleId: string;
        firstName?: string;
        lastName?: string;
    }): Promise<TeamMemberDTO> {
        const phone = normalizePhone(input.phone);
        if (!phone) throw new AppError('Telefon raqami noto\'g\'ri', 400, ErrorCodes.VALIDATION_ERROR);

        const role = await prisma.clinicRole.findFirst({
            where: { id: input.roleId, clinicId: input.clinicId },
        });
        if (!role) throw new AppError('Rol topilmadi', 404, ErrorCodes.NOT_FOUND);

        // Find or create the user. If creating, the password is random — the
        // invitee can reset it via /user/forgot-password (or via the bot once
        // they bind it).
        let user = await prisma.user.findUnique({
            where: { phone },
            select: { id: true, role: true, isActive: true },
        });
        if (!user) {
            const passwordHash = await bcrypt.hash(randomBytes(24).toString('base64url'), BCRYPT_ROUNDS);
            user = await prisma.user.create({
                data: {
                    phone,
                    passwordHash,
                    firstName: input.firstName || null,
                    lastName: input.lastName || null,
                    role: 'CLINIC_ADMIN' as any,
                    status: 'APPROVED' as any,
                    isActive: true,
                    clinicId: input.clinicId, // default clinic — first one they joined
                },
                select: { id: true, role: true, isActive: true },
            });
        }

        // Reactivate existing membership if any; otherwise create.
        const existing = await prisma.clinicMembership.findUnique({
            where: { clinicId_userId: { clinicId: input.clinicId, userId: user.id } },
        });
        const membership = existing
            ? await prisma.clinicMembership.update({
                where: { id: existing.id },
                data: { isActive: true, roleId: input.roleId, invitedBy: input.invitedBy },
                include: {
                    user: { select: { id: true, phone: true, firstName: true, lastName: true } },
                    role: { select: { id: true, name: true, isSystem: true, permissions: true } },
                },
            })
            : await prisma.clinicMembership.create({
                data: {
                    clinicId: input.clinicId,
                    userId: user.id,
                    roleId: input.roleId,
                    invitedBy: input.invitedBy,
                },
                include: {
                    user: { select: { id: true, phone: true, firstName: true, lastName: true } },
                    role: { select: { id: true, name: true, isSystem: true, permissions: true } },
                },
            });

        await this.audit(input.clinicId, input.invitedBy, 'team.invite', 'user', user.id, {
            phone, roleId: input.roleId, roleName: role.name,
        });

        // Best-effort bot ping: nudges the invitee to join.
        try {
            const tg = await prisma.telegramAccount.findUnique({
                where: { userId: user.id },
                select: { chatId: true, isBlocked: true },
            });
            if (tg && !tg.isBlocked) {
                await sendMessage(
                    tg.chatId,
                    `🎉 <b>Klinikaga taklif</b>\n\nSizni klinikaga "<b>${role.name}</b>" sifatida qo'shdik. Bot menyusidan klinika bo'limini ko'rishingiz mumkin.`,
                );
            }
        } catch { /* non-fatal */ }

        const tg = await prisma.telegramAccount.findUnique({
            where: { userId: membership.user.id },
            select: { isBlocked: true, lastSeenAt: true },
        });
        return {
            membershipId: membership.id,
            userId: membership.user.id,
            phone: membership.user.phone,
            firstName: membership.user.firstName,
            lastName: membership.user.lastName,
            isActive: membership.isActive,
            joinedAt: membership.joinedAt,
            lastSeenAt: membership.lastSeenAt,
            role: membership.role,
            telegramBound: !!tg && !tg.isBlocked,
            telegramLastSeen: tg?.lastSeenAt ?? null,
        };
    },

    async changeRole(input: {
        clinicId: string;
        actorId: string;
        userId: string;
        roleId: string;
    }) {
        const role = await prisma.clinicRole.findFirst({
            where: { id: input.roleId, clinicId: input.clinicId },
        });
        if (!role) throw new AppError('Rol topilmadi', 404, ErrorCodes.NOT_FOUND);

        const membership = await prisma.clinicMembership.findUnique({
            where: { clinicId_userId: { clinicId: input.clinicId, userId: input.userId } },
            include: { role: { select: { name: true } } },
        });
        if (!membership) throw new AppError('A\'zo topilmadi', 404, ErrorCodes.NOT_FOUND);

        // Last OWNER guard: don't let the only OWNER demote themself.
        if (membership.role.name === 'OWNER' && role.name !== 'OWNER') {
            const otherOwners = await prisma.clinicMembership.count({
                where: {
                    clinicId: input.clinicId,
                    isActive: true,
                    role: { name: 'OWNER' },
                    NOT: { id: membership.id },
                },
            });
            if (otherOwners === 0) {
                throw new AppError(
                    'Klinikada kamida bitta OWNER bo\'lishi kerak',
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                );
            }
        }

        await prisma.clinicMembership.update({
            where: { id: membership.id },
            data: { roleId: input.roleId },
        });

        await this.audit(input.clinicId, input.actorId, 'team.role_change', 'user', input.userId, {
            from: membership.role.name, to: role.name,
        });
    },

    async remove(input: { clinicId: string; actorId: string; userId: string }) {
        if (input.userId === input.actorId) {
            throw new AppError(
                'O\'zingizni o\'chirib bo\'lmaydi — "Chiqib ketish" tugmasini ishlating',
                400,
                ErrorCodes.VALIDATION_ERROR,
            );
        }
        const membership = await prisma.clinicMembership.findUnique({
            where: { clinicId_userId: { clinicId: input.clinicId, userId: input.userId } },
            include: { role: { select: { name: true } } },
        });
        if (!membership) throw new AppError('A\'zo topilmadi', 404, ErrorCodes.NOT_FOUND);

        if (membership.role.name === 'OWNER') {
            const otherOwners = await prisma.clinicMembership.count({
                where: {
                    clinicId: input.clinicId,
                    isActive: true,
                    role: { name: 'OWNER' },
                    NOT: { id: membership.id },
                },
            });
            if (otherOwners === 0) {
                throw new AppError(
                    'Klinikada kamida bitta OWNER bo\'lishi kerak',
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                );
            }
        }

        await prisma.clinicMembership.update({
            where: { id: membership.id },
            data: { isActive: false },
        });
        await this.audit(input.clinicId, input.actorId, 'team.remove', 'user', input.userId, {
            roleName: membership.role.name,
        });
    },

    async leave(input: { clinicId: string; userId: string }) {
        const membership = await prisma.clinicMembership.findUnique({
            where: { clinicId_userId: { clinicId: input.clinicId, userId: input.userId } },
            include: { role: { select: { name: true } } },
        });
        if (!membership) throw new AppError('A\'zo topilmadi', 404, ErrorCodes.NOT_FOUND);

        if (membership.role.name === 'OWNER') {
            const otherOwners = await prisma.clinicMembership.count({
                where: {
                    clinicId: input.clinicId,
                    isActive: true,
                    role: { name: 'OWNER' },
                    NOT: { id: membership.id },
                },
            });
            if (otherOwners === 0) {
                throw new AppError(
                    'Oxirgi OWNER chiqib keta olmaydi. Avval boshqa a\'zoga OWNER bering.',
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                );
            }
        }

        await prisma.clinicMembership.update({
            where: { id: membership.id },
            data: { isActive: false },
        });
        await this.audit(input.clinicId, input.userId, 'team.leave', 'user', input.userId, {
            roleName: membership.role.name,
        });
    },

    /**
     * Centralised audit-log writer. Errors are swallowed so an audit failure
     * never breaks the user-facing action.
     */
    async audit(
        clinicId: string,
        actorId: string | null,
        action: string,
        targetType: string,
        targetId: string,
        metadata?: Record<string, any>,
    ) {
        try {
            await prisma.clinicAuditLog.create({
                data: { clinicId, actorId, action, targetType, targetId, metadata },
            });
        } catch (e) {
            console.error('[clinic-audit] failed to write', action, e);
        }
    },
};
