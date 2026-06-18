/**
 * Posts new-booking pings + on-demand reports to the platform's super-admin
 * Telegram group. SUPER_ADMIN_TG_GROUP_ID is the chat id of that group (an
 * empty value disables the feature entirely). Discover the id by adding
 * the bot to the group and sending /chatid.
 */
import prisma from '../../config/database';
import { env } from '../../config/env';
import { getBot } from './telegram.bot';

const PUBLIC_BASE = (env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');
const TZ = 'Asia/Tashkent';

function isEnabled(): boolean {
    return Boolean(env.SUPER_ADMIN_TG_GROUP_ID) && Boolean(getBot());
}

function esc(s: string | number | null | undefined): string {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtMoney(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');
}

function fmtDateTime(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return '—';
    try {
        return dt.toLocaleString('en-GB', {
            timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false,
        }).replace(',', ' ·');
    } catch { return dt.toISOString(); }
}

const STATUS_LABEL: Record<string, string> = {
    PENDING: '⏳ Yangi (klinika tasdiqi kutilmoqda)',
    CONFIRMED: '✅ Tasdiqlangan',
    CHECKED_IN: '🟢 Klinikada',
    IN_PROGRESS: '🔄 Bajarilmoqda',
    COMPLETED: '✔️ Yakunlangan',
    CANCELLED: '❌ Bekor qilingan',
    NO_SHOW: '🚫 Kelmagan',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
    CASH: '💵 Naqd (klinikada)',
    PAYME: '💳 Payme',
    CLICK: '💳 Click',
    CARD: '💳 Karta',
};

interface NewBookingArgs {
    appointmentId: string;
    bookingNumber: string;
    patientName: string;
    patientPhone?: string | null;
    clinicName: string;
    services: Array<{ name: string; finalPrice?: number | null }>;
    scheduledAt: Date | string;
    totalPrice: number;
    paymentMethod?: string | null;
    status: string;
}

/** Fire-and-forget — never throws back to the caller. */
export async function broadcastNewBooking(args: NewBookingArgs): Promise<void> {
    if (!isEnabled()) return;
    const bot = getBot();
    if (!bot) return;

    const lines: string[] = [];
    lines.push(`🆕 <b>Yangi bron</b> · <code>${esc(args.bookingNumber)}</code>`);
    lines.push('');
    lines.push(`👤 <b>${esc(args.patientName)}</b>${args.patientPhone ? ` · <code>${esc(args.patientPhone)}</code>` : ''}`);
    lines.push(`🏥 ${esc(args.clinicName)}`);
    lines.push(`📅 ${esc(fmtDateTime(args.scheduledAt))}`);
    lines.push('');
    if (args.services.length > 0) {
        lines.push(`🩺 <b>Xizmatlar (${args.services.length}):</b>`);
        for (const s of args.services) {
            lines.push(
                `   • ${esc(s.name)}` +
                (s.finalPrice ? ` — ${esc(fmtMoney(s.finalPrice))} soʻm` : ''),
            );
        }
        lines.push('');
    }
    lines.push(`💵 <b>Jami:</b> ${esc(fmtMoney(args.totalPrice))} soʻm`);
    if (args.paymentMethod) {
        const lbl = PAYMENT_METHOD_LABEL[args.paymentMethod] || `💳 ${esc(args.paymentMethod)}`;
        lines.push(`   ${lbl}`);
    }
    lines.push('');
    lines.push(`📊 ${STATUS_LABEL[args.status] || esc(args.status)}`);

    const text = lines.join('\n').slice(0, 4000);
    const url = `${PUBLIC_BASE}/clinic/bookings?focus=${args.appointmentId}`;
    try {
        await bot.api.sendMessage(Number(env.SUPER_ADMIN_TG_GROUP_ID), text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: '🔎 Bron tafsilotlari', url }]],
            },
        });
    } catch (e: any) {
        console.error('[adminBroadcast] sendMessage failed:', e?.description || e?.message || e);
    }
}

/** Helper: load + format a freshly created appointment for broadcast. */
export async function broadcastBookingById(appointmentId: string): Promise<void> {
    if (!isEnabled()) return;
    try {
        const appt = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                clinic: { select: { nameUz: true } },
                patient: { select: { firstName: true, lastName: true, phone: true } },
                diagnosticService: { select: { nameUz: true } },
                surgicalService: { select: { nameUz: true } },
                services: { select: { serviceName: true, finalPrice: true } },
            },
        });
        if (!appt) return;

        // Prefer per-item rows when present (cart flows); fall back to the
        // single relation on direct bookings.
        const services = (appt as any).services?.length
            ? (appt as any).services.map((s: any) => ({ name: s.serviceName, finalPrice: s.finalPrice }))
            : (appt as any).diagnosticService?.nameUz
                ? [{ name: (appt as any).diagnosticService.nameUz, finalPrice: appt.finalPrice }]
                : (appt as any).surgicalService?.nameUz
                    ? [{ name: (appt as any).surgicalService.nameUz, finalPrice: appt.finalPrice }]
                    : [];

        await broadcastNewBooking({
            appointmentId: appt.id,
            bookingNumber: (appt as any).bookingNumber || '',
            patientName: [appt.patient?.firstName, appt.patient?.lastName]
                .filter(Boolean).join(' ') || appt.patient?.phone || 'Bemor',
            patientPhone: appt.patient?.phone,
            clinicName: (appt as any).clinic?.nameUz || 'Klinika',
            services,
            scheduledAt: appt.scheduledAt,
            totalPrice: appt.finalPrice || (appt as any).price || 0,
            paymentMethod: (appt as any).paymentMethod || null,
            status: appt.status as string,
        });
    } catch (e) {
        console.error('[adminBroadcast] broadcastBookingById failed:', e);
    }
}
