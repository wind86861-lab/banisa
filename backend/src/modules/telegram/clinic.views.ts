import { InlineKeyboard } from 'grammy';
import { ClinicPermission } from '@prisma/client';
import prisma from '../../config/database';
import { appointmentService } from '../appointments/appointment.service';

const PUBLIC_BASE = (process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'banisauzbot';
const PATIENT_TZ = 'Asia/Tashkent';

export type Lang = 'uz' | 'ru';

export interface ClinicCtx {
    userId: string;
    clinicId: string;
    membershipId: string;
    roleName: string;
    permissions: ClinicPermission[];
    lang: Lang;
}

const STATUS_LABEL: Record<string, Record<Lang, string>> = {
    PENDING:     { uz: '⏳ Kutilmoqda',      ru: '⏳ Ожидает' },
    CONFIRMED:   { uz: '✅ Qabul qilindi',  ru: '✅ Принято' },
    CHECKED_IN:  { uz: '🟢 Klinikada',       ru: '🟢 В клинике' },
    IN_PROGRESS: { uz: '🔄 Bajarilmoqda',    ru: '🔄 Выполняется' },
    COMPLETED:   { uz: '✔️ Yakunlangan',    ru: '✔️ Завершено' },
    CANCELLED:   { uz: '❌ Bekor qilingan', ru: '❌ Отменено' },
    NO_SHOW:     { uz: '🚫 Kelmagan',       ru: '🚫 Не явился' },
};

function fmtTime(d: Date | string | null | undefined, lang: Lang): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '—';
    try {
        return date.toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
            timeZone: PATIENT_TZ,
            hour: '2-digit', minute: '2-digit', hour12: false,
        });
    } catch { return date.toISOString().slice(11, 16); }
}
function fmtDate(d: Date | string | null | undefined, lang: Lang): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '—';
    try {
        return date.toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
            timeZone: PATIENT_TZ,
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
        });
    } catch { return date.toISOString().slice(0, 16).replace('T', ' '); }
}
function fmtMoney(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('uz-UZ');
}
function esc(s: string | number | null | undefined): string {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function clip(s: string, max = 60): string {
    if (!s) return '';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export interface RenderResult { text: string; keyboard: InlineKeyboard; }

// ─── Tashkent "today" window (UTC date range) ────────────────────────────────
function tashkentTodayRange(): { gte: Date; lt: Date } {
    const now = new Date();
    // Tashkent (UTC+5) → start of local day in UTC
    const tashkent = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const y = tashkent.getUTCFullYear(), m = tashkent.getUTCMonth(), d = tashkent.getUTCDate();
    const startTashkent = Date.UTC(y, m, d, 0, 0, 0);
    const startUtc = startTashkent - 5 * 60 * 60 * 1000;
    return { gte: new Date(startUtc), lt: new Date(startUtc + 24 * 60 * 60 * 1000) };
}

function permsHave(ctx: ClinicCtx, ...p: ClinicPermission[]): boolean {
    return p.some(x => ctx.permissions.includes(x));
}

// ─── Bugungi bronlar ────────────────────────────────────────────────────────
export async function renderClinicToday(ctx: ClinicCtx): Promise<RenderResult> {
    const { gte, lt } = tashkentTodayRange();
    const items = await prisma.appointment.findMany({
        where: {
            clinicId: ctx.clinicId,
            scheduledAt: { gte, lt },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 30,
        include: {
            patient: { select: { firstName: true, lastName: true } },
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
        },
    });

    if (items.length === 0) {
        return {
            text: ctx.lang === 'ru'
                ? '📋 <b>Сегодня броней нет</b>'
                : '📋 <b>Bugun bronlar yo\'q</b>',
            keyboard: new InlineKeyboard(),
        };
    }

    const header = ctx.lang === 'ru'
        ? `📋 <b>Сегодня</b> — ${items.length}\n👇 Тапните бронь для деталей`
        : `📋 <b>Bugungi bronlar</b> — ${items.length}\n👇 Tafsilot uchun bronni bosing`;

    const kb = new InlineKeyboard();
    items.forEach((appt) => {
        const time = fmtTime(appt.scheduledAt, ctx.lang);
        const name = [appt.patient?.firstName, appt.patient?.lastName].filter(Boolean).join(' ') || '—';
        const svc = appt.diagnosticService?.nameUz ?? appt.surgicalService?.nameUz ?? '';
        const status = STATUS_LABEL[appt.status]?.[ctx.lang]?.split(' ')[0] || '';
        kb.text(clip(`${status} ${time} · ${name} · ${svc}`, 60), `clinic:appt:${appt.id}`).row();
    });
    return { text: header, keyboard: kb };
}

// ─── Kutilayotgan bronlar (PENDING) ─────────────────────────────────
export async function renderClinicPending(ctx: ClinicCtx): Promise<RenderResult> {
    const items = await prisma.appointment.findMany({
        where: { clinicId: ctx.clinicId, status: 'PENDING' as any },
        orderBy: { scheduledAt: 'asc' },
        take: 30,
        include: {
            patient: { select: { firstName: true, lastName: true } },
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
        },
    });

    if (items.length === 0) {
        return {
            text: ctx.lang === 'ru'
                ? '⏳ <b>Ожидающих броней нет</b>'
                : '⏳ <b>Kutilayotgan bronlar yo\'q</b>',
            keyboard: new InlineKeyboard(),
        };
    }

    const header = ctx.lang === 'ru'
        ? `⏳ <b>Ожидающие</b> — ${items.length}\n👇 Тапните для принятия/отклонения`
        : `⏳ <b>Kutilayotgan</b> — ${items.length}\n👇 Qabul/rad uchun bronni bosing`;

    const kb = new InlineKeyboard();
    items.forEach((appt) => {
        const when = fmtDate(appt.scheduledAt, ctx.lang);
        const name = [appt.patient?.firstName, appt.patient?.lastName].filter(Boolean).join(' ') || '—';
        const svc = appt.diagnosticService?.nameUz ?? appt.surgicalService?.nameUz ?? '';
        kb.text(clip(`📅 ${when} · ${name} · ${svc}`, 60), `clinic:appt:${appt.id}`).row();
    });
    return { text: header, keyboard: kb };
}

// ─── Bron tafsilot (role-aware tugmalar) ────────────────────────────────────
export async function renderClinicBookingDetail(ctx: ClinicCtx, appointmentId: string): Promise<RenderResult | null> {
    const appt = await prisma.appointment.findFirst({
        where: { id: appointmentId, clinicId: ctx.clinicId },
        include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
            doctor: { select: { firstName: true, lastName: true } },
        },
    });
    if (!appt) return null;

    const canViewPhone = permsHave(ctx, ClinicPermission.PATIENT_CONTACT);
    const fullName = [appt.patient?.firstName, appt.patient?.lastName].filter(Boolean).join(' ') || '—';
    const svc = appt.diagnosticService?.nameUz ?? appt.surgicalService?.nameUz ?? '—';
    const status = STATUS_LABEL[appt.status]?.[ctx.lang] || appt.status;
    const doctor = [appt.doctor?.firstName, appt.doctor?.lastName].filter(Boolean).join(' ');

    const lines: string[] = [
        ctx.lang === 'ru' ? '🩺 <b>Бронь</b>' : '🩺 <b>Bron</b>',
        '',
        `<b>${esc(svc)}</b>`,
        '',
        `👤 ${esc(fullName)}`,
    ];
    if (canViewPhone && appt.patient?.phone) {
        lines.push(`📞 <code>${esc(appt.patient.phone)}</code>`);
    }
    if (doctor) lines.push(`👨‍⚕️ ${esc(doctor)}`);
    lines.push(`📆 ${esc(fmtDate(appt.scheduledAt, ctx.lang))}`);
    lines.push(`💰 ${fmtMoney(appt.price)} UZS`);
    lines.push(`${esc(status)}`);
    lines.push(`№ <code>${esc(appt.bookingNumber || appt.id.slice(0, 8))}</code>`);
    if ((appt as any).clinicNotes) lines.push(`\n📝 ${esc((appt as any).clinicNotes)}`);

    const kb = new InlineKeyboard();
    // Accept / Reschedule for PENDING
    if (appt.status === 'PENDING' && permsHave(ctx, ClinicPermission.BOOKING_ACCEPT)) {
        kb.text(ctx.lang === 'ru' ? '✅ Принять' : '✅ Qabul qilish', `clinic:accept:${appt.id}`);
    }
    if (['PENDING', 'CONFIRMED'].includes(appt.status as any)
        && permsHave(ctx, ClinicPermission.BOOKING_RESCHEDULE)) {
        kb.text(ctx.lang === 'ru' ? '🔁 Перенести' : '🔁 Ko\'chirish', `clinic:resched:${appt.id}`);
    }
    if (appt.status === 'PENDING' && permsHave(ctx, ClinicPermission.BOOKING_REJECT)) {
        kb.text(ctx.lang === 'ru' ? '❌ Отклонить' : '❌ Rad qilish', `clinic:reject:${appt.id}`);
    }
    if (kb.inline_keyboard.length > 0) kb.row();

    // Cash confirm path
    if (['CHECKED_IN', 'IN_PROGRESS'].includes(appt.status as any)
        && (appt as any).paymentStatus !== 'PAID'
        && permsHave(ctx, ClinicPermission.PAYMENT_CONFIRM_CASH)) {
        kb.text(ctx.lang === 'ru' ? '💵 Наличные приняты' : '💵 Naqd qabul', `clinic:cash:${appt.id}:confirm`).row();
    }

    if (canViewPhone && appt.patient?.phone) {
        kb.url(ctx.lang === 'ru' ? '📞 Позвонить' : '📞 Qo\'ng\'iroq', `tel:${appt.patient.phone}`).row();
    }
    kb.text(ctx.lang === 'ru' ? '⬅️ Назад' : '⬅️ Orqaga', 'clinic:today');

    return { text: lines.join('\n'), keyboard: kb };
}

// ─── Kassa navbati ──────────────────────────────────────────────────────────
export async function renderCashierQueue(ctx: ClinicCtx): Promise<RenderResult> {
    const items = await prisma.appointment.findMany({
        where: {
            clinicId: ctx.clinicId,
            status: { in: ['CHECKED_IN', 'IN_PROGRESS'] as any },
            NOT: { paymentStatus: 'PAID' as any },
        },
        orderBy: { updatedAt: 'asc' },
        take: 20,
        include: {
            patient: { select: { firstName: true, lastName: true } },
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
        },
    });

    if (items.length === 0) {
        return {
            text: ctx.lang === 'ru'
                ? '💵 <b>Касса пуста</b>'
                : '💵 <b>Kassa navbati bo\'sh</b>',
            keyboard: new InlineKeyboard(),
        };
    }

    const total = items.reduce((s, i) => s + (i.price || 0), 0);
    const header = ctx.lang === 'ru'
        ? `💵 <b>Касса</b> — ${items.length} (${fmtMoney(total)} UZS)\n👇 Тапните для подтверждения`
        : `💵 <b>Kassa</b> — ${items.length} ta (${fmtMoney(total)} UZS)\n👇 Tasdiqlash uchun bosing`;

    const kb = new InlineKeyboard();
    items.forEach((appt) => {
        const name = [appt.patient?.firstName, appt.patient?.lastName].filter(Boolean).join(' ') || '—';
        const svc = appt.diagnosticService?.nameUz ?? appt.surgicalService?.nameUz ?? '';
        kb.text(clip(`💵 ${fmtMoney(appt.price)} · ${name} · ${svc}`, 60), `clinic:appt:${appt.id}`).row();
    });
    return { text: header, keyboard: kb };
}

// ─── Kunlik hisobot ─────────────────────────────────────────────────────────
export async function renderClinicReport(ctx: ClinicCtx): Promise<RenderResult> {
    const { gte, lt } = tashkentTodayRange();
    const [total, completed, cancelled, paidAgg, pending] = await Promise.all([
        prisma.appointment.count({ where: { clinicId: ctx.clinicId, scheduledAt: { gte, lt } } }),
        prisma.appointment.count({ where: { clinicId: ctx.clinicId, scheduledAt: { gte, lt }, status: 'COMPLETED' as any } }),
        prisma.appointment.count({ where: { clinicId: ctx.clinicId, scheduledAt: { gte, lt }, status: 'CANCELLED' as any } }),
        prisma.appointment.aggregate({
            where: { clinicId: ctx.clinicId, scheduledAt: { gte, lt }, paymentStatus: 'PAID' as any },
            _sum: { paidAmount: true, price: true },
            _count: true,
        }),
        prisma.appointment.count({ where: { clinicId: ctx.clinicId, status: 'PENDING' as any } }),
    ]);

    const revenue = (paidAgg as any)._sum?.paidAmount ?? (paidAgg as any)._sum?.price ?? 0;
    const checkedInOrDone = total - cancelled;
    const noShowRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    const text = ctx.lang === 'ru'
        ? `📊 <b>Отчёт за сегодня</b>\n\n` +
          `📅 Всего: <b>${total}</b>\n` +
          `✔️ Завершено: <b>${completed}</b>\n` +
          `❌ Отменено: <b>${cancelled}</b> (${noShowRate}%)\n` +
          `💰 Выручка: <b>${fmtMoney(revenue)} UZS</b> (${(paidAgg as any)._count} оплат)\n\n` +
          `⏳ Ожидают подтверждения: <b>${pending}</b>`
        : `📊 <b>Bugungi hisobot</b>\n\n` +
          `📅 Jami bronlar: <b>${total}</b>\n` +
          `✔️ Yakunlangan: <b>${completed}</b>\n` +
          `❌ Bekor qilingan: <b>${cancelled}</b> (${noShowRate}%)\n` +
          `💰 Daromad: <b>${fmtMoney(revenue)} UZS</b> (${(paidAgg as any)._count} to'lov)\n\n` +
          `⏳ Tasdiqlash kutilmoqda: <b>${pending}</b>`;

    const kb = new InlineKeyboard();
    if (permsHave(ctx, ClinicPermission.REPORTS_EXPORT)) {
        kb.url(
            ctx.lang === 'ru' ? '📥 Подробный отчёт' : '📥 Batafsil hisobot',
            `https://t.me/${BOT_USERNAME}?startapp=clinic-reports`,
        ).row();
    }
    kb.text(ctx.lang === 'ru' ? '🔄 Обновить' : '🔄 Yangilash', 'clinic:report');
    return { text, keyboard: kb };
}

// ─── Jamoa ───────────────────────────────────────────────────────────────────
export async function renderClinicTeam(ctx: ClinicCtx): Promise<RenderResult> {
    const members = await prisma.clinicMembership.findMany({
        where: { clinicId: ctx.clinicId, isActive: true },
        include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
            role: { select: { name: true } },
        },
        orderBy: { joinedAt: 'asc' },
    });
    const lines = [
        ctx.lang === 'ru' ? `👥 <b>Команда</b> — ${members.length}` : `👥 <b>Jamoa</b> — ${members.length} a'zo`,
        '',
    ];
    for (const m of members) {
        const name = [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || '—';
        lines.push(`• <b>${esc(name)}</b> — ${esc(m.role.name)}`);
        if (permsHave(ctx, ClinicPermission.PATIENT_CONTACT)) {
            lines.push(`  📞 <code>${esc(m.user.phone)}</code>`);
        }
    }
    const kb = new InlineKeyboard().url(
        ctx.lang === 'ru' ? '🛠 Управлять' : '🛠 Boshqarish',
        `https://t.me/${BOT_USERNAME}?startapp=clinic-team`,
    );
    return { text: lines.join('\n'), keyboard: kb };
}

// ─── Aksiyalar — wrap appointment.service so the bot can call them ──────────
export async function tryClinicAccept(ctx: ClinicCtx, appointmentId: string): Promise<{ ok: boolean; error?: string }> {
    try {
        await appointmentService.clinicAccept(
            { userId: ctx.userId, role: 'CLINIC', name: ctx.roleName },
            ctx.clinicId,
            appointmentId,
        );
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Xato' };
    }
}

export async function tryClinicReject(ctx: ClinicCtx, appointmentId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
    try {
        // The service exposes reschedule (lifecycle's official "no" path);
        // we mark CANCELLED with cancelledBy=CLINIC instead.
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId: ctx.clinicId },
        });
        if (!appt) return { ok: false, error: 'not_found' };
        if (appt.status !== 'PENDING') return { ok: false, error: 'wrong_status' };
        await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'CANCELLED' as any,
                cancelledAt: new Date(),
                cancelledBy: 'CLINIC' as any,
                cancellationReason: reason,
            } as any,
        });
        await prisma.clinicAuditLog.create({
            data: {
                clinicId: ctx.clinicId, actorId: ctx.userId,
                action: 'booking.reject', targetType: 'appointment', targetId: appointmentId,
                metadata: { reason },
            },
        });
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Xato' };
    }
}

export async function tryClinicCashConfirm(ctx: ClinicCtx, appointmentId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
    try {
        await appointmentService.clinicConfirmCash(
            { userId: ctx.userId, role: 'CLINIC', name: ctx.roleName },
            ctx.clinicId,
            appointmentId,
            { amount },
        );
        await prisma.clinicAuditLog.create({
            data: {
                clinicId: ctx.clinicId, actorId: ctx.userId,
                action: 'payment.confirm_cash', targetType: 'appointment', targetId: appointmentId,
                metadata: { amount },
            },
        });
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Xato' };
    }
}
