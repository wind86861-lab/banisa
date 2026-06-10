import { InlineKeyboard } from 'grammy';
import prisma from '../../config/database';
import { cartService } from '../cart/cart.service';

const PUBLIC_BASE = (process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');

export type Lang = 'uz' | 'ru';

const STATUS_LABEL: Record<string, Record<Lang, string>> = {
    PENDING:            { uz: '⏳ Kutilmoqda',         ru: '⏳ Ожидает' },
    OPERATOR_CONFIRMED: { uz: '✅ Operator tasdiqladi', ru: '✅ Оператор подтвердил' },
    SENT_TO_CLINIC:     { uz: '📤 Klinikaga yuborildi', ru: '📤 Отправлено в клинику' },
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

// Statuses where the booking is "live" and the patient should be able to
// walk into the clinic and scan the QR.
const CHECKINABLE_STATUSES = new Set([
    'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED',
    'AWAITING_PAYMENT', 'PAID',
]);

// Statuses where the patient can still cancel themselves (no money moved yet).
const CANCELLABLE_STATUSES = new Set([
    'PENDING', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED',
]);

function fmtDate(d: Date | string | null | undefined, lang: Lang): string {
    if (!d) return '—';
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

/** Escape HTML special characters. Telegram's HTML mode only needs <, >, &
 *  escaped — far less fragile than Markdown's apostrophe / underscore /
 *  parenthesis traps, which made Bronlarim silently fail with 400 errors. */
function escHtml(s: string | null | undefined): string {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
// Alias so older call sites still compile. New code should prefer escHtml.
function escMd(s: string | null | undefined): string {
    return escHtml(s);
}

/** Trim a label so the button stays well under Telegram's 64-byte cap. */
function clip(s: string, max = 35): string {
    if (!s) return '';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export interface RenderResult {
    text: string;
    keyboard: InlineKeyboard;
}

// ─── Bronlarim: list + detail ───────────────────────────────────────────────

export async function renderMyAppointments(userId: string, lang: Lang, limit = 10): Promise<RenderResult> {
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
            ? '📅 <b>Мои брони</b>\n\nУ вас пока нет броней.'
            : '📅 <b>Bronlarim</b>\n\nHozircha bronlaringiz yo\'q.';
        const kb = new InlineKeyboard().url(
            lang === 'ru' ? '🩺 Услуги' : '🩺 Xizmatlar',
            `${PUBLIC_BASE}/xizmatlar`,
        );
        return { text: empty, keyboard: kb };
    }

    const header = lang === 'ru'
        ? `📅 <b>Мои брони</b> (${items.length})\n👇 Тапните бронь для деталей`
        : `📅 <b>Bronlarim</b> (${items.length})\n👇 Tafsilot uchun bronni bosing`;

    const kb = new InlineKeyboard();
    items.forEach((appt) => {
        const svcName = (lang === 'ru' ? appt.diagnosticService?.nameRu : appt.diagnosticService?.nameUz)
            ?? (lang === 'ru' ? appt.surgicalService?.nameRu : appt.surgicalService?.nameUz)
            ?? (lang === 'ru' ? 'Услуга' : 'Xizmat');
        const status = STATUS_LABEL[appt.status]?.[lang]?.split(' ')[0] || '';
        const when = fmtDate(appt.scheduledAt, lang);
        // "🟢 09 iyun 14:30 — ALAT (jigar)"
        kb.text(clip(`${status} ${when} — ${svcName}`, 60), `appt:show:${appt.id}`).row();
    });

    kb.webApp(
        lang === 'ru' ? '🌐 Все брони' : '🌐 Hammasini ochish',
        `${PUBLIC_BASE}/user/appointments`,
    );
    return { text: header, keyboard: kb };
}

export async function renderAppointmentDetail(userId: string, appointmentId: string, lang: Lang): Promise<RenderResult | null> {
    const appt = await prisma.appointment.findFirst({
        where: { id: appointmentId, patientId: userId },
        include: {
            clinic: { select: { id: true, nameUz: true, nameRu: true, region: true, district: true, street: true, phones: true } },
            diagnosticService: { select: { nameUz: true, nameRu: true } },
            surgicalService: { select: { nameUz: true, nameRu: true } },
        },
    });
    if (!appt) return null;

    const svcName = (lang === 'ru' ? appt.diagnosticService?.nameRu : appt.diagnosticService?.nameUz)
        ?? (lang === 'ru' ? appt.surgicalService?.nameRu : appt.surgicalService?.nameUz)
        ?? (lang === 'ru' ? 'Услуга' : 'Xizmat');
    const clinicName = (lang === 'ru' ? appt.clinic?.nameRu : appt.clinic?.nameUz) || appt.clinic?.nameUz || '';
    const address = [appt.clinic?.region, appt.clinic?.district, appt.clinic?.street].filter(Boolean).join(', ');
    const status = STATUS_LABEL[appt.status]?.[lang] || appt.status;
    const phones = (appt.clinic?.phones as string[] | null)?.filter(Boolean) || [];

    const headerLabel = lang === 'ru' ? '🩺 <b>Бронь</b>' : '🩺 <b>Bron</b>';
    const body = [
        headerLabel,
        '',
        `<b>${escHtml(svcName)}</b>`,
        '',
        `🏥 ${escHtml(clinicName)}`,
        address ? `📍 ${escHtml(address)}` : '',
        phones.length ? `📞 ${phones.map(escHtml).join(', ')}` : '',
        `📆 ${escHtml(fmtDate(appt.scheduledAt, lang))}`,
        `💰 ${fmtMoney(appt.price)} UZS`,
        `${escHtml(status)}`,
        `№ <code>${escHtml(appt.bookingNumber || appt.id.slice(0, 8))}</code>`,
        appt.notes ? `\n💬 ${escHtml(appt.notes)}` : '',
    ].filter(Boolean).join('\n');

    // Use webApp buttons (not url) for any Banisa-domain destination — those
    // open as a Mini App inside Telegram, so window.Telegram.WebApp.initData
    // is populated and ensurePatientAuth() succeeds. Plain `.url(...)` opens
    // Telegram's in-app browser, which has no initData and no refresh cookie
    // → token recovery fails → the page bounces the user to /user/login.
    const kb = new InlineKeyboard();
    if (CHECKINABLE_STATUSES.has(appt.status)) {
        kb.webApp(
            lang === 'ru' ? '📍 Check-in (отсканировать QR)' : '📍 Check-in (QR skanlash)',
            `${PUBLIC_BASE}/user/scan-checkin`,
        ).row();
    }
    if (CANCELLABLE_STATUSES.has(appt.status)) {
        kb.text(
            lang === 'ru' ? '❌ Отменить бронь' : '❌ Bronni bekor qilish',
            `appt:cancel:${appt.id}`,
        ).row();
    }
    kb.webApp(
        lang === 'ru' ? '🌐 Открыть в Mini App' : '🌐 Mini App\'da ochish',
        `${PUBLIC_BASE}/user/appointments/${appt.id}`,
    ).row();
    kb.text(
        lang === 'ru' ? '⬅️ К списку броней' : '⬅️ Bronlar ro\'yxati',
        'appt:list',
    );
    return { text: body, keyboard: kb };
}

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

// ─── Savat: list + detail ───────────────────────────────────────────────────

interface FlatCartItem {
    id: string;
    quantity: number;
    serviceType: string;
    clinic: { id: string; nameUz?: string | null; nameRu?: string | null };
    service: { id: string; nameUz: string; nameRu?: string | null; priceRecommended: number; imageUrl?: string | null } | null;
    createdAt: Date;
}

async function fetchFlatCart(userId: string): Promise<FlatCartItem[]> {
    const groups = await cartService.getCart(userId) as Array<any>;
    const flat: FlatCartItem[] = [];
    for (const g of groups || []) {
        for (const it of g.items || []) flat.push({ ...it, clinic: g.clinic });
    }
    return flat;
}

export async function renderCart(userId: string, lang: Lang): Promise<RenderResult> {
    const items = await fetchFlatCart(userId);

    if (items.length === 0) {
        const text = lang === 'ru'
            ? '🛒 <b>Корзина</b>\n\nКорзина пуста.'
            : '🛒 <b>Savat</b>\n\nSavat bo\'sh.';
        const kb = new InlineKeyboard().url(
            lang === 'ru' ? '🩺 Услуги' : '🩺 Xizmatlar',
            `${PUBLIC_BASE}/xizmatlar`,
        );
        return { text, keyboard: kb };
    }

    let totalItems = 0;
    let totalPrice = 0;
    const kb = new InlineKeyboard();

    items.forEach((it) => {
        const svcName = (lang === 'ru' ? it.service?.nameRu : it.service?.nameUz) || it.service?.nameUz || it.serviceType;
        const clinicName = (lang === 'ru' ? it.clinic?.nameRu : it.clinic?.nameUz) || it.clinic?.nameUz || '';
        const price = (it.service?.priceRecommended || 0) * (it.quantity || 1);
        totalItems += it.quantity || 1;
        totalPrice += price;
        const qty = it.quantity > 1 ? ` ×${it.quantity}` : '';
        // "💊 ALAT ×2 — Medilux  (110k)"
        const label = `${svcName}${qty} · ${clinicName} · ${fmtMoney(price)}`;
        kb.text(clip(label, 60), `cart:item:${it.id}`).row();
    });

    const header = lang === 'ru'
        ? `🛒 <b>Корзина</b> — ${totalItems} позиц.\n💰 <b>Итого: ${fmtMoney(totalPrice)} UZS</b>\n👇 Тапните позицию для деталей`
        : `🛒 <b>Savat</b> — ${totalItems} ta xizmat\n💰 <b>Jami: ${fmtMoney(totalPrice)} UZS</b>\n👇 Tafsilot uchun xizmatni bosing`;

    kb.webApp(
        lang === 'ru' ? '💳 К оплате' : '💳 To\'lash',
        `${PUBLIC_BASE}/user/cart/checkout`,
    ).row();
    kb.text(
        lang === 'ru' ? '🗑 Очистить корзину' : '🗑 Savatni tozalash',
        'cart:clear:confirm',
    );

    return { text: header, keyboard: kb };
}

export async function renderCartItemDetail(userId: string, cartItemId: string, lang: Lang): Promise<RenderResult | null> {
    const items = await fetchFlatCart(userId);
    const item = items.find(i => i.id === cartItemId);
    if (!item) return null;

    const svcName = (lang === 'ru' ? item.service?.nameRu : item.service?.nameUz) || item.service?.nameUz || item.serviceType;
    const clinicName = (lang === 'ru' ? item.clinic?.nameRu : item.clinic?.nameUz) || item.clinic?.nameUz || '';
    const unit = item.service?.priceRecommended || 0;
    const subtotal = unit * (item.quantity || 1);

    const typeLabel: Record<string, Record<Lang, string>> = {
        DIAGNOSTIC: { uz: '🩺 Diagnostika', ru: '🩺 Диагностика' },
        SURGICAL:   { uz: '🔪 Operatsiya',   ru: '🔪 Операция' },
        CHECKUP:    { uz: '📋 Checkup',      ru: '📋 Чекап' },
        SANATORIUM: { uz: '🏔 Sanatoriya',   ru: '🏔 Санаторий' },
    };
    const tlabel = typeLabel[item.serviceType]?.[lang] || item.serviceType;

    const body = [
        lang === 'ru' ? '🛒 <b>Позиция корзины</b>' : '🛒 <b>Savat xizmati</b>',
        '',
        `<b>${escHtml(svcName)}</b>`,
        '',
        tlabel,
        `🏥 ${escHtml(clinicName)}`,
        `📦 ${lang === 'ru' ? 'Количество' : 'Miqdor'}: ${item.quantity}`,
        `💰 ${fmtMoney(unit)} × ${item.quantity} = <b>${fmtMoney(subtotal)} UZS</b>`,
        `📆 ${escHtml(fmtDate(item.createdAt, lang))}`,
    ].join('\n');

    const kb = new InlineKeyboard();
    if (item.quantity > 1) {
        kb.text('➖', `cart:qty:${item.id}:down`);
    }
    kb.text(`× ${item.quantity}`, 'cart:qty:noop');
    kb.text('➕', `cart:qty:${item.id}:up`).row();

    kb.text(
        lang === 'ru' ? '🗑 Удалить из корзины' : '🗑 Savatdan o\'chirish',
        `cart:remove:${item.id}`,
    ).row();
    kb.text(
        lang === 'ru' ? '⬅️ К корзине' : '⬅️ Savatga qaytish',
        'cart:list',
    );

    return { text: body, keyboard: kb };
}

export async function getCartCount(userId: string): Promise<number> {
    const items = await prisma.cartItem.findMany({
        where: { userId }, select: { quantity: true },
    });
    return items.reduce((sum, it) => sum + (it.quantity || 1), 0);
}

export async function clearUserCart(userId: string): Promise<number> {
    const result = await prisma.cartItem.deleteMany({ where: { userId } });
    return result.count;
}

export async function changeCartItemQty(userId: string, cartItemId: string, delta: number): Promise<{ ok: boolean; deleted?: boolean; newQty?: number }> {
    const item = await prisma.cartItem.findFirst({ where: { id: cartItemId, userId } });
    if (!item) return { ok: false };
    const next = item.quantity + delta;
    if (next <= 0) {
        await prisma.cartItem.delete({ where: { id: cartItemId } });
        return { ok: true, deleted: true };
    }
    if (next > 99) return { ok: false };
    await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity: next } });
    return { ok: true, newQty: next };
}

export async function removeCartItem(userId: string, cartItemId: string): Promise<boolean> {
    const item = await prisma.cartItem.findFirst({ where: { id: cartItemId, userId } });
    if (!item) return false;
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return true;
}

// ─── Profile (unchanged from before, kept here for one-stop ownership) ──────

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
        ? `👤 <b>Профиль</b>\n\n<b>Имя:</b> ${escHtml(fullName)}\n<b>Телефон:</b> ${escHtml(user.phone)}\n<b>Email:</b> ${escHtml(user.email || '—')}\n<b>Язык:</b> Русский\n<b>С нами с:</b> ${escHtml(joinDate)}`
        : `👤 <b>Profil</b>\n\n<b>Ism:</b> ${escHtml(fullName)}\n<b>Telefon:</b> ${escHtml(user.phone)}\n<b>Email:</b> ${escHtml(user.email || '—')}\n<b>Til:</b> O'zbekcha\n<b>Bizda:</b> ${escHtml(joinDate)} dan`;

    const kb = new InlineKeyboard()
        .webApp(lang === 'ru' ? '✏️ Редактировать' : '✏️ Tahrirlash', `${PUBLIC_BASE}/user/profile`).row()
        .text(lang === 'ru' ? '🌐 Сменить язык' : '🌐 Tilni o\'zgartirish', 'lang:menu').row()
        .text(lang === 'ru' ? '🚪 Отвязать бот' : '🚪 Botni uzish', 'profile:unlink:confirm');

    return { text, keyboard: kb };
}
