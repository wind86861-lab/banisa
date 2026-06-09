import { InlineKeyboard } from 'grammy';
import prisma from '../../config/database';
import { cartService } from '../cart/cart.service';

const PUBLIC_BASE = (process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');

export type Lang = 'uz' | 'ru';

/** Status labels visible to the patient. */
const STATUS_LABEL: Record<string, Record<Lang, string>> = {
    PENDING:            { uz: '⏳ Kutilmoqda',         ru: '⏳ Ожидает' },
    OPERATOR_CONFIRMED: { uz: '✅ Operator tasdiqladi', ru: '✅ Оператор подтвердил' },
    SENT_TO_CLINIC:     { uz: '📤 Klinikaga yuborilgan', ru: '📤 Отправлено в клинику' },
    CLINIC_ACCEPTED:    { uz: '✅ Klinika qabul qildi', ru: '✅ Клиника приняла' },
    AWAITING_PAYMENT:   { uz: '💳 To\'lov kutilmoqda',  ru: '💳 Ожидает оплаты' },
    PAID:               { uz: '💰 To\'langan',          ru: '💰 Оплачено' },
    CHECKED_IN:         { uz: '🟢 Klinikada',           ru: '🟢 В клинике' },
    IN_PROGRESS:        { uz: '🔄 Bajarilmoqda',        ru: '🔄 Выполняется' },
    COMPLETED:          { uz: '✔️ Yakunlangan',        ru: '✔️ Завершено' },
    CANCELLED:          { uz: '❌ Bekor qilingan',     ru: '❌ Отменено' },
    NO_SHOW:            { uz: '🚫 Kelmagan',           ru: '🚫 Не явился' },
    RESCHEDULED:        { uz: '🔁 Ko\'chirilgan',      ru: '🔁 Перенесено' },
};

const CANCELLABLE_STATUSES = new Set([
    'PENDING', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED',
]);

function fmtDate(d: Date | string, lang: Lang): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    const locale = lang === 'ru' ? 'ru-RU' : 'uz-UZ';
    try {
        return date.toLocaleString(locale, {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return date.toISOString().slice(0, 16).replace('T', ' ');
    }
}

function fmtMoney(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('uz-UZ');
}

/** Escape characters that have special meaning in Telegram Markdown. */
function escMd(s: string | null | undefined): string {
    if (!s) return '';
    return s.replace(/[_*`[\]]/g, m => '\\' + m);
}

// ─── Bronlarim (My Appointments) ────────────────────────────────────────────
export interface RenderResult {
    text: string;
    keyboard: InlineKeyboard;
}

export async function renderMyAppointments(userId: string, lang: Lang, limit = 5): Promise<RenderResult> {
    const items = await prisma.appointment.findMany({
        where: { patientId: userId },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
        include: {
            clinic: { select: { nameUz: true, nameRu: true } },
            diagnosticService: { select: { nameUz: true, nameRu: true } },
            surgicalService: { select: { nameUz: true, nameRu: true } },
        },
    });

    if (items.length === 0) {
        const empty = lang === 'ru'
            ? '📅 *Мои брони*\n\nУ вас пока нет броней.'
            : '📅 *Bronlarim*\n\nHozircha bronlaringiz yo\'q.';
        const kb = new InlineKeyboard().url(
            lang === 'ru' ? '🩺 Услуги' : '🩺 Xizmatlar',
            `${PUBLIC_BASE}/xizmatlar`,
        );
        return { text: empty, keyboard: kb };
    }

    const header = lang === 'ru'
        ? `📅 *Мои брони* — последние ${items.length}\n\n`
        : `📅 *Bronlarim* — oxirgi ${items.length} ta\n\n`;

    const lines: string[] = [];
    const kb = new InlineKeyboard();

    items.forEach((appt, i) => {
        const clinicName = (lang === 'ru' ? appt.clinic?.nameRu : appt.clinic?.nameUz) || appt.clinic?.nameUz || '';
        const svcName =
            (lang === 'ru' ? appt.diagnosticService?.nameRu : appt.diagnosticService?.nameUz)
            ?? (lang === 'ru' ? appt.surgicalService?.nameRu : appt.surgicalService?.nameUz)
            ?? (lang === 'ru' ? 'Услуга' : 'Xizmat');
        const status = STATUS_LABEL[appt.status]?.[lang] || appt.status;
        const when = appt.scheduledAt ? fmtDate(appt.scheduledAt, lang) : '—';

        lines.push(
            `*${i + 1}.* ${escMd(svcName)}\n` +
            `🏥 ${escMd(clinicName)}\n` +
            `📆 ${when} · ${status}\n` +
            `💰 ${fmtMoney(appt.price)} UZS\n` +
            `№ \`${appt.bookingNumber || appt.id.slice(0, 8)}\``,
        );

        const detailLabel = lang === 'ru' ? `📋 #${i + 1}` : `📋 #${i + 1}`;
        kb.url(detailLabel, `${PUBLIC_BASE}/user/appointments/${appt.id}`);
        if (CANCELLABLE_STATUSES.has(appt.status)) {
            kb.text(
                lang === 'ru' ? `❌ Отменить #${i + 1}` : `❌ Bekor qil #${i + 1}`,
                `appt:cancel:${appt.id}`,
            );
        }
        kb.row();
    });

    kb.url(
        lang === 'ru' ? '🌐 Все брони на сайте' : '🌐 Saytda hammasi',
        `${PUBLIC_BASE}/user/appointments`,
    );

    return { text: header + lines.join('\n\n'), keyboard: kb };
}

// ─── Cart ───────────────────────────────────────────────────────────────────
export async function renderCart(userId: string, lang: Lang): Promise<RenderResult> {
    // Reuse the existing service so pricing, discounts and clinic customization
    // stay identical to the website. Returns groups by clinic.
    const groups = await cartService.getCart(userId) as Array<any>;

    if (!groups || groups.length === 0) {
        const text = lang === 'ru'
            ? '🛒 *Корзина*\n\nКорзина пуста.'
            : '🛒 *Savat*\n\nSavat bo\'sh.';
        const kb = new InlineKeyboard().url(
            lang === 'ru' ? '🩺 Услуги' : '🩺 Xizmatlar',
            `${PUBLIC_BASE}/xizmatlar`,
        );
        return { text, keyboard: kb };
    }

    let totalItems = 0;
    let totalPrice = 0;
    const sections: string[] = [];

    for (const group of groups) {
        const clinicName = (lang === 'ru' ? group.clinic?.nameRu : group.clinic?.nameUz)
            || group.clinic?.nameUz || '';
        const lines = group.items.map((it: any, i: number) => {
            const svcName = (lang === 'ru' ? it.service?.nameRu : it.service?.nameUz)
                || it.service?.nameUz || it.serviceType;
            const qty = it.quantity > 1 ? ` ×${it.quantity}` : '';
            const lineTotal = (it.service?.priceRecommended || 0) * (it.quantity || 1);
            totalItems += it.quantity || 1;
            totalPrice += lineTotal;
            return `  ${i + 1}. ${escMd(svcName)}${qty} — ${fmtMoney(lineTotal)}`;
        });
        sections.push(`🏥 *${escMd(clinicName)}*\n${lines.join('\n')}`);
    }

    const header = lang === 'ru'
        ? `🛒 *Корзина* — ${totalItems} позиций\n\n`
        : `🛒 *Savat* — ${totalItems} ta xizmat\n\n`;
    const totalLine = lang === 'ru'
        ? `\n\n*Итого: ${fmtMoney(totalPrice)} UZS*`
        : `\n\n*Jami: ${fmtMoney(totalPrice)} UZS*`;

    const kb = new InlineKeyboard()
        .url(lang === 'ru' ? '💳 К оплате' : '💳 To\'lash', `${PUBLIC_BASE}/user/cart/checkout`).row()
        .text(lang === 'ru' ? '🗑 Очистить' : '🗑 Tozalash', 'cart:clear:confirm');

    return { text: header + sections.join('\n\n') + totalLine, keyboard: kb };
}

export async function getCartCount(userId: string): Promise<number> {
    const items = await prisma.cartItem.findMany({
        where: { userId }, select: { quantity: true },
    });
    return items.reduce((sum, it) => sum + (it.quantity || 1), 0);
}

// ─── Profile ────────────────────────────────────────────────────────────────
export async function renderProfile(userId: string, lang: Lang): Promise<RenderResult> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, phone: true, email: true, createdAt: true },
    });
    if (!user) {
        return {
            text: lang === 'ru' ? '❌ Профиль не найден' : '❌ Profil topilmadi',
            keyboard: new InlineKeyboard(),
        };
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
    const joinDate = user.createdAt ? fmtDate(user.createdAt, lang).slice(0, 6) : '—';

    const text = lang === 'ru'
        ? `👤 *Профиль*\n\n` +
          `*Имя:* ${escMd(fullName)}\n` +
          `*Телефон:* ${escMd(user.phone)}\n` +
          `*Email:* ${escMd(user.email || '—')}\n` +
          `*Язык:* Русский\n` +
          `*С нами с:* ${joinDate}`
        : `👤 *Profil*\n\n` +
          `*Ism:* ${escMd(fullName)}\n` +
          `*Telefon:* ${escMd(user.phone)}\n` +
          `*Email:* ${escMd(user.email || '—')}\n` +
          `*Til:* O'zbekcha\n` +
          `*Bizda:* ${joinDate} dan`;

    const kb = new InlineKeyboard()
        .url(lang === 'ru' ? '✏️ Редактировать' : '✏️ Tahrirlash', `${PUBLIC_BASE}/user/profile`).row()
        .text(lang === 'ru' ? '🌐 Сменить язык' : '🌐 Tilni o\'zgartirish', 'lang:menu').row()
        .text(lang === 'ru' ? '🚪 Отвязать бот' : '🚪 Botni uzish', 'profile:unlink:confirm');

    return { text, keyboard: kb };
}

// ─── Cancellation logic ────────────────────────────────────────────────────
export async function tryCancelAppointment(userId: string, appointmentId: string): Promise<{ ok: boolean; error?: string }> {
    const appt = await prisma.appointment.findFirst({
        where: { id: appointmentId, patientId: userId },
    });
    if (!appt) return { ok: false, error: 'not_found' };
    if (!CANCELLABLE_STATUSES.has(appt.status)) return { ok: false, error: 'not_cancellable' };

    await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
            status: 'CANCELLED' as any,
            cancelledAt: new Date(),
            cancelledBy: 'PATIENT' as any,
            cancellationReason: 'Cancelled via Telegram',
        },
    });
    return { ok: true };
}

export async function clearUserCart(userId: string): Promise<number> {
    const result = await prisma.cartItem.deleteMany({ where: { userId } });
    return result.count;
}
