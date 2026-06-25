import { InlineKeyboard } from 'grammy';
import { ClinicPermission } from '@prisma/client';
import prisma from '../../config/database';
import { appointmentService } from '../appointments/appointment.service';
import { ClinicCtx } from './clinic.views';

const PATIENT_TZ = 'Asia/Tashkent';

function esc(s: string | null | undefined): string {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmtMoney(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('uz-UZ');
}
function fmtDate(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '—';
    try {
        return date.toLocaleString('uz-UZ', {
            timeZone: PATIENT_TZ,
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
        });
    } catch { return date.toISOString().slice(0, 16).replace('T', ' '); }
}
function clip(s: string, max = 60): string {
    if (!s) return '';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
function normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let s = String(raw).trim().replace(/[\s\-()]/g, '');
    if (!s) return null;
    if (!s.startsWith('+')) {
        if (/^\d{9,15}$/.test(s)) s = '+' + s;
    }
    return /^\+\d{9,15}$/.test(s) ? s : null;
}

export interface WizardState {
    kind: 'search' | 'reschedule' | 'booking' | 'skory' | null;
    data?: any;
}

export async function getWizardState(chatId: number): Promise<WizardState> {
    const acc = await (prisma as any).telegramAccount.findUnique({
        where: { chatId: BigInt(chatId) },
        select: { wizardState: true },
    });
    return (acc?.wizardState as WizardState) || { kind: null };
}
export async function setWizardState(chatId: number, state: WizardState | null) {
    await (prisma as any).telegramAccount.update({
        where: { chatId: BigInt(chatId) },
        data: { wizardState: state },
    });
}

// ─── Patient search ─────────────────────────────────────────────────────────
export async function promptPatientSearch(ctx: ClinicCtx): Promise<{ text: string; keyboard: InlineKeyboard }> {
    return {
        text: ctx.lang === 'ru'
            ? '🔍 <b>Поиск пациента</b>\n\nВведите номер телефона или имя:'
            : '🔍 <b>Bemor qidirish</b>\n\nTelefon raqami yoki ismni kiriting:',
        keyboard: new InlineKeyboard().text(
            ctx.lang === 'ru' ? '↩️ Отмена' : '↩️ Bekor',
            'clinic:wizard:cancel',
        ),
    };
}

export async function runPatientSearch(ctx: ClinicCtx, query: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
    const q = query.trim();
    if (q.length < 3) {
        return {
            text: ctx.lang === 'ru' ? '❌ Минимум 3 символа' : '❌ Kamida 3 ta belgi',
            keyboard: new InlineKeyboard().text(
                ctx.lang === 'ru' ? '↩️ Отмена' : '↩️ Bekor',
                'clinic:wizard:cancel',
            ),
        };
    }
    const phone = normalizePhone(q);
    // Patient search scope: any user with a booking in THIS clinic. Avoids
    // exposing patients from clinics the operator doesn't belong to.
    const where = phone
        ? { phone, role: 'PATIENT' as any }
        : {
            role: 'PATIENT' as any,
            OR: [
                { firstName: { contains: q, mode: 'insensitive' as any } },
                { lastName: { contains: q, mode: 'insensitive' as any } },
            ],
            appointments: { some: { clinicId: ctx.clinicId } },
        };
    const patients = await prisma.user.findMany({
        where: where as any,
        take: 10,
        orderBy: { firstName: 'asc' },
        select: {
            id: true, firstName: true, lastName: true, phone: true,
            _count: { select: { appointments: { where: { clinicId: ctx.clinicId } } } },
        },
    });
    if (patients.length === 0) {
        return {
            text: ctx.lang === 'ru'
                ? `🔍 По запросу «${esc(q)}» ничего не найдено`
                : `🔍 «${esc(q)}» bo'yicha hech narsa topilmadi`,
            keyboard: new InlineKeyboard().text(
                ctx.lang === 'ru' ? '🔍 Новый поиск' : '🔍 Yangi qidiruv',
                'clinic:search',
            ).text(
                ctx.lang === 'ru' ? '↩️ Отмена' : '↩️ Bekor',
                'clinic:wizard:cancel',
            ),
        };
    }
    const header = ctx.lang === 'ru'
        ? `🔍 <b>Найдено</b> — ${patients.length}\n👇 Тапните для профиля`
        : `🔍 <b>Topildi</b> — ${patients.length} ta\n👇 Profil uchun bosing`;
    const kb = new InlineKeyboard();
    for (const p of patients) {
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
        const visits = (p as any)._count?.appointments ?? 0;
        kb.text(
            clip(`👤 ${fullName} · ${p.phone} · ${visits} ta bron`, 60),
            `clinic:patient:${p.id}`,
        ).row();
    }
    return { text: header, keyboard: kb };
}

export async function renderPatientProfile(ctx: ClinicCtx, patientId: string): Promise<{ text: string; keyboard: InlineKeyboard } | null> {
    const canViewPhone = ctx.permissions.includes(ClinicPermission.PATIENT_CONTACT);
    const user = await prisma.user.findUnique({
        where: { id: patientId },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, createdAt: true },
    });
    if (!user) return null;
    const recent = await prisma.appointment.findMany({
        where: { patientId, clinicId: ctx.clinicId },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        include: {
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
        },
    });
    const totals = await prisma.appointment.aggregate({
        where: { patientId, clinicId: ctx.clinicId, paymentStatus: 'PAID' as any },
        _sum: { paidAmount: true, price: true },
        _count: true,
    });
    const totalPaid = (totals as any)._sum?.paidAmount ?? (totals as any)._sum?.price ?? 0;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

    const lines: string[] = [
        ctx.lang === 'ru' ? '👤 <b>Профиль пациента</b>' : '👤 <b>Bemor profili</b>',
        '',
        `<b>${esc(fullName)}</b>`,
    ];
    if (canViewPhone) lines.push(`📞 <code>${esc(user.phone)}</code>`);
    if (canViewPhone && user.email) lines.push(`📧 ${esc(user.email)}`);
    lines.push(`📅 ${ctx.lang === 'ru' ? 'С нами с' : 'Bizda'}: ${fmtDate(user.createdAt)}`);
    lines.push(`💰 ${ctx.lang === 'ru' ? 'Всего оплачено' : 'Jami to\'langan'}: <b>${fmtMoney(totalPaid)} UZS</b> (${(totals as any)._count} ${ctx.lang === 'ru' ? 'визитов' : 'bron'})`);
    if (recent.length > 0) {
        lines.push('');
        lines.push(`<b>${ctx.lang === 'ru' ? 'Последние брони' : 'So\'nggi bronlar'}:</b>`);
        for (const a of recent) {
            const svc = a.diagnosticService?.nameUz ?? a.surgicalService?.nameUz ?? '—';
            lines.push(`• ${fmtDate(a.scheduledAt)} — ${esc(svc)}`);
        }
    }
    const kb = new InlineKeyboard();
    if (canViewPhone) {
        kb.url(ctx.lang === 'ru' ? '📞 Позвонить' : '📞 Qo\'ng\'iroq', `tel:${user.phone}`).row();
    }
    kb.text(ctx.lang === 'ru' ? '🔍 Новый поиск' : '🔍 Yangi qidiruv', 'clinic:search');
    return { text: lines.join('\n'), keyboard: kb };
}

// ─── Reschedule wizard ──────────────────────────────────────────────────────
export async function promptReschedule(ctx: ClinicCtx, appointmentId: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
    return {
        text: ctx.lang === 'ru'
            ? '🔁 <b>Перенос брони</b>\n\nВведите новую дату и время в формате:\n<code>DD.MM HH:MM</code>\n\nПример: <code>15.06 14:30</code>'
            : '🔁 <b>Bronni ko\'chirish</b>\n\nYangi sana va vaqtni quyidagi formatda kiriting:\n<code>DD.MM HH:MM</code>\n\nMisol: <code>15.06 14:30</code>',
        keyboard: new InlineKeyboard().text(
            ctx.lang === 'ru' ? '↩️ Отмена' : '↩️ Bekor',
            `clinic:appt:${appointmentId}`,
        ),
    };
}

/**
 * Parse "DD.MM HH:MM" (Asia/Tashkent) into a UTC Date. Year defaults to the
 * current year, rolling forward to next year if the resulting date is more
 * than 30 days in the past — covers the "December 30 → January 2" wrap.
 */
function parseLocalDateTime(input: string): Date | null {
    const m = input.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\s+(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const [, dStr, monStr, yearStr, hStr, mStr] = m;
    const d = parseInt(dStr, 10);
    const mon = parseInt(monStr, 10) - 1;
    const h = parseInt(hStr, 10);
    const mi = parseInt(mStr, 10);
    let year = yearStr ? parseInt(yearStr.length === 2 ? `20${yearStr}` : yearStr, 10) : new Date().getUTCFullYear();
    if (d < 1 || d > 31 || mon < 0 || mon > 11 || h < 0 || h > 23 || mi < 0 || mi > 59) return null;
    // Build Tashkent-local then convert to UTC by subtracting 5h.
    const tashkentUtcMs = Date.UTC(year, mon, d, h, mi, 0);
    let utcMs = tashkentUtcMs - 5 * 60 * 60 * 1000;
    if (utcMs < Date.now() - 30 * 24 * 60 * 60 * 1000) {
        year += 1;
        utcMs = Date.UTC(year, mon, d, h, mi, 0) - 5 * 60 * 60 * 1000;
    }
    return new Date(utcMs);
}

export async function runReschedule(ctx: ClinicCtx, appointmentId: string, dateText: string): Promise<{ ok: boolean; error?: string; newAt?: Date }> {
    const newAt = parseLocalDateTime(dateText);
    if (!newAt) return { ok: false, error: 'Format noto\'g\'ri. Misol: 15.06 14:30' };
    if (newAt.getTime() < Date.now() + 30 * 60 * 1000) return { ok: false, error: 'Vaqt o\'tmishda yoki juda yaqin' };
    try {
        await appointmentService.clinicReschedule(
            { userId: ctx.userId, role: 'CLINIC', name: ctx.roleName },
            ctx.clinicId,
            appointmentId,
            newAt.toISOString(),
            'Klinika tomonidan ko\'chirildi',
        );
        await prisma.clinicAuditLog.create({
            data: {
                clinicId: ctx.clinicId, actorId: ctx.userId,
                action: 'booking.reschedule', targetType: 'appointment', targetId: appointmentId,
                metadata: { newScheduledAt: newAt.toISOString() },
            },
        });
        return { ok: true, newAt };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Xato' };
    }
}

// ─── New booking wizard (5 steps) ───────────────────────────────────────────
//
// State shape:
//   { kind: 'booking', data: { step, patientId?, serviceType?, serviceId?,
//                              doctorId?, scheduledAt?, } }

export async function startBookingWizard(ctx: ClinicCtx): Promise<{ text: string; keyboard: InlineKeyboard }> {
    return {
        text: ctx.lang === 'ru'
            ? '➕ <b>Новая бронь</b>\n\nШаг 1/4: Введите телефон пациента в формате <code>+998XXXXXXXXX</code>'
            : '➕ <b>Yangi bron</b>\n\n1-qadam: Bemor telefon raqamini <code>+998XXXXXXXXX</code> formatida kiriting',
        keyboard: new InlineKeyboard().text(
            ctx.lang === 'ru' ? '↩️ Отмена' : '↩️ Bekor',
            'clinic:wizard:cancel',
        ),
    };
}

export async function bookingStep1Phone(ctx: ClinicCtx, phoneText: string): Promise<{ next: 'service' | null; text: string; keyboard: InlineKeyboard; data?: any }> {
    const phone = normalizePhone(phoneText);
    if (!phone) {
        return {
            next: null,
            text: '❌ Telefon raqami noto\'g\'ri. Misol: +998901234567',
            keyboard: new InlineKeyboard().text('↩️ Bekor', 'clinic:wizard:cancel'),
        };
    }
    let user = await prisma.user.findUnique({ where: { phone }, select: { id: true, firstName: true, role: true } });
    if (!user) {
        // Create a stub patient. Receptionist can fill name later via search.
        user = await prisma.user.create({
            data: {
                phone,
                passwordHash: '!disabled!',
                role: 'PATIENT' as any,
                status: 'APPROVED' as any,
                isActive: true,
            },
            select: { id: true, firstName: true, role: true },
        });
    }
    // Step 2: service type
    const kb = new InlineKeyboard()
        .text('🩺 Diagnostika', 'clinic:book:type:DIAGNOSTIC').row()
        .text('🔪 Operatsiya', 'clinic:book:type:SURGICAL').row()
        .text('↩️ Bekor', 'clinic:wizard:cancel');
    return {
        next: 'service',
        text: `✓ Bemor: <b>${esc(user.firstName || phone)}</b>\n\n2-qadam: Xizmat turini tanlang`,
        keyboard: kb,
        data: { patientId: user.id, phone },
    };
}

export async function bookingStep2Services(ctx: ClinicCtx, serviceType: 'DIAGNOSTIC' | 'SURGICAL'): Promise<{ text: string; keyboard: InlineKeyboard }> {
    if (serviceType === 'DIAGNOSTIC') {
        const links = await prisma.clinicDiagnosticService.findMany({
            where: { clinicId: ctx.clinicId, isActive: true },
            take: 20,
            include: {
                diagnosticService: { select: { id: true, nameUz: true, priceRecommended: true } },
                customization: { select: { customPrice: true } },
            },
        });
        if (links.length === 0) {
            return {
                text: '❌ Klinika diagnostika xizmatini aktivlashtirmagan',
                keyboard: new InlineKeyboard().text('↩️ Bekor', 'clinic:wizard:cancel'),
            };
        }
        const kb = new InlineKeyboard();
        for (const l of links) {
            const price = l.customization?.customPrice ?? l.diagnosticService.priceRecommended;
            kb.text(
                clip(`${l.diagnosticService.nameUz} — ${fmtMoney(price)} UZS`, 60),
                `clinic:book:svc:DIAGNOSTIC:${l.diagnosticService.id}:${price}`,
            ).row();
        }
        kb.text('↩️ Bekor', 'clinic:wizard:cancel');
        return {
            text: '3-qadam: Xizmatni tanlang',
            keyboard: kb,
        };
    }
    // SURGICAL — same shape
    const links = await prisma.clinicSurgicalService.findMany({
        where: { clinicId: ctx.clinicId, isActive: true },
        take: 20,
        include: { surgicalService: { select: { id: true, nameUz: true, priceRecommended: true } } },
    });
    if (links.length === 0) {
        return {
            text: '❌ Klinika operatsiya xizmatini aktivlashtirmagan',
            keyboard: new InlineKeyboard().text('↩️ Bekor', 'clinic:wizard:cancel'),
        };
    }
    const kb = new InlineKeyboard();
    for (const l of links) {
        const price = (l as any).customizationData?.customPrice ?? l.surgicalService.priceRecommended;
        kb.text(
            clip(`${l.surgicalService.nameUz} — ${fmtMoney(price)} UZS`, 60),
            `clinic:book:svc:SURGICAL:${l.surgicalService.id}:${price}`,
        ).row();
    }
    kb.text('↩️ Bekor', 'clinic:wizard:cancel');
    return { text: '3-qadam: Xizmatni tanlang', keyboard: kb };
}

export function bookingStep3DateTime(): { text: string; keyboard: InlineKeyboard } {
    return {
        text: '4-qadam: Sana va vaqtni <code>DD.MM HH:MM</code> formatida kiriting\n\nMisol: <code>15.06 14:30</code>',
        keyboard: new InlineKeyboard().text('↩️ Bekor', 'clinic:wizard:cancel'),
    };
}

export async function bookingStep4Confirm(ctx: ClinicCtx, data: any, dateText: string): Promise<{ ok: boolean; error?: string; preview?: { text: string; keyboard: InlineKeyboard } }> {
    const at = parseLocalDateTime(dateText);
    if (!at) return { ok: false, error: 'Format noto\'g\'ri' };
    if (at.getTime() < Date.now() + 30 * 60 * 1000) return { ok: false, error: 'Vaqt o\'tmishda yoki juda yaqin' };

    // Try to fetch service name for the preview
    let svcName = '—';
    if (data.serviceType === 'DIAGNOSTIC') {
        const svc = await prisma.diagnosticService.findUnique({ where: { id: data.serviceId }, select: { nameUz: true } });
        svcName = svc?.nameUz || '—';
    } else if (data.serviceType === 'SURGICAL') {
        const svc = await prisma.surgicalService.findUnique({ where: { id: data.serviceId }, select: { nameUz: true } });
        svcName = svc?.nameUz || '—';
    }
    const patient = await prisma.user.findUnique({ where: { id: data.patientId }, select: { firstName: true, phone: true } });

    const text =
        `✅ <b>Tasdiqlash</b>\n\n` +
        `👤 ${esc(patient?.firstName || patient?.phone || '—')}\n` +
        `🩺 ${esc(svcName)}\n` +
        `📆 ${fmtDate(at)}\n` +
        `💰 ${fmtMoney(data.price)} UZS`;
    return {
        ok: true,
        preview: {
            text,
            keyboard: new InlineKeyboard()
                .text('✅ Tasdiqlash', `clinic:book:save:${at.toISOString()}`).row()
                .text('↩️ Bekor', 'clinic:wizard:cancel'),
        },
    };
}

export async function bookingFinalize(ctx: ClinicCtx, data: any, scheduledAt: Date): Promise<{ ok: boolean; error?: string; appointmentId?: string }> {
    try {
        const appt = await appointmentService.createBooking(data.patientId, {
            clinicId: ctx.clinicId,
            serviceType: data.serviceType,
            diagnosticServiceId: data.serviceType === 'DIAGNOSTIC' ? data.serviceId : undefined,
            surgicalServiceId: data.serviceType === 'SURGICAL' ? data.serviceId : undefined,
            scheduledAt: scheduledAt.toISOString(),
            price: Number(data.price) || 0,
        });
        await prisma.clinicAuditLog.create({
            data: {
                clinicId: ctx.clinicId, actorId: ctx.userId,
                action: 'booking.create_via_bot', targetType: 'appointment', targetId: (appt as any).id,
                metadata: { serviceType: data.serviceType, patientId: data.patientId },
            },
        });
        return { ok: true, appointmentId: (appt as any).id };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Bron yaratilmadi' };
    }
}
