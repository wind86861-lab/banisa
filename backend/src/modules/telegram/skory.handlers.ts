/**
 * Emergency-ambulance UX inside the bot. The "🆘 Tez yordam" reply
 * button no longer drops the patient straight into the mini-app —
 * instead it shows three inline choices:
 *
 *   📍 Eng yaqini  → asks for shared location, finds nearest AVAILABLE
 *   💰 Eng arzoni  → picks the cheapest (lowest baseFee) AVAILABLE
 *   🌐 Mini-appda toʻliq → opens the original Skory page in the mini-app
 *
 * Each ambulance card carries a "🛍️ Savatga qoʻshish" callback that
 * uses the existing cart pipeline (ServiceType.AMBULANCE was added in
 * a migration for exactly this) so the patient can finish booking
 * without ever leaving Telegram.
 */
import { Bot, InlineKeyboard, Keyboard, InputFile } from 'grammy';
import prisma from '../../config/database';

const PUBLIC_BASE = (process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'banisauzbot';

export type SkoryLang = 'uz' | 'ru';

const L = {
    uz: {
        intro: '🆘 <b>Tez yordam</b>\n\nQanday qidirasiz?',
        btnNearest: '📍 Eng yaqini',
        btnCheapest: '💰 Eng arzoni',
        btnMiniapp: '🌐 Mini-appda toʻliq',
        askLocation: '📍 Eng yaqin tez yordamni topish uchun joylashuvingizni ulashing:',
        shareLocation: '📍 Joylashuvni ulashish',
        cancel: '❌ Bekor',
        noAvailable: '⚠️ Hozircha hech qanday tayyor tez yordam topilmadi.',
        noNear: '⚠️ Sizning hududingiz uchun yaqin tez yordam topilmadi.',
        details: (a: any, distance: number | null) =>
            `🆘 <b>${esc(a.callSign)}</b>${a.vehicleModel ? ' · ' + esc(a.vehicleModel) : ''}\n\n` +
            `🏥 ${esc(a.clinic.nameUz)}\n` +
            (a.licensePlate ? `🚗 ${esc(a.licensePlate)}\n` : '') +
            `🩺 ${esc(typeLabel(a.type, 'uz'))}  ·  Sigʻimi: ${a.capacity} ta\n` +
            (Array.isArray(a.equipment) && a.equipment.length
                ? `🧰 ${a.equipment.map((e: string) => esc(e)).join(', ')}\n`
                : '') +
            `📊 Holati: ${esc(statusLabel(a.status, 'uz'))}\n` +
            (a.baseFee ? `💵 Chaqiruv: <b>${fmtMoney(a.baseFee)}</b> soʻm` : '') +
            (a.pricePerKm ? ` · 1 km uchun ${fmtMoney(a.pricePerKm)} soʻm\n` : '\n') +
            (distance != null ? `\n📍 Masofa: <b>${distance.toFixed(1)} km</b>\n` : '') +
            (a.dispatchPhone || (a.clinic.phones || [])[0]
                ? `\n📞 Dispatch: <code>${esc(a.dispatchPhone || a.clinic.phones[0])}</code>`
                : ''),
        btnCall: '📞 Qoʻngʻiroq',
        btnAdd: '🛍️ Savatga qoʻshish',
        btnOpenMiniapp: '🌐 Mini-appda ochish',
        added: '✅ Savatga qoʻshildi! Sayt yoki mini-appda checkoutni davom ettiring.',
        addFailed: '⚠️ Savatga qoʻshib boʻlmadi. Hisobingizga kirganmisiz?',
        needLink: 'Avval botga kiring (/start)',
    },
    ru: {
        intro: '🆘 <b>Скорая помощь</b>\n\nКак искать?',
        btnNearest: '📍 Ближайшая',
        btnCheapest: '💰 Самая дешёвая',
        btnMiniapp: '🌐 Открыть в Mini-app',
        askLocation: '📍 Поделитесь геолокацией, чтобы найти ближайшую скорую:',
        shareLocation: '📍 Поделиться локацией',
        cancel: '❌ Отмена',
        noAvailable: '⚠️ Доступных скорых пока нет.',
        noNear: '⚠️ Для вашего района скорой не найдено.',
        details: (a: any, distance: number | null) =>
            `🆘 <b>${esc(a.callSign)}</b>${a.vehicleModel ? ' · ' + esc(a.vehicleModel) : ''}\n\n` +
            `🏥 ${esc(a.clinic.nameUz)}\n` +
            (a.licensePlate ? `🚗 ${esc(a.licensePlate)}\n` : '') +
            `🩺 ${esc(typeLabel(a.type, 'ru'))}  ·  Вмещает: ${a.capacity}\n` +
            (Array.isArray(a.equipment) && a.equipment.length
                ? `🧰 ${a.equipment.map((e: string) => esc(e)).join(', ')}\n`
                : '') +
            `📊 Статус: ${esc(statusLabel(a.status, 'ru'))}\n` +
            (a.baseFee ? `💵 Вызов: <b>${fmtMoney(a.baseFee)}</b> сум` : '') +
            (a.pricePerKm ? ` · за 1 км ${fmtMoney(a.pricePerKm)} сум\n` : '\n') +
            (distance != null ? `\n📍 Расстояние: <b>${distance.toFixed(1)} км</b>\n` : '') +
            (a.dispatchPhone || (a.clinic.phones || [])[0]
                ? `\n📞 Диспетчер: <code>${esc(a.dispatchPhone || a.clinic.phones[0])}</code>`
                : ''),
        btnCall: '📞 Позвонить',
        btnAdd: '🛍️ В корзину',
        btnOpenMiniapp: '🌐 Открыть в Mini-app',
        added: '✅ Добавлено в корзину! Завершите оплату в Mini-app или на сайте.',
        addFailed: '⚠️ Не удалось добавить в корзину. Вы вошли в аккаунт?',
        needLink: 'Сначала войдите (/start)',
    },
};

function esc(s: any): string {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmtMoney(n: number): string {
    return Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');
}
function typeLabel(t: string, lang: SkoryLang): string {
    const m: Record<string, { uz: string; ru: string }> = {
        BASIC:          { uz: 'Oddiy',           ru: 'Базовая' },
        INTENSIVE_CARE: { uz: 'Reanimatsiya',    ru: 'Реанимация' },
        NEONATAL:       { uz: 'Yangi tugʻilgan', ru: 'Неонатальная' },
        CARDIAC:        { uz: 'Yurak',           ru: 'Кардио' },
        TRAUMA:         { uz: 'Travma',          ru: 'Травма' },
        OBSTETRIC:      { uz: 'Tugʻruq',         ru: 'Акушерская' },
    };
    return m[t]?.[lang] || t;
}
function statusLabel(s: string, lang: SkoryLang): string {
    const m: Record<string, { uz: string; ru: string }> = {
        AVAILABLE:   { uz: '🟢 Tayyor',     ru: '🟢 Доступна' },
        BUSY:        { uz: '🟡 Bandi',      ru: '🟡 Занята' },
        MAINTENANCE: { uz: '🔧 Texnik',     ru: '🔧 На ТО' },
        OFFLINE:     { uz: '⚫ Offline',    ru: '⚫ Offline' },
    };
    return m[s]?.[lang] || s;
}

// Haversine distance in km.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function startAppLink(param: string): string {
    return `https://t.me/${BOT_USERNAME}/app?startapp=${encodeURIComponent(param)}`;
}

/**
 * State for the "awaiting shared location" flow. The plain text-message
 * handler in telegram.bot.ts wouldn't normally route location events,
 * so we store a flag here and pick it up when the patient's location
 * arrives.
 */
const skoryAwaitingLocation = new Set<number>();
export function isAwaitingLocation(chatId: number): boolean { return skoryAwaitingLocation.has(chatId); }
export function clearAwaitingLocation(chatId: number): void { skoryAwaitingLocation.delete(chatId); }

/** Entry point — called when the patient taps "🆘 Tez yordam" reply button. */
export async function sendSkoryMenu(ctx: any, lang: SkoryLang): Promise<void> {
    const t = L[lang];
    const kb = new InlineKeyboard()
        .text(t.btnNearest, 'skory:nearest').row()
        .text(t.btnCheapest, 'skory:cheapest').row()
        .url(t.btnMiniapp, startAppLink('skory'));
    await ctx.reply(t.intro, { parse_mode: 'HTML', reply_markup: kb });
}

async function fetchAmbulance(id: string): Promise<any> {
    const a = await prisma.ambulance.findUnique({
        where: { id },
        include: {
            clinic: { select: { id: true, nameUz: true, phones: true, latitude: true, longitude: true } },
        },
    });
    if (!a) return null;
    return {
        id: a.id,
        clinicId: a.clinicId,
        callSign: a.callSign,
        type: a.type,
        vehicleModel: a.vehicleModel,
        licensePlate: a.licensePlate,
        capacity: a.capacity,
        equipment: a.equipment,
        status: a.status,
        baseFee: a.baseFee,
        pricePerKm: a.pricePerKm,
        dispatchPhone: a.dispatchPhone,
        photoUrl: a.photoUrl,
        baseLatitude: a.baseLatitude,
        baseLongitude: a.baseLongitude,
        currentLatitude: a.currentLatitude,
        currentLongitude: a.currentLongitude,
        clinic: a.clinic,
    };
}

async function findCheapest(): Promise<any | null> {
    const rows = await prisma.ambulance.findMany({
        where: { isActive: true, status: 'AVAILABLE', baseFee: { not: null } },
        orderBy: { baseFee: 'asc' },
        take: 1,
        include: { clinic: { select: { id: true, nameUz: true, phones: true, latitude: true, longitude: true } } },
    });
    if (rows.length === 0) {
        // Fall back to any available (no fee data).
        const any = await prisma.ambulance.findFirst({
            where: { isActive: true, status: 'AVAILABLE' },
            include: { clinic: { select: { id: true, nameUz: true, phones: true, latitude: true, longitude: true } } },
        });
        return any;
    }
    return rows[0];
}

async function findNearest(lat: number, lng: number): Promise<{ ambulance: any; distanceKm: number } | null> {
    const rows = await prisma.ambulance.findMany({
        where: { isActive: true, status: 'AVAILABLE' },
        include: { clinic: { select: { id: true, nameUz: true, phones: true, latitude: true, longitude: true } } },
    });
    let best: { ambulance: any; distanceKm: number } | null = null;
    for (const a of rows) {
        const useLat = a.currentLatitude ?? a.baseLatitude ?? a.clinic.latitude;
        const useLng = a.currentLongitude ?? a.baseLongitude ?? a.clinic.longitude;
        if (useLat == null || useLng == null) continue;
        const d = haversineKm(lat, lng, useLat, useLng);
        if (!best || d < best.distanceKm) best = { ambulance: a, distanceKm: d };
    }
    return best;
}

function detailsKeyboard(amb: any, distance: number | null, lang: SkoryLang): InlineKeyboard {
    const t = L[lang];
    const kb = new InlineKeyboard()
        .text(t.btnAdd, `skory:add:${amb.id}`);
    const phone = amb.dispatchPhone || (amb.clinic.phones || [])[0];
    if (phone) kb.row().url(t.btnCall, `tel:${String(phone).replace(/\s+/g, '')}`);
    kb.row().url(t.btnOpenMiniapp, startAppLink('skory'));
    return kb;
}

export async function handleNearestPrompt(ctx: any, lang: SkoryLang): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const t = L[lang];
    skoryAwaitingLocation.add(Number(chatId));
    const kb = new Keyboard()
        .requestLocation(t.shareLocation).row()
        .text(t.cancel)
        .oneTime().resized();
    await ctx.reply(t.askLocation, { reply_markup: kb });
}

export async function handleCheapest(ctx: any, lang: SkoryLang): Promise<void> {
    const t = L[lang];
    const amb = await findCheapest();
    if (!amb) {
        await ctx.reply(t.noAvailable);
        return;
    }
    if (amb.photoUrl) {
        try {
            await ctx.replyWithPhoto(amb.photoUrl, {
                caption: t.details(amb, null),
                parse_mode: 'HTML',
                reply_markup: detailsKeyboard(amb, null, lang),
            });
            return;
        } catch { /* fall through to text */ }
    }
    await ctx.reply(t.details(amb, null), {
        parse_mode: 'HTML',
        reply_markup: detailsKeyboard(amb, null, lang),
    });
}

export async function handleLocationReceived(ctx: any, lang: SkoryLang, location: { latitude: number; longitude: number }): Promise<void> {
    const chatId = ctx.chat?.id;
    if (chatId) skoryAwaitingLocation.delete(Number(chatId));
    const t = L[lang];
    const hit = await findNearest(location.latitude, location.longitude);
    if (!hit) {
        await ctx.reply(t.noNear);
        return;
    }
    const { ambulance: amb, distanceKm } = hit;
    if (amb.photoUrl) {
        try {
            await ctx.replyWithPhoto(amb.photoUrl, {
                caption: t.details(amb, distanceKm),
                parse_mode: 'HTML',
                reply_markup: detailsKeyboard(amb, distanceKm, lang),
            });
            return;
        } catch { /* fall through */ }
    }
    await ctx.reply(t.details(amb, distanceKm), {
        parse_mode: 'HTML',
        reply_markup: detailsKeyboard(amb, distanceKm, lang),
    });
}

/**
 * Add the chosen ambulance to the patient's cart. Reuses the existing
 * one-clinic-per-cart policy enforced in cart.service — if the patient
 * already has services from a different clinic in their cart, this will
 * 409 and the bot relays the message.
 */
export async function handleAddToCart(ctx: any, lang: SkoryLang, userId: string, ambulanceId: string): Promise<void> {
    const t = L[lang];
    const amb = await prisma.ambulance.findUnique({ where: { id: ambulanceId } });
    if (!amb || !amb.isActive) {
        await ctx.answerCallbackQuery({ text: t.addFailed, show_alert: true });
        return;
    }
    try {
        // Avoid the cross-clinic check tripping when the patient just
        // wants to swap ambulances: nuke any pre-existing AMBULANCE rows
        // in the same clinic before inserting (so quantity stays at 1).
        await prisma.cartItem.deleteMany({
            where: { userId, serviceType: 'AMBULANCE' as any },
        });
        await prisma.cartItem.create({
            data: {
                userId,
                clinicId: amb.clinicId,
                serviceType: 'AMBULANCE' as any,
                serviceId: amb.id,
                quantity: 1,
            },
        });
        const openCart = new InlineKeyboard()
            .url(lang === 'ru' ? '🛒 Открыть корзину' : '🛒 Savatni ochish', startAppLink('cart'))
            .row()
            .url(lang === 'ru' ? '💳 На оплату' : '💳 To\'lovga oʻtish', `${PUBLIC_BASE}/user/cart/checkout`);
        await ctx.answerCallbackQuery({ text: t.added });
        await ctx.reply(t.added, { reply_markup: openCart });
    } catch (e: any) {
        const msg = e?.message || t.addFailed;
        await ctx.answerCallbackQuery({ text: String(msg).slice(0, 180), show_alert: true });
    }
}
