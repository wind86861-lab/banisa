import { Bot, InlineKeyboard, InputFile, Keyboard } from 'grammy';
import prisma from '../../config/database';
import { registerOrLoginViaContact } from './telegram.register';
import {
    renderMyAppointments, renderAppointmentDetail,
    renderCart, renderCartItemDetail,
    renderProfile,
    getCartCount, tryCancelAppointment, clearUserCart,
    changeCartItemQty, removeCartItem,
} from './telegram.views';
import {
    renderClinicToday, renderClinicPending, renderClinicBookingDetail,
    renderCashierQueue, renderClinicReport, renderClinicTeam,
    tryClinicAccept, tryClinicCashConfirm,
    ClinicCtx,
} from './clinic.views';
import {
    getWizardState, setWizardState,
    promptPatientSearch, runPatientSearch, renderPatientProfile,
    promptReschedule, runReschedule,
    startBookingWizard, bookingStep1Phone, bookingStep2Services,
    bookingStep3DateTime, bookingStep4Confirm, bookingFinalize,
} from './clinic.wizards';
import { ClinicPermission } from '@prisma/client';
import { env } from '../../config/env';
import { parseReportArgs, buildReport, formatReportText, buildReportPdf } from './admin-report.service';
import {
    sendSkoryMenu, handleNearestPrompt, handleCheapest, handleLocationReceived,
    handleAddToCart, isAwaitingLocation, clearAwaitingLocation,
} from './skory.handlers';
import {
    registerSkoryHandlers,
    handleSkoryPickup,
    handleSkoryDescription,
    handleSkoryPriceText,
} from './skory.bot';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const PUBLIC_BASE = (process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');
const BOT_USERNAME_ENV = process.env.TELEGRAM_BOT_USERNAME || 'banisauzbot';

/**
 * Build a t.me/<bot>?startapp=<param> deep link.
 *
 * Every patient destination the bot offers is a deep link, not a plain URL.
 * Plain URLs open in Telegram's in-app browser — no initData, no refresh
 * cookie, the patient can't be detected. Deep links open the Mini App at
 * the configured root URL with start_param attached; main.jsx rewrites the
 * URL to the target screen before React mounts.
 */
function startApp(param: string): string {
    return `https://t.me/${BOT_USERNAME_ENV}?startapp=${encodeURIComponent(param)}`;
}

type Lang = 'uz' | 'ru';

const LABELS: Record<Lang, Record<string, string>> = {
    uz: {
        services: '🩺 Xizmatlar',
        clinics: '🏥 Klinikalar',
        doctors: '👨‍⚕️ Doktorlar',
        bookings: '📅 Bronlarim',
        skory: '🆘 Tez yordam',
        settings: '⚙️ Sozlamalar',
        notifs: '🔔 Bildirishnomalar',
        profile: '👤 Profil',
        cart: '🛒 Savat',
        menuTitle: '👇 Asosiy menyu',
        notLinkedHint: 'Botni hisobingizga bog\'lash kerak. Saytda → Bildirishnoma sozlamalari → Telegram bog\'lash.',
        menuBtnLabel: '🏥 Banisa',
        open: 'Ochish',
        replyHint: 'Pastdagi tugmalar — tez kirish uchun. Bo\'limni tanlang 👇',
        sharePhoneBtn: '📱 Telefon raqamni yuborish',
        sharePhoneTitle: 'Banisa\'ga xush kelibsiz! 🎉',
        sharePhoneBody:
            'Botdan to\'liq foydalanish uchun ro\'yxatdan o\'tasiz.\n\n' +
            'Pastdagi <b>Telefon raqamni yuborish</b> tugmasini bosing — siz Banisa bemori sifatida ro\'yxatdan o\'tasiz va shu yerda avtomatik kirasiz.\n\n' +
            'Telefon raqamingiz faqat Banisa\'da saqlanadi. Boshqa joyga uzatilmaydi.',
        registerSuccess: '✅ Ro\'yxatdan o\'tdingiz! Endi bron qilish va bildirishnomalarni shu yerda olasiz.',
        loginSuccess: '✅ Xush kelibsiz! Hisobingiz Telegram bilan bog\'landi.',
        contactInvalid: '❌ Telefon raqami noto\'g\'ri. Iltimos, qaytadan urinib ko\'ring.',
        contactNotOwn: '❌ Iltimos, faqat <b>o\'zingizning</b> kontaktingizni yuboring. "Telefon raqamni yuborish" tugmasidan foydalaning.',
        contactError: '❌ Xato yuz berdi. Birozdan keyin urinib ko\'ring.',
        // ─ Clinic-side
        clinicToday: '📋 Bugungi',
        clinicPending: '⏳ Kutilayotgan',
        clinicCashier: '💵 Kassa',
        clinicReport: '📊 Hisobot',
        clinicTeam: '👥 Jamoa',
        clinicSwitch: '🔄 Klinikani almashtirish',
        clinicSearch: '🔍 Bemor qidirish',
        clinicNewBooking: '➕ Yangi bron',
        // ─ Dispatcher (ambulance driver linked via Ambulance.dispatcherUserId)
        dispMyAmb: '🚑 Mening ambulansim',
        dispLive: '🔴 Live Location',
        dispHistory: '📋 So\'rovlar tarixi',
    },
    ru: {
        services: '🩺 Услуги',
        clinics: '🏥 Клиники',
        doctors: '👨‍⚕️ Врачи',
        bookings: '📅 Мои брони',
        skory: '🆘 Скорая помощь',
        settings: '⚙️ Настройки',
        notifs: '🔔 Уведомления',
        profile: '👤 Профиль',
        cart: '🛒 Корзина',
        menuTitle: '👇 Главное меню',
        notLinkedHint: 'Сначала привяжите бот к аккаунту. На сайте → Настройки уведомлений → Привязать Telegram.',
        menuBtnLabel: '🏥 Banisa',
        open: 'Открыть',
        replyHint: 'Кнопки снизу — для быстрого доступа. Выберите раздел 👇',
        sharePhoneBtn: '📱 Отправить номер телефона',
        sharePhoneTitle: 'Добро пожаловать в Banisa! 🎉',
        sharePhoneBody:
            'Чтобы пользоваться ботом полностью, нужно зарегистрироваться.\n\n' +
            'Нажмите кнопку <b>Отправить номер телефона</b> — вы будете зарегистрированы как пациент Banisa и автоматически войдёте.\n\n' +
            'Ваш номер хранится только в Banisa и никуда не передаётся.',
        registerSuccess: '✅ Регистрация прошла! Брони и уведомления теперь приходят сюда.',
        loginSuccess: '✅ С возвращением! Аккаунт привязан к Telegram.',
        contactInvalid: '❌ Неверный номер телефона. Попробуйте снова.',
        contactNotOwn: '❌ Пожалуйста, отправьте только <b>свой собственный</b> контакт через кнопку "Отправить номер телефона".',
        contactError: '❌ Произошла ошибка. Попробуйте чуть позже.',
        // ─ Clinic-side
        clinicToday: '📋 Сегодня',
        clinicPending: '⏳ Ожидающие',
        clinicCashier: '💵 Касса',
        clinicReport: '📊 Отчёт',
        clinicTeam: '👥 Команда',
        clinicSwitch: '🔄 Сменить клинику',
        clinicSearch: '🔍 Поиск пациента',
        clinicNewBooking: '➕ Новая бронь',
        // ─ Dispatcher
        dispMyAmb: '🚑 Моя машина',
        dispLive: '🔴 Live Location',
        dispHistory: '📋 История вызовов',
    },
};

/**
 * Main inline menu. Uses plain `url` buttons (always render and open in
 * the user's preferred browser) — switching to web_app requires the Mini
 * App URL to be configured in BotFather, otherwise Telegram silently
 * drops the entire reply_markup.
 *
 * For unbound users we hide patient-only rows (Bronlarim, Savat, Profil,
 * Bildirishnomalar, Sozlamalar) since opening them prompts a login.
 */
function mainMenu(lang: Lang, linked: boolean): InlineKeyboard {
    const L = LABELS[lang];
    const kb = new InlineKeyboard()
        .url(L.services, startApp('services'))
        .url(L.clinics,  startApp('clinics')).row()
        .url(L.doctors,  startApp('doctors'))
        .url(L.skory,    startApp('skory')).row();

    if (linked) {
        kb.url(L.bookings, startApp('appointments'))
          .url(L.cart,     startApp('cart')).row()
          .url(L.notifs,   startApp('notifications'))
          .url(L.profile,  startApp('profile')).row()
          .url(L.settings, startApp('notification-settings'));
    }
    return kb;
}

/**
 * One-tap "share my phone" reply keyboard. The single button has
 * `request_contact: true` so Telegram itself prompts the user and sends a
 * native contact message to the bot when accepted.
 *
 * Shown only when /start has no token and the chat is not yet linked.
 */
function sharePhoneKeyboard(lang: Lang): Keyboard {
    return new Keyboard()
        .requestContact(LABELS[lang].sharePhoneBtn).row()
        .resized()
        .oneTime();
}

/**
 * Persistent reply keyboard (lives at the bottom of the chat). Text-only
 * so it renders without BotFather Mini App registration. When the user
 * taps one, the bot replies natively (bookings/cart/profile) or with an
 * inline url button (services/clinics/etc).
 *
 * `cartCount` adds a small (N) badge to the Savat button so the user sees
 * pending items at a glance without opening it.
 */
function replyKeyboard(lang: Lang, linked: boolean, cartCount = 0): Keyboard {
    const L = LABELS[lang];
    const kb = new Keyboard()
        .text(L.services).text(L.clinics).row()
        .text(L.doctors).text(L.skory).row();
    if (linked) {
        const cartLabel = cartCount > 0 ? `${L.cart} (${cartCount})` : L.cart;
        kb.text(L.bookings).text(cartLabel).row()
          .text(L.notifs).text(L.profile).row();
    }
    return kb.resized().persistent();
}

/**
 * Render the reply keyboard with a fresh cart count (if linked). Quietly
 * falls back to 0 on any DB error — the keyboard should never block the bot.
 */
async function freshReplyKeyboard(userId: string | null, lang: Lang, linked: boolean): Promise<Keyboard> {
    if (!linked || !userId) return replyKeyboard(lang, linked, 0);
    try {
        const count = await getCartCount(userId);
        return replyKeyboard(lang, linked, count);
    } catch {
        return replyKeyboard(lang, linked, 0);
    }
}

/**
 * Clinic-side persistent keyboard. Only shown to users with at least one
 * active clinic membership; the patient keyboard remains underneath as a
 * second row pair so a member can still browse the consumer side without
 * switching context.
 */
function clinicReplyKeyboard(lang: Lang): Keyboard {
    const L = LABELS[lang];
    return new Keyboard()
        .text(L.clinicToday).text(L.clinicPending).row()
        .text(L.clinicCashier).text(L.clinicReport).row()
        .text(L.clinicTeam).text(L.clinicSwitch).row()
        .resized().persistent();
}

/**
 * Resolve the bot user's active ClinicCtx — which clinic they're acting
 * against, their role, permissions. Returns null when the user has no
 * active membership (the patient keyboard alone is shown then).
 *
 * Multi-clinic users get the first active membership by default. /switch_clinic
 * sets `activeClinicId` on the TelegramAccount row so subsequent ticks pick
 * that one up.
 */
async function loadClinicCtx(chatId: number): Promise<ClinicCtx | null> {
    try {
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { userId: true, language: true, activeClinicId: true },
        });
        if (!acc?.userId) return null;
        const memberships = await prisma.clinicMembership.findMany({
            where: { userId: acc.userId, isActive: true },
            include: { role: { select: { id: true, name: true, permissions: true } } },
            orderBy: { joinedAt: 'asc' },
        });
        if (memberships.length === 0) return null;
        const chosen = memberships.find(m => m.clinicId === acc.activeClinicId) ?? memberships[0];
        return {
            userId: acc.userId,
            clinicId: chosen.clinicId,
            membershipId: chosen.id,
            roleName: chosen.role.name,
            permissions: chosen.role.permissions,
            lang: acc.language === 'ru' ? 'ru' : 'uz',
        };
    } catch (e) {
        console.error('[bot] loadClinicCtx failed:', e);
        return null;
    }
}

/** Patient + (optionally) clinic keyboard stacked together. */
/**
 * True if this user is the dispatcher for at least one active ambulance.
 * Drives a separate keyboard variant so dispatchers don't see patient
 * ordering rows (they receive offers, they don't place them).
 */
async function isAmbulanceDispatcher(userId: string): Promise<boolean> {
    try {
        const hit = await prisma.ambulance.findFirst({
            where: { dispatcherUserId: userId, isActive: true },
            select: { id: true },
        });
        return !!hit;
    } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher native views (rendered inline when reply-keyboard button is tapped)
// ─────────────────────────────────────────────────────────────────────────────

const AMB_STATUS_LABEL: Record<string, { uz: string; ru: string }> = {
    AVAILABLE:  { uz: "🟢 Bo'sh",        ru: '🟢 Свободна' },
    BUSY:       { uz: '🟡 Bandda',       ru: '🟡 Занята' },
    MAINTENANCE:{ uz: '🔧 Texnik xizmat', ru: '🔧 Техобслуживание' },
    OFFLINE:    { uz: "⚪ O'chiq",        ru: '⚪ Не на смене' },
};

async function renderDispatcherMyAmbulance(userId: string, lang: Lang) {
    const amb = await prisma.ambulance.findFirst({
        where: { dispatcherUserId: userId, isActive: true },
        include: { clinic: { select: { nameUz: true, phones: true } } },
    });
    if (!amb) {
        return {
            text: lang === 'ru' ? 'Машина не привязана.' : 'Ambulans biriktirilmagan.',
            keyboard: undefined as any,
        };
    }
    const status = AMB_STATUS_LABEL[amb.status]?.[lang] ?? amb.status;
    const liveOn = amb.liveLocationUntil && amb.liveLocationUntil > new Date();
    const liveLine = liveOn
        ? (lang === 'ru'
            ? `🔴 Live ON · до ${amb.liveLocationUntil!.toLocaleTimeString('ru')}`
            : `🔴 Live yoqilgan · ${amb.liveLocationUntil!.toLocaleTimeString('uz-UZ')} gacha`)
        : (lang === 'ru' ? '⚪ Live выключен' : '⚪ Live o\'chiq');
    const lines = [
        `🚑 <b>${amb.callSign}</b>${amb.vehicleModel ? ` · ${amb.vehicleModel}` : ''}`,
        `🏥 ${amb.clinic?.nameUz}`,
        `Status: ${status}`,
        liveLine,
    ];
    if (amb.licensePlate) lines.push(`Davlat raqami: ${amb.licensePlate}`);
    if (amb.lastStatusAt) {
        const ago = Math.round((Date.now() - amb.lastStatusAt.getTime()) / 60000);
        lines.push(lang === 'ru' ? `Последнее обновление: ${ago} мин назад` : `Oxirgi yangilanish: ${ago} daq oldin`);
    }
    return { text: lines.join('\n'), keyboard: undefined as any };
}

async function renderDispatcherLiveHelp(userId: string, lang: Lang) {
    const amb = await prisma.ambulance.findFirst({
        where: { dispatcherUserId: userId, isActive: true },
        select: { liveLocationUntil: true },
    });
    const liveOn = amb?.liveLocationUntil && amb.liveLocationUntil > new Date();
    const status = liveOn
        ? (lang === 'ru' ? '🔴 Live: ВКЛ' : '🔴 Live: YOQILGAN')
        : (lang === 'ru' ? '⚪ Live: ВЫКЛ' : '⚪ Live: O\'CHIQ');
    const hint = lang === 'ru'
        ? 'Нажмите кнопку <b>🔴 Live Location</b> внизу → выберите <b>«Транслировать геопозицию»</b> → 8 часов.\n\n' +
          'Если кнопка открывает только карту (на компьютере), используйте Telegram на телефоне — там появится опция Live.'
        : 'Pastdagi <b>🔴 Live Location</b> tugmasini bosing → <b>"Mening joriy joyimni efirga uzatish"</b> ni tanlang → 8 soat.\n\n' +
          'Agar tugma faqat xaritani ko\'rsatsa (kompyuterda), telefon Telegram\'da oching — u yerda Live opsiyasi chiqadi.';
    return { text: `${status}\n\n${hint}` };
}

async function renderDispatcherHistory(userId: string, lang: Lang) {
    const amb = await prisma.ambulance.findFirst({
        where: { dispatcherUserId: userId, isActive: true },
        select: { id: true },
    });
    if (!amb) {
        return { text: lang === 'ru' ? 'Машина не привязана.' : 'Ambulans biriktirilmagan.' };
    }
    const requests = await prisma.ambulanceRequest.findMany({
        where: { acceptedAmbulanceId: amb.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { patient: { select: { firstName: true, lastName: true, phone: true } } },
    });
    if (requests.length === 0) {
        return { text: lang === 'ru' ? 'Пока нет принятых вызовов.' : 'Hozircha qabul qilingan chaqiruvlar yo\'q.' };
    }
    const title = lang === 'ru' ? '📋 <b>Последние 10 вызовов</b>' : '📋 <b>Oxirgi 10 chaqiruv</b>';
    const lines = [title, ''];
    for (const r of requests) {
        const name = [r.patient?.firstName, r.patient?.lastName].filter(Boolean).join(' ') || (lang === 'ru' ? 'Пациент' : 'Bemor');
        const dt = r.createdAt.toLocaleString(lang === 'ru' ? 'ru' : 'uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const km = r.estimatedDistanceKm != null ? ` · ${r.estimatedDistanceKm.toFixed(1)} km` : '';
        const status = AMB_STATUS_LABEL[r.status as any]?.[lang] ?? r.status;
        lines.push(`• ${dt} — <b>${name}</b>${km} · ${status}`);
    }
    return { text: lines.join('\n') };
}

async function smartKeyboard(userId: string | null, lang: Lang, linked: boolean, chatId: number): Promise<Keyboard> {
    if (!linked || !userId) return replyKeyboard(lang, linked, 0);
    const [count, ctx, isDispatcher] = await Promise.all([
        getCartCount(userId).catch(() => 0),
        loadClinicCtx(chatId),
        isAmbulanceDispatcher(userId),
    ]);
    const L = LABELS[lang];
    const kb = new Keyboard();
    if (ctx) {
        // Clinic rows first — that's the operational context for members
        kb.text(L.clinicToday).text(L.clinicPending).row()
          .text(L.clinicCashier).text(L.clinicReport).row()
          .text(L.clinicSearch).text(L.clinicNewBooking).row()
          .text(L.clinicTeam).text(L.profile).row();
    } else if (isDispatcher) {
        // Dispatcher: receive-only role. No services/clinics/skory/cart —
        // patient ordering happens on banisa.uz or via a different account.
        // Live Location is a requestLocation button so a single tap opens
        // Telegram's location-share dialog (which on mobile includes
        // "Share My Live Location" with 15min/1h/8h options). Desktop
        // clients fall through to the disp-live native view with text
        // instructions.
        kb.text(L.dispMyAmb).requestLocation(L.dispLive).row()
          .text(L.dispHistory).text(L.profile).row()
          .text(L.notifs).row();
    } else {
        kb.text(L.services).text(L.clinics).row()
          .text(L.doctors).text(L.skory).row()
          .text(L.bookings).text(count > 0 ? `${L.cart} (${count})` : L.cart).row()
          .text(L.notifs).text(L.profile).row();
    }
    return kb.resized().persistent();
}

/**
 * Routes a tapped reply-keyboard label. Returns either:
 *   - { kind: 'url' } — public/browse section that opens in the user's browser
 *   - { kind: 'view' } — patient-private content rendered natively in the bot
 *
 * Native views (bookings/cart/profile) keep the user inside Telegram — they
 * read live data instead of just sending a URL.
 */
type ReplyRoute =
    | { kind: 'url'; param: string; label: string }
    | { kind: 'view'; view: 'bookings' | 'cart' | 'profile' | 'notifs' | 'disp-my-amb' | 'disp-live' | 'disp-history'; label: string };

function routeReplyLabel(lang: Lang, text: string): ReplyRoute | null {
    const L = LABELS[lang];
    // url kind: shipped as t.me deep links downstream so they open in the
    // Mini App, not Telegram's in-app browser (browser has no initData →
    // patient can't be detected).
    const urls: Record<string, { param: string; label: string }> = {
        [LABELS.uz.services]: { param: 'services', label: L.services },
        [LABELS.ru.services]: { param: 'services', label: L.services },
        [LABELS.uz.clinics]:  { param: 'clinics',  label: L.clinics },
        [LABELS.ru.clinics]:  { param: 'clinics',  label: L.clinics },
        [LABELS.uz.doctors]:  { param: 'doctors',  label: L.doctors },
        [LABELS.ru.doctors]:  { param: 'doctors',  label: L.doctors },
        [LABELS.uz.skory]:    { param: 'skory',    label: L.skory },
        [LABELS.ru.skory]:    { param: 'skory',    label: L.skory },
    };
    if (urls[text]) return { kind: 'url', ...urls[text] };

    const views: Record<string, { view: 'bookings' | 'cart' | 'profile' | 'notifs' | 'disp-my-amb' | 'disp-live' | 'disp-history'; label: string }> = {
        [LABELS.uz.bookings]:  { view: 'bookings',     label: L.bookings },
        [LABELS.ru.bookings]:  { view: 'bookings',     label: L.bookings },
        [LABELS.uz.cart]:      { view: 'cart',         label: L.cart },
        [LABELS.ru.cart]:      { view: 'cart',         label: L.cart },
        [LABELS.uz.profile]:   { view: 'profile',      label: L.profile },
        [LABELS.ru.profile]:   { view: 'profile',      label: L.profile },
        [LABELS.uz.notifs]:    { view: 'notifs',       label: L.notifs },
        [LABELS.uz.dispMyAmb]: { view: 'disp-my-amb',  label: L.dispMyAmb },
        [LABELS.ru.dispMyAmb]: { view: 'disp-my-amb',  label: L.dispMyAmb },
        [LABELS.uz.dispLive]:  { view: 'disp-live',    label: L.dispLive },
        [LABELS.ru.dispLive]:  { view: 'disp-live',    label: L.dispLive },
        [LABELS.uz.dispHistory]: { view: 'disp-history', label: L.dispHistory },
        [LABELS.ru.dispHistory]: { view: 'disp-history', label: L.dispHistory },
        [LABELS.ru.notifs]:   { view: 'notifs',   label: L.notifs },
    };
    if (views[text]) return { kind: 'view', ...views[text] };
    return null;
}

type ClinicView = 'today' | 'pending' | 'cashier' | 'report' | 'team' | 'switch' | 'search' | 'newbooking';

function routeClinicLabel(lang: Lang, text: string): ClinicView | null {
    const map: Record<string, ClinicView> = {
        [LABELS.uz.clinicToday]: 'today',  [LABELS.ru.clinicToday]: 'today',
        [LABELS.uz.clinicPending]: 'pending', [LABELS.ru.clinicPending]: 'pending',
        [LABELS.uz.clinicCashier]: 'cashier', [LABELS.ru.clinicCashier]: 'cashier',
        [LABELS.uz.clinicReport]: 'report',   [LABELS.ru.clinicReport]: 'report',
        [LABELS.uz.clinicTeam]: 'team',       [LABELS.ru.clinicTeam]: 'team',
        [LABELS.uz.clinicSwitch]: 'switch',   [LABELS.ru.clinicSwitch]: 'switch',
        [LABELS.uz.clinicSearch]: 'search',   [LABELS.ru.clinicSearch]: 'search',
        [LABELS.uz.clinicNewBooking]: 'newbooking', [LABELS.ru.clinicNewBooking]: 'newbooking',
    };
    return map[text] || null;
}

async function handleClinicReply(ctx: any, ctxCl: ClinicCtx, view: ClinicView): Promise<void> {
    const reply = async (text: string, keyboard: any) =>
        ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });

    if (view === 'today') {
        if (!ctxCl.permissions.includes(ClinicPermission.BOOKING_VIEW)) {
            await ctx.reply('Ruxsat yo\'q'); return;
        }
        const r = await renderClinicToday(ctxCl); await reply(r.text, r.keyboard); return;
    }
    if (view === 'pending') {
        if (!ctxCl.permissions.includes(ClinicPermission.BOOKING_VIEW)) {
            await ctx.reply('Ruxsat yo\'q'); return;
        }
        const r = await renderClinicPending(ctxCl); await reply(r.text, r.keyboard); return;
    }
    if (view === 'cashier') {
        if (!ctxCl.permissions.includes(ClinicPermission.PAYMENT_VIEW)
            && !ctxCl.permissions.includes(ClinicPermission.PAYMENT_CONFIRM_CASH)) {
            await ctx.reply('Ruxsat yo\'q'); return;
        }
        const r = await renderCashierQueue(ctxCl); await reply(r.text, r.keyboard); return;
    }
    if (view === 'report') {
        if (!ctxCl.permissions.includes(ClinicPermission.REPORTS_DAILY)) {
            await ctx.reply('Ruxsat yo\'q'); return;
        }
        const r = await renderClinicReport(ctxCl); await reply(r.text, r.keyboard); return;
    }
    if (view === 'team') {
        if (!ctxCl.permissions.includes(ClinicPermission.TEAM_VIEW)) {
            await ctx.reply('Ruxsat yo\'q'); return;
        }
        const r = await renderClinicTeam(ctxCl); await reply(r.text, r.keyboard); return;
    }
    if (view === 'search') {
        if (!ctxCl.permissions.includes(ClinicPermission.PATIENT_VIEW)) {
            await ctx.reply('Ruxsat yo\'q'); return;
        }
        const chatId = ctx.chat?.id;
        if (chatId) await setWizardState(chatId, { kind: 'search' });
        const r = await promptPatientSearch(ctxCl);
        await reply(r.text, r.keyboard);
        return;
    }
    if (view === 'newbooking') {
        if (!ctxCl.permissions.includes(ClinicPermission.BOOKING_ACCEPT)) {
            await ctx.reply('Ruxsat yo\'q'); return;
        }
        const chatId = ctx.chat?.id;
        if (chatId) await setWizardState(chatId, { kind: 'booking', data: { step: 1 } });
        const r = await startBookingWizard(ctxCl);
        await reply(r.text, r.keyboard);
        return;
    }
    if (view === 'switch') {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const memberships = await prisma.clinicMembership.findMany({
            where: { userId: ctxCl.userId, isActive: true },
            include: { clinic: { select: { id: true, nameUz: true } }, role: { select: { name: true } } },
        });
        if (memberships.length < 2) {
            await ctx.reply(ctxCl.lang === 'ru'
                ? 'Вы состоите только в одной клинике.'
                : 'Siz faqat bitta klinika a\'zosisiz.');
            return;
        }
        const kb = new InlineKeyboard();
        for (const m of memberships) {
            const tag = m.clinicId === ctxCl.clinicId ? ' ✓' : '';
            kb.text(`${m.clinic.nameUz} (${m.role.name})${tag}`, `clinic:switch:${m.clinicId}`).row();
        }
        await ctx.reply(
            ctxCl.lang === 'ru' ? 'Выберите клинику:' : 'Klinikani tanlang:',
            { reply_markup: kb },
        );
        return;
    }
}

/**
 * Routes free-text the patient/operator just sent into the active wizard.
 * Each wizard owns its parser; on success/failure the wizard state is
 * either advanced (data merged) or cleared so the keyboard goes back to
 * normal text-dispatch.
 */
async function handleWizardText(ctx: any, ctxCl: ClinicCtx, wizard: any, text: string): Promise<void> {
    const reply = async (t: string, kb: any) => ctx.reply(t, { parse_mode: 'HTML', reply_markup: kb });
    const chatId = ctx.chat?.id;

    // Skoriy wizard owns description text on step 4.
    if (wizard.kind === 'skory' && wizard.data?.step === 4) {
        try {
            await handleSkoryDescription(ctx, text);
        } catch (e) {
            console.error('[bot] skory description failed:', e);
            if (chatId) await setWizardState(chatId, null);
            await ctx.reply('Wizard xato — qaytadan boshlang');
        }
        return;
    }

    // Skoriy wizard owns price text on step 3 with sub:'await_price'.
    if (wizard.kind === 'skory' && wizard.data?.step === 3 && wizard.data?.sub === 'await_price') {
        try {
            await handleSkoryPriceText(ctx, text);
        } catch (e) {
            console.error('[bot] skory price text failed:', e);
            if (chatId) await setWizardState(chatId, null);
            await ctx.reply('Wizard xato — qaytadan boshlang');
        }
        return;
    }

    if (wizard.kind === 'search') {
        const r = await runPatientSearch(ctxCl, text);
        if (chatId) await setWizardState(chatId, null);
        await reply(r.text, r.keyboard);
        return;
    }

    if (typeof wizard.kind === 'string' && wizard.kind.startsWith('reschedule:')) {
        const apptId = wizard.kind.slice('reschedule:'.length);
        const r = await runReschedule(ctxCl, apptId, text);
        if (chatId) await setWizardState(chatId, null);
        if (!r.ok) {
            await ctx.reply(`❌ ${r.error}`);
            return;
        }
        await ctx.reply(`✅ Ko'chirildi: ${r.newAt?.toISOString().slice(0, 16)}`);
        const detail = await renderClinicBookingDetail(ctxCl, apptId);
        if (detail) await reply(detail.text, detail.keyboard);
        return;
    }

    if (wizard.kind === 'booking' && wizard.data?.step === 1) {
        const r = await bookingStep1Phone(ctxCl, text);
        if (r.next === 'service' && chatId) {
            await setWizardState(chatId, { kind: 'booking', data: { ...wizard.data, step: 2, ...r.data } });
        }
        await reply(r.text, r.keyboard);
        return;
    }

    if (wizard.kind === 'booking' && wizard.data?.step === 3) {
        // Datetime input → step 4 (confirmation preview)
        const preview = await bookingStep4Confirm(ctxCl, wizard.data, text);
        if (!preview.ok) {
            await ctx.reply(`❌ ${preview.error}`);
            return;
        }
        if (chatId) await setWizardState(chatId, { kind: 'booking', data: { ...wizard.data, step: 4 } });
        if (preview.preview) await reply(preview.preview.text, preview.preview.keyboard);
        return;
    }

    // Unknown state: drop it and nudge with the main keyboard.
    if (chatId) await setWizardState(chatId, null);
    await ctx.reply('Wizard yopildi. Davom etish uchun tugmani bosing.');
}

async function lookupLang(chatId: number): Promise<Lang> {
    try {
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { language: true },
        });
        return acc?.language === 'ru' ? 'ru' : 'uz';
    } catch { return 'uz'; }
}

/**
 * Singleton bot instance. Lazy because we want startup to succeed even
 * when TELEGRAM_BOT_TOKEN is missing (dev environments).
 */
let _bot: Bot | null = null;
let _botUsername: string | null = process.env.TELEGRAM_BOT_USERNAME || null;

export function isTelegramConfigured(): boolean {
    return Boolean(TOKEN);
}

export function getBot(): Bot | null {
    if (!TOKEN) return null;
    if (_bot) return _bot;
    _bot = new Bot(TOKEN);
    registerHandlers(_bot);
    return _bot;
}

/**
 * Set the default chat menu button (next to the text input) to open the
 * Banisa Mini App. Persists on Telegram's side — only needs to run once
 * per bot, but we call it on every boot to be safe (it's idempotent).
 *
 * `web_app.url` does NOT require BotFather Mini App registration; it just
 * needs to be HTTPS. Falls back to a plain commands button if it fails.
 */
export async function setupChatMenuButton(): Promise<void> {
    const bot = getBot();
    if (!bot) return;
    try {
        await bot.api.setChatMenuButton({
            menu_button: {
                type: 'web_app',
                text: LABELS.uz.menuBtnLabel,
                web_app: { url: PUBLIC_BASE },
            } as any,
        });
        console.log('[telegram] menu button set → web_app:', PUBLIC_BASE);
    } catch (e) {
        console.error('[telegram] setChatMenuButton failed:', e);
    }
}

/**
 * Register the bot's command list (shown in Telegram's command popup).
 * Idempotent — re-runs on every boot are fine.
 */
export async function setupBotCommands(): Promise<void> {
    const bot = getBot();
    if (!bot) return;
    try {
        await bot.api.setMyCommands([
            { command: 'start', description: 'Botni boshlash / Запустить' },
            { command: 'menu', description: 'Asosiy menyu / Главное меню' },
            { command: 'myappointments', description: 'Bronlarim / Мои брони' },
            { command: 'cart', description: 'Savat / Корзина' },
            { command: 'profile', description: 'Profil / Профиль' },
            { command: 'lang', description: 'Til / Язык' },
            { command: 'status', description: 'Bog\'lanish holati / Статус' },
            { command: 'help', description: 'Yordam / Помощь' },
            { command: 'unlink', description: 'Botni uzish / Отвязать' },
        ]);
        console.log('[telegram] bot commands registered');
    } catch (e) {
        console.error('[telegram] setMyCommands failed:', e);
    }
}

export async function getBotUsername(): Promise<string | null> {
    if (_botUsername) return _botUsername;
    const bot = getBot();
    if (!bot) return null;
    try {
        const me = await bot.api.getMe();
        _botUsername = me.username;
        return _botUsername;
    } catch (e) {
        console.error('[telegram] getMe failed:', e);
        return null;
    }
}

function registerHandlers(bot: Bot) {
    // Skoriy dispatch — wizard + accept/decline callbacks. Registered
    // BEFORE existing skory:nearest/skory:cheapest so the more specific
    // patterns (skory:start, skory:dest:..., skory:offer:accept:...) take
    // priority over any catch-alls.
    registerSkoryHandlers(bot);

    bot.command('start', async (ctx) => {
        const token = ctx.match?.trim();
        const tgUser = ctx.from;
        const chatId = ctx.chat?.id;
        if (!tgUser || !chatId) return;

        if (!token) {
            const existing = await (prisma as any).telegramAccount.findUnique({
                where: { chatId: BigInt(chatId) },
                select: { language: true, userId: true },
            });
            const lang: Lang = existing?.language === 'ru'
                ? 'ru'
                : (tgUser.language_code === 'ru' ? 'ru' : 'uz');
            const linked = Boolean(existing?.userId);

            if (linked) {
                const intro = lang === 'ru'
                    ? 'С возвращением! Меню ниже 👇'
                    : 'Qaytib kelganingiz uchun rahmat! Menyu pastda 👇';
                const kb = await smartKeyboard(existing!.userId!, lang, true, chatId);
                await ctx.reply(intro, { reply_markup: kb });
                await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, true) });
                return;
            }

            // Not bound — kick off in-bot register/login by asking for the
            // user's phone via Telegram's native contact-share dialog.
            await ctx.reply(LABELS[lang].sharePhoneTitle, { parse_mode: 'HTML' });
            await ctx.reply(LABELS[lang].sharePhoneBody, {
                parse_mode: 'HTML',
                reply_markup: sharePhoneKeyboard(lang),
            });
            return;
        }

        try {
            await prisma.$transaction(async (tx) => {
                const row = await (tx as any).telegramLoginToken.findUnique({ where: { token } });
                if (!row) throw new Error('not_found');
                if (row.usedAt) throw new Error('used');
                if (row.expiresAt < new Date()) throw new Error('expired');

                await (tx as any).telegramAccount.upsert({
                    where: { userId: row.userId },
                    update: {
                        chatId: BigInt(chatId),
                        telegramUserId: BigInt(tgUser.id),
                        username: tgUser.username || null,
                        firstName: tgUser.first_name || null,
                        language: tgUser.language_code === 'ru' ? 'ru' : 'uz',
                        isBlocked: false,
                        lastSeenAt: new Date(),
                    },
                    create: {
                        userId: row.userId,
                        chatId: BigInt(chatId),
                        telegramUserId: BigInt(tgUser.id),
                        username: tgUser.username || null,
                        firstName: tgUser.first_name || null,
                        language: tgUser.language_code === 'ru' ? 'ru' : 'uz',
                    },
                });

                await (tx as any).telegramLoginToken.update({
                    where: { token },
                    data: { usedAt: new Date() },
                });
            });

            const lang: Lang = tgUser.language_code === 'ru' ? 'ru' : 'uz';
            const justLinked = await (prisma as any).telegramAccount.findUnique({
                where: { chatId: BigInt(chatId) }, select: { userId: true },
            });
            await ctx.reply(
                lang === 'ru'
                    ? '✅ Аккаунт привязан!\n\nТеперь брони, оплаты и напоминания будут приходить сюда.'
                    : '✅ Hisobingiz bog\'landi!\n\nEndi bron, to\'lov va eslatma xabarlarini shu yerda olasiz.',
            );
            const kb = await smartKeyboard(justLinked?.userId ?? null, lang, true, chatId);
            await ctx.reply(LABELS[lang].replyHint, { reply_markup: kb });
            await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, true) });
        } catch (e: any) {
            const reason = e?.message;
            if (reason === 'not_found') {
                await ctx.reply('Havola noto\'g\'ri yoki muddati o\'tgan. Saytda yangi havola yarating.');
            } else if (reason === 'used') {
                await ctx.reply('Bu havola allaqachon ishlatilgan. Saytda yangi havola yarating.');
            } else if (reason === 'expired') {
                await ctx.reply('Havola muddati tugagan (1 soat). Saytda yangi havola yarating.');
            } else {
                console.error('[telegram] /start link failed:', e);
                await ctx.reply('Bog\'lanishda xato. Birozdan keyin urinib ko\'ring.');
            }
        }
    });

    bot.command('help', async (ctx) => {
        const chatId = ctx.chat?.id;
        const lang = chatId ? await lookupLang(chatId) : 'uz';
        const linked = chatId ? Boolean(await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { userId: true },
        })) : false;
        const text = lang === 'ru'
            ? 'Banisa bot — ваш Telegram помощник.\n\n' +
              '• /start — начать\n' +
              '• /menu — главное меню\n' +
              '• /status — состояние привязки\n' +
              '• /lang — выбрать язык\n' +
              '• /unlink — отвязать бот\n\n' +
              'Вопросы — banisa.uz'
            : 'Banisa bot — sizning Telegram yordamchingiz.\n\n' +
              '• /start — botni boshlash\n' +
              '• /menu — asosiy menyu\n' +
              '• /status — bog\'langan hisob holati\n' +
              '• /lang — tilni tanlash (UZ / RU)\n' +
              '• /unlink — botni hisobdan uzish\n\n' +
              'Savol bo\'lsa banisa.uz saytidan murojaat qiling.';
        await ctx.reply(text, { reply_markup: mainMenu(lang, linked) });
    });

    bot.command('menu', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        const linked = Boolean(acc?.userId);
        const kb = await smartKeyboard(acc?.userId ?? null, lang, linked, chatId);
        await ctx.reply(LABELS[lang].replyHint, { reply_markup: kb });
        await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, linked) });
    });

    bot.command('lang', async (ctx) => {
        await ctx.reply('Tilni tanlang / Выберите язык:', {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🇺🇿 O'zbekcha", callback_data: 'lang:uz' },
                    { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
                ]],
            },
        });
    });

    bot.callbackQuery(/^lang:(uz|ru)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        const lang = ctx.match[1] as 'uz' | 'ru';
        if (!chatId) return;
        const updated = await (prisma as any).telegramAccount.updateMany({
            where: { chatId: BigInt(chatId) },
            data: { language: lang },
        });
        await ctx.answerCallbackQuery();
        if (updated.count === 0) {
            await ctx.editMessageText('Avval botni hisobingizga bog\'lang / Сначала привяжите бот к аккаунту.');
            return;
        }
        // Per-chat menu button — Telegram supports a chat-scoped override so
        // the user's chosen language drives the localized "🏥 Banisa" /
        // "🏥 Баниса" label next to the text input.
        try {
            await bot.api.setChatMenuButton({
                chat_id: chatId,
                menu_button: {
                    type: 'web_app',
                    text: lang === 'ru' ? '🏥 Баниса' : LABELS.uz.menuBtnLabel,
                    web_app: { url: PUBLIC_BASE },
                } as any,
            });
        } catch (e) {
            console.error('[telegram] per-chat menu button failed:', e);
        }
        await ctx.editMessageText(
            lang === 'ru'
                ? '✅ Язык установлен: Русский. Все уведомления будут приходить на русском.'
                : "✅ Til o'rnatildi: O'zbekcha. Barcha xabarlar shu tilda keladi.",
        );
    });

    bot.command('status', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            include: { user: { select: { firstName: true, phone: true } } },
        });
        if (!acc) {
            await ctx.reply('Bot hisobingizga bog\'lanmagan. Saytdan bog\'lash mumkin.');
            return;
        }
        const name = acc.user?.firstName || 'Foydalanuvchi';
        await ctx.reply(`✅ Bog\'langan: ${name} (${acc.user?.phone || '—'})`);
    });

    // Tiny universal helper — works in private chats, groups, supergroups,
    // channels. Replies with the current chat's id so a super-admin can
    // copy it into SUPER_ADMIN_TG_GROUP_ID after adding the bot to the
    // ops group.
    bot.command('chatid', async (ctx) => {
        const chatId = ctx.chat?.id;
        const chatType = ctx.chat?.type;
        if (!chatId) return;
        await ctx.reply(
            `🆔 <b>Chat ID:</b> <code>${chatId}</code>\n` +
            `📂 <b>Type:</b> ${chatType}\n\n` +
            'Buni <code>SUPER_ADMIN_TG_GROUP_ID</code> sifatida .env ga qoʻying va serverni restart qiling.',
            { parse_mode: 'HTML' },
        );
    });

    // When the bot is added to a (super)group, DM every bound SUPER_ADMIN
    // with the new chat id and one-line setup instruction. Falls back
    // silently if no admin has bound the bot.
    bot.on('my_chat_member', async (ctx) => {
        try {
            const u = ctx.update.my_chat_member;
            if (!u || !u.new_chat_member) return;
            const newStatus = u.new_chat_member.status;
            const chatType = u.chat.type;
            if (chatType !== 'group' && chatType !== 'supergroup') return;
            if (!['administrator', 'member'].includes(newStatus)) return;

            // Find every bound super-admin and DM them.
            const admins = await prisma.user.findMany({
                where: { role: 'SUPER_ADMIN' as any, isActive: true },
                select: { id: true },
            });
            if (admins.length === 0) return;
            const accs = await (prisma as any).telegramAccount.findMany({
                where: { userId: { in: admins.map(a => a.id) }, isBlocked: false },
                select: { chatId: true },
            });
            const msg =
                `🤝 Bot yangi guruhga qoʻshildi:\n` +
                `<b>${u.chat.title || '—'}</b>\n` +
                `🆔 <code>${u.chat.id}</code>\n\n` +
                `Uni admin gruppa qilish uchun .env ga:\n` +
                `<code>SUPER_ADMIN_TG_GROUP_ID=${u.chat.id}</code>\n` +
                `qoʻshing va serverni restart qiling.`;
            for (const a of accs) {
                try {
                    await ctx.api.sendMessage(Number(a.chatId), msg, { parse_mode: 'HTML' });
                } catch { /* swallow */ }
            }
        } catch (e) {
            console.error('[bot] my_chat_member handler failed:', e);
        }
    });

    /**
     * /report — super-admin group only. Returns a per-clinic summary
     * (text + PDF) for the requested window. Args:
     *   /report            → today
     *   /report day        → today
     *   /report week       → last 7 days
     *   /report month      → current month
     *   /report DD.MM.YYYY DD.MM.YYYY  → custom range (inclusive)
     */
    bot.command('report', async (ctx) => {
        const groupId = env.SUPER_ADMIN_TG_GROUP_ID;
        const chatId = ctx.chat?.id;
        if (!groupId) {
            await ctx.reply('⚠️ Super-admin guruhi sozlanmagan. SUPER_ADMIN_TG_GROUP_ID ni .env ga qoʻying.');
            return;
        }
        if (!chatId || chatId.toString() !== groupId.toString()) {
            await ctx.reply('🚫 /report faqat super-admin guruhida ishlaydi.');
            return;
        }
        const raw = (ctx.message?.text || '').replace(/^\/report(@\S+)?\s*/i, '').trim();
        const range = parseReportArgs(raw);
        if (!range) {
            await ctx.reply(
                '❓ Notoʻgʻri argument.\n\nIshlatish:\n' +
                '<code>/report</code> — bugun\n' +
                '<code>/report day</code> — bugun\n' +
                '<code>/report week</code> — oxirgi 7 kun\n' +
                '<code>/report month</code> — joriy oy\n' +
                '<code>/report 01.06.2026 18.06.2026</code> — sana oraligʻi',
                { parse_mode: 'HTML' },
            );
            return;
        }
        try {
            await ctx.replyWithChatAction('typing');
            const data = await buildReport(range);
            const text = formatReportText(data);
            await ctx.reply(text, { parse_mode: 'HTML' });
            if (data.grandTotal > 0) {
                const pdf = await buildReportPdf(data);
                const fname = `banisa-report-${new Date().toISOString().slice(0, 10)}.pdf`;
                await ctx.replyWithDocument(new InputFile(pdf, fname), {
                    caption: `📄 ${range.label}`,
                });
            }
        } catch (e: any) {
            console.error('[bot /report] failed:', e);
            await ctx.reply('⚠️ Hisobot yaratishda xatolik: ' + (e?.message || 'noma\'lum'));
        }
    });

    bot.command('unlink', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const deleted = await (prisma as any).telegramAccount.deleteMany({
            where: { chatId: BigInt(chatId) },
        });
        if (deleted.count > 0) {
            await ctx.reply('Bot hisobingizdan uzildi. Qaytadan bog\'lash uchun saytga kiring.');
        } else {
            await ctx.reply('Bot hisobingizga bog\'lanmagan edi.');
        }
    });

    /**
     * Contact-share handler — the core of in-Telegram register/login.
     *
     * Triggered when the user taps the request_contact button (sent by /start
     * or by the Mini App's requestContact() call). We validate that the
     * shared contact actually belongs to the sender — otherwise someone
     * could share a friend's contact and hijack their account.
     */
    bot.on('message:contact', async (ctx) => {
        const tgUser = ctx.from;
        const chatId = ctx.chat?.id;
        const contact = ctx.message.contact;
        if (!tgUser || !chatId || !contact) return;

        const lang: Lang = tgUser.language_code === 'ru' ? 'ru' : 'uz';

        // Anti-spoofing: the contact's user_id must match the sender.
        // Telegram only sets `user_id` for contacts shared via request_contact,
        // not for hand-picked phonebook contacts.
        if (!contact.user_id || contact.user_id !== tgUser.id) {
            await ctx.reply(LABELS[lang].contactNotOwn, {
                parse_mode: 'HTML',
                reply_markup: sharePhoneKeyboard(lang),
            });
            return;
        }

        if (!contact.phone_number) {
            await ctx.reply(LABELS[lang].contactInvalid, { reply_markup: sharePhoneKeyboard(lang) });
            return;
        }

        const result = await registerOrLoginViaContact({
            telegramUserId: BigInt(tgUser.id),
            chatId: BigInt(chatId),
            phone: contact.phone_number,
            firstName: contact.first_name || tgUser.first_name || null,
            lastName: contact.last_name || tgUser.last_name || null,
            username: tgUser.username || null,
            language: lang,
        });

        if (!result.success) {
            const errMsg = result.code === 'invalid_phone'
                ? LABELS[lang].contactInvalid
                : LABELS[lang].contactError;
            await ctx.reply(errMsg, { reply_markup: sharePhoneKeyboard(lang) });
            return;
        }

        const welcome = result.created ? LABELS[lang].registerSuccess : LABELS[lang].loginSuccess;
        // Replace the share-phone keyboard with the persistent main keyboard.
        const kb = await smartKeyboard(result.user?.id ?? null, lang, true, chatId);
        await ctx.reply(welcome, { reply_markup: kb });
        await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, true) });

        // Brand-new registrations get a follow-up nudge to set a real
        // login password. Without it they can only re-enter via the bot —
        // brauzer/sayt orqali kira olmaydi.
        if (result.created) {
            const setPwKb = new InlineKeyboard()
                .text(lang === 'ru' ? '🔐 Задать пароль' : '🔐 Parol o\'rnatish', 'profile:password');
            const text = lang === 'ru'
                ? '🔐 <b>Установите пароль</b>\n\nЧтобы входить в аккаунт через сайт (без Telegram), задайте пароль. Ссылка придёт в этот чат и действует 15 минут.'
                : '🔐 <b>Parol oʻrnating</b>\n\nSayt orqali (Telegramsiz) hisobingizga kira olishingiz uchun parol oʻrnating. Havola shu chatga keladi, 15 daqiqa amal qiladi.';
            await ctx.reply(text, { parse_mode: 'HTML', reply_markup: setPwKb });
        }
    });

    // ─── Helper: resolve linked account or short-circuit ──────────────────
    const resolveLinked = async (ctx: any): Promise<{ userId: string; lang: Lang } | null> => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return null; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) {
            await ctx.answerCallbackQuery({ text: LABELS[lang].notLinkedHint, show_alert: true });
            return null;
        }
        return { userId: acc.userId, lang };
    };

    const safeEdit = async (ctx: any, text: string, keyboard: any) => {
        try {
            await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
        } catch {
            // Editing fails if the message is too old or content identical.
            // Fall back to sending a fresh message so the user always sees the
            // result of their action.
            try { await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard }); } catch { /* ignore */ }
        }
    };

    // ─── Appointment: open detail ──────────────────────────────────────────
    bot.callbackQuery(/^appt:show:(.+)$/, async (ctx) => {
        const r = await resolveLinked(ctx); if (!r) return;
        const id = ctx.match[1];
        await ctx.answerCallbackQuery();
        const detail = await renderAppointmentDetail(r.userId, id, r.lang);
        if (!detail) {
            await ctx.reply(r.lang === 'ru' ? 'Бронь не найдена.' : 'Bron topilmadi.');
            return;
        }
        await safeEdit(ctx, detail.text, detail.keyboard);
    });

    // ─── Appointment: back to list ─────────────────────────────────────────
    bot.callbackQuery(/^appt:list$/, async (ctx) => {
        const r = await resolveLinked(ctx); if (!r) return;
        await ctx.answerCallbackQuery();
        const list = await renderMyAppointments(r.userId, r.lang);
        await safeEdit(ctx, list.text, list.keyboard);
    });

    // ─── Appointment: cancel ───────────────────────────────────────────────
    bot.callbackQuery(/^appt:cancel:(.+)$/, async (ctx) => {
        const r = await resolveLinked(ctx); if (!r) return;
        const id = ctx.match[1];
        const result = await tryCancelAppointment(r.userId, id);
        if (!result.ok) {
            const msg = result.error === 'not_cancellable'
                ? (r.lang === 'ru' ? 'Эту бронь нельзя отменить.' : 'Bu bronni bekor qilib bo\'lmaydi.')
                : (r.lang === 'ru' ? 'Бронь не найдена.' : 'Bron topilmadi.');
            await ctx.answerCallbackQuery({ text: msg, show_alert: true });
            return;
        }
        await ctx.answerCallbackQuery({ text: r.lang === 'ru' ? '✅ Отменено' : '✅ Bekor qilindi' });
        const list = await renderMyAppointments(r.userId, r.lang);
        await safeEdit(ctx, list.text, list.keyboard);
    });

    // ─── Cart: open item detail ────────────────────────────────────────────
    bot.callbackQuery(/^cart:item:(.+)$/, async (ctx) => {
        const r = await resolveLinked(ctx); if (!r) return;
        const id = ctx.match[1];
        await ctx.answerCallbackQuery();
        const detail = await renderCartItemDetail(r.userId, id, r.lang);
        if (!detail) {
            await ctx.reply(r.lang === 'ru' ? 'Позиция не найдена.' : 'Xizmat topilmadi.');
            return;
        }
        await safeEdit(ctx, detail.text, detail.keyboard);
    });

    // ─── Cart: back to list ────────────────────────────────────────────────
    bot.callbackQuery(/^cart:list$/, async (ctx) => {
        const r = await resolveLinked(ctx); if (!r) return;
        await ctx.answerCallbackQuery();
        const list = await renderCart(r.userId, r.lang);
        await safeEdit(ctx, list.text, list.keyboard);
    });

    // ─── Cart: qty up/down ─────────────────────────────────────────────────
    bot.callbackQuery(/^cart:qty:noop$/, async (ctx) => { await ctx.answerCallbackQuery(); });
    bot.callbackQuery(/^cart:qty:(.+):(up|down)$/, async (ctx) => {
        const r = await resolveLinked(ctx); if (!r) return;
        const [, id, dir] = ctx.match;
        const delta = dir === 'up' ? 1 : -1;
        const result = await changeCartItemQty(r.userId, id, delta);
        if (!result.ok) {
            await ctx.answerCallbackQuery({
                text: r.lang === 'ru' ? 'Не удалось обновить.' : 'O\'zgartirib bo\'lmadi.',
                show_alert: false,
            });
            return;
        }
        await ctx.answerCallbackQuery();
        if (result.deleted) {
            const list = await renderCart(r.userId, r.lang);
            await safeEdit(ctx, list.text, list.keyboard);
        } else {
            const detail = await renderCartItemDetail(r.userId, id, r.lang);
            if (detail) await safeEdit(ctx, detail.text, detail.keyboard);
        }
    });

    // ─── Cart: remove single item ──────────────────────────────────────────
    bot.callbackQuery(/^cart:remove:(.+)$/, async (ctx) => {
        const r = await resolveLinked(ctx); if (!r) return;
        const id = ctx.match[1];
        const ok = await removeCartItem(r.userId, id);
        await ctx.answerCallbackQuery({
            text: ok
                ? (r.lang === 'ru' ? '🗑 Удалено' : '🗑 O\'chirildi')
                : (r.lang === 'ru' ? 'Не найдено' : 'Topilmadi'),
        });
        const list = await renderCart(r.userId, r.lang);
        await safeEdit(ctx, list.text, list.keyboard);
    });

    // ─── Clinic callbacks ──────────────────────────────────────────────────
    const resolveClinic = async (cbCtx: any): Promise<ClinicCtx | null> => {
        const chatId = cbCtx.chat?.id;
        if (!chatId) { await cbCtx.answerCallbackQuery(); return null; }
        const cl = await loadClinicCtx(chatId);
        if (!cl) {
            await cbCtx.answerCallbackQuery({
                text: 'Klinikada a\'zoligingiz topilmadi',
                show_alert: true,
            });
            return null;
        }
        return cl;
    };

    bot.callbackQuery(/^clinic:today$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        await ctx.answerCallbackQuery();
        const r = await renderClinicToday(cl);
        await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:pending$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        await ctx.answerCallbackQuery();
        const r = await renderClinicPending(cl);
        await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:report$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        await ctx.answerCallbackQuery();
        const r = await renderClinicReport(cl);
        await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:appt:(.+)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        await ctx.answerCallbackQuery();
        const r = await renderClinicBookingDetail(cl, ctx.match[1]);
        if (!r) { await ctx.reply('Bron topilmadi'); return; }
        await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:accept:(.+)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        if (!cl.permissions.includes(ClinicPermission.BOOKING_ACCEPT)) {
            await ctx.answerCallbackQuery({ text: 'Ruxsat yo\'q', show_alert: true });
            return;
        }
        const result = await tryClinicAccept(cl, ctx.match[1]);
        if (!result.ok) {
            await ctx.answerCallbackQuery({ text: result.error || 'Xato', show_alert: true });
            return;
        }
        await ctx.answerCallbackQuery({ text: '✅ Qabul qilindi' });
        const r = await renderClinicBookingDetail(cl, ctx.match[1]);
        if (r) await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:cash:(.+):confirm$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        await ctx.answerCallbackQuery();
        const id = ctx.match[1];
        const appt = await prisma.appointment.findFirst({
            where: { id, clinicId: cl.clinicId },
            select: { price: true },
        });
        const amount = appt?.price ?? 0;
        const kb = new InlineKeyboard()
            .text(`✅ ${amount.toLocaleString('uz-UZ')} UZS qabul`, `clinic:cash:${id}:do:${amount}`).row()
            .text('↩️ Bekor', `clinic:appt:${id}`);
        await safeEdit(ctx,
            `💵 <b>Naqd to'lov tasdiqlash</b>\n\nSumma: <b>${amount.toLocaleString('uz-UZ')} UZS</b>`,
            kb,
        );
    });

    bot.callbackQuery(/^clinic:cash:(.+):do:(\d+)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        if (!cl.permissions.includes(ClinicPermission.PAYMENT_CONFIRM_CASH)) {
            await ctx.answerCallbackQuery({ text: 'Ruxsat yo\'q', show_alert: true });
            return;
        }
        const [, id, amountStr] = ctx.match;
        const result = await tryClinicCashConfirm(cl, id, Number(amountStr));
        if (!result.ok) {
            await ctx.answerCallbackQuery({ text: result.error || 'Xato', show_alert: true });
            return;
        }
        await ctx.answerCallbackQuery({ text: '✅ Tasdiqlandi' });
        const r = await renderClinicBookingDetail(cl, id);
        if (r) await safeEdit(ctx, r.text, r.keyboard);
    });

    // ─── Clinic wizards ───────────────────────────────────────────────────
    bot.callbackQuery(/^clinic:wizard:cancel$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (chatId) await setWizardState(chatId, null);
        await ctx.answerCallbackQuery({ text: 'Bekor qilindi' });
        try { await ctx.editMessageText('↩️ Bekor qilindi'); } catch {}
    });

    bot.callbackQuery(/^clinic:search$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        const chatId = ctx.chat?.id;
        if (chatId) await setWizardState(chatId, { kind: 'search' });
        await ctx.answerCallbackQuery();
        const r = await promptPatientSearch(cl);
        await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:patient:(.+)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        await ctx.answerCallbackQuery();
        const r = await renderPatientProfile(cl, ctx.match[1]);
        if (!r) { await ctx.reply('Bemor topilmadi'); return; }
        await safeEdit(ctx, r.text, r.keyboard);
    });

    // Reschedule entry — sets the wizard state, then awaits a DD.MM HH:MM message
    bot.callbackQuery(/^clinic:resched:(.+)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        if (!cl.permissions.includes(ClinicPermission.BOOKING_RESCHEDULE)) {
            await ctx.answerCallbackQuery({ text: 'Ruxsat yo\'q', show_alert: true });
            return;
        }
        const id = ctx.match[1];
        const chatId = ctx.chat?.id;
        if (chatId) await setWizardState(chatId, { kind: `reschedule:${id}` as any });
        await ctx.answerCallbackQuery();
        const r = await promptReschedule(cl, id);
        await safeEdit(ctx, r.text, r.keyboard);
    });

    // ─── Booking wizard inline steps ─────────────────────────────────────
    bot.callbackQuery(/^clinic:book:type:(DIAGNOSTIC|SURGICAL)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        const type = ctx.match[1] as 'DIAGNOSTIC' | 'SURGICAL';
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const wizard = await getWizardState(chatId);
        if (wizard.kind !== 'booking') {
            await ctx.answerCallbackQuery({ text: 'Wizard topilmadi', show_alert: true });
            return;
        }
        await ctx.answerCallbackQuery();
        await setWizardState(chatId, { kind: 'booking', data: { ...wizard.data, step: 2, serviceType: type } });
        const r = await bookingStep2Services(cl, type);
        await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:book:svc:(DIAGNOSTIC|SURGICAL):([^:]+):(\d+)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        const [, , serviceId, priceStr] = ctx.match;
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const wizard = await getWizardState(chatId);
        if (wizard.kind !== 'booking') { await ctx.answerCallbackQuery(); return; }
        await ctx.answerCallbackQuery();
        await setWizardState(chatId, {
            kind: 'booking',
            data: { ...wizard.data, step: 3, serviceId, price: Number(priceStr) },
        });
        const r = bookingStep3DateTime();
        await safeEdit(ctx, r.text, r.keyboard);
    });

    bot.callbackQuery(/^clinic:book:save:(.+)$/, async (ctx) => {
        const cl = await resolveClinic(ctx); if (!cl) return;
        const iso = ctx.match[1];
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const wizard = await getWizardState(chatId);
        if (wizard.kind !== 'booking') { await ctx.answerCallbackQuery({ text: 'Wizard topilmadi', show_alert: true }); return; }
        const at = new Date(iso);
        const result = await bookingFinalize(cl, wizard.data, at);
        await setWizardState(chatId, null);
        if (!result.ok) {
            await ctx.answerCallbackQuery({ text: result.error || 'Xato', show_alert: true });
            return;
        }
        await ctx.answerCallbackQuery({ text: '✅ Bron yaratildi' });
        try { await ctx.editMessageText(`✅ Bron yaratildi!\n№ <code>${result.appointmentId}</code>`, { parse_mode: 'HTML' }); } catch {}
    });

    bot.callbackQuery(/^clinic:switch:(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const newClinicId = ctx.match[1];
        // Only persist if the user is actually a member.
        const tg = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { userId: true },
        });
        if (!tg?.userId) { await ctx.answerCallbackQuery(); return; }
        const member = await prisma.clinicMembership.findFirst({
            where: { userId: tg.userId, clinicId: newClinicId, isActive: true },
            include: { clinic: { select: { nameUz: true } } },
        });
        if (!member) {
            await ctx.answerCallbackQuery({ text: 'A\'zo emassiz', show_alert: true });
            return;
        }
        await (prisma as any).telegramAccount.update({
            where: { chatId: BigInt(chatId) },
            data: { activeClinicId: newClinicId },
        });
        await ctx.answerCallbackQuery({ text: `✓ ${member.clinic.nameUz}` });
        try { await ctx.editMessageText(`✓ Klinika almashtirildi: <b>${member.clinic.nameUz}</b>`, { parse_mode: 'HTML' }); } catch {}
    });

    bot.callbackQuery(/^cart:clear:confirm$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) { await ctx.answerCallbackQuery(); return; }
        await ctx.answerCallbackQuery();
        const kb = new InlineKeyboard()
            .text(lang === 'ru' ? '✅ Да, очистить' : '✅ Ha, tozalash', 'cart:clear:do')
            .text(lang === 'ru' ? '↩️ Отмена' : '↩️ Bekor', 'cart:cancel');
        try {
            await ctx.editMessageReplyMarkup({ reply_markup: kb });
        } catch { /* ignore */ }
    });

    bot.callbackQuery(/^cart:clear:do$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) { await ctx.answerCallbackQuery(); return; }
        const removed = await clearUserCart(acc.userId);
        await ctx.answerCallbackQuery({
            text: lang === 'ru' ? `🗑 Удалено: ${removed}` : `🗑 O'chirildi: ${removed}`,
        });
        const rendered = await renderCart(acc.userId, lang);
        try {
            await ctx.editMessageText(rendered.text, {
                parse_mode: 'HTML',
                reply_markup: rendered.keyboard,
            });
        } catch { /* ignore */ }
    });

    bot.callbackQuery(/^cart:cancel$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) { await ctx.answerCallbackQuery(); return; }
        await ctx.answerCallbackQuery();
        const rendered = await renderCart(acc.userId, lang);
        try {
            await ctx.editMessageReplyMarkup({ reply_markup: rendered.keyboard });
        } catch { /* ignore */ }
    });

    bot.callbackQuery(/^profile:unlink:confirm$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const lang: Lang = await lookupLang(chatId);
        await ctx.answerCallbackQuery();
        const kb = new InlineKeyboard()
            .text(lang === 'ru' ? '✅ Да, отвязать' : '✅ Ha, uzish', 'profile:unlink:do')
            .text(lang === 'ru' ? '↩️ Отмена' : '↩️ Bekor', 'profile:cancel');
        try { await ctx.editMessageReplyMarkup({ reply_markup: kb }); } catch { /* ignore */ }
    });

    bot.callbackQuery(/^profile:unlink:do$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const lang: Lang = await lookupLang(chatId);
        await (prisma as any).telegramAccount.deleteMany({ where: { chatId: BigInt(chatId) } });
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(
                lang === 'ru'
                    ? '🚪 Бот отвязан от аккаунта. Перепривяжите через сайт.'
                    : '🚪 Bot hisobdan uzildi. Saytda qaytadan bog\'lang.',
            );
        } catch { /* ignore */ }
    });

    bot.callbackQuery(/^profile:password$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) {
            await ctx.answerCallbackQuery({
                text: lang === 'ru' ? 'Сначала войдите в аккаунт' : 'Avval hisobga kiring',
                show_alert: true,
            });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: acc.userId },
            select: { phone: true },
        });
        if (!user?.phone) {
            await ctx.answerCallbackQuery({ text: 'Phone not found', show_alert: true });
            return;
        }
        try {
            const { requestPasswordReset } = await import('../user-auth/password-reset.service');
            await requestPasswordReset(user.phone);
            await ctx.answerCallbackQuery({
                text: lang === 'ru'
                    ? '🔐 Ссылка для пароля отправлена. Откройте её и задайте новый пароль.'
                    : '🔐 Parol o\'rnatish havolasi yuborildi. Uni oching va yangi parolingizni kiriting.',
                show_alert: true,
            });
        } catch (e) {
            console.error('[bot profile:password] failed:', e);
            await ctx.answerCallbackQuery({
                text: lang === 'ru' ? 'Ошибка. Попробуйте позже' : 'Xatolik. Keyinroq urinib koʻring',
                show_alert: true,
            });
        }
    });

    bot.callbackQuery(/^profile:cancel$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) { await ctx.answerCallbackQuery(); return; }
        await ctx.answerCallbackQuery();
        const rendered = await renderProfile(acc.userId, lang);
        try { await ctx.editMessageReplyMarkup({ reply_markup: rendered.keyboard }); } catch {}
    });

    // ─── 🆘 Tez yordam callbacks ────────────────────────────────────────
    bot.callbackQuery(/^skory:nearest$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        await ctx.answerCallbackQuery();
        await handleNearestPrompt(ctx, lang);
    });

    bot.callbackQuery(/^skory:cheapest$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        await ctx.answerCallbackQuery();
        try { await handleCheapest(ctx, lang); }
        catch (e) { console.error('[bot skory:cheapest] failed:', e); }
    });

    bot.callbackQuery(/^skory:add:(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) {
            await ctx.answerCallbackQuery({
                text: lang === 'ru' ? 'Сначала войдите (/start)' : 'Avval botga kiring (/start)',
                show_alert: true,
            });
            return;
        }
        const ambulanceId = ctx.match?.[1];
        if (!ambulanceId) { await ctx.answerCallbackQuery(); return; }
        try { await handleAddToCart(ctx, lang, acc.userId, ambulanceId); }
        catch (e) {
            console.error('[bot skory:add] failed:', e);
            await ctx.answerCallbackQuery({ text: 'Xatolik', show_alert: true });
        }
    });

    bot.callbackQuery(/^lang:menu$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.reply('Tilni tanlang / Выберите язык:', {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🇺🇿 O'zbekcha", callback_data: 'lang:uz' },
                    { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
                ]],
            },
        });
    });

    // ─── Shared location → nearest ambulance ────────────────────────────
    bot.on('message:location', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId || ctx.chat?.type !== 'private') return;
        const loc = ctx.message.location;
        if (!loc) return;

        // Skoriy wizard takes priority over the older "nearest/cheapest"
        // location-prompt flow — if a dispatch wizard is mid-step 1, the
        // shared location becomes its pickup, not a filter for the listing.
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind === 'skory' && (wiz.data?.step === 1 || (wiz.data?.step === 2 && wiz.data?.sub === 'await_dropoff'))) {
            try {
                await handleSkoryPickup(ctx, { latitude: loc.latitude, longitude: loc.longitude });
            } catch (e) {
                console.error('[bot skory wizard location] failed:', e);
                await ctx.reply('Xatolik. Qayta urinib koʻring.');
            }
            // Restore persistent reply keyboard.
            const accW = await (prisma as any).telegramAccount.findUnique({
                where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
            });
            const langW: Lang = accW?.language === 'ru' ? 'ru' : 'uz';
            try {
                const kbW = await smartKeyboard(accW?.userId ?? null, langW, Boolean(accW?.userId), Number(chatId));
                await ctx.reply(LABELS[langW].menuTitle, { reply_markup: kbW });
            } catch { /* */ }
            return;
        }

        if (!isAwaitingLocation(Number(chatId))) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        try {
            await handleLocationReceived(ctx, lang, { latitude: loc.latitude, longitude: loc.longitude });
        } catch (e) {
            console.error('[bot skory location] failed:', e);
            await ctx.reply('Xatolik. Qayta urinib koʻring.');
        }
        // Restore the persistent reply keyboard under the typing input —
        // requestLocation() keyboard is one-time, so Telegram removes it
        // after the share. mainMenu() is inline (renders on a message)
        // and won't bring the input-row buttons back, smartKeyboard does.
        try {
            const kb = await smartKeyboard(acc?.userId ?? null, lang, Boolean(acc?.userId), Number(chatId));
            await ctx.reply(LABELS[lang].menuTitle, { reply_markup: kb });
        } catch { /* non-fatal */ }
    });

    // ─── Reply keyboard text → native render or URL ──────────────────────
    bot.on('message', async (ctx) => {
        const text = ctx.message.text || '';
        // Skip non-text messages entirely (location, photo, sticker, etc.)
        // so they reach their dedicated handlers without us spamming the
        // menu in response to an empty body.
        if (!ctx.message.text) return;
        if (text.startsWith('/')) return;
        if (ctx.message.contact) return;
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        // Bot is meant for private DMs. Stay silent in groups/supergroups —
        // otherwise we spam the super-admin group with menu replies and
        // crash on stale pre-upgrade chat ids.
        if (ctx.chat?.type !== 'private') return;
        // Cancel the "share location" flow if the patient taps "❌ Bekor".
        if (isAwaitingLocation(Number(chatId)) && (text === '❌ Bekor' || text === '❌ Отмена')) {
            clearAwaitingLocation(Number(chatId));
            const accForLang = await (prisma as any).telegramAccount.findUnique({
                where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
            });
            const lng: Lang = accForLang?.language === 'ru' ? 'ru' : 'uz';
            const kb = await smartKeyboard(accForLang?.userId ?? null, lng, Boolean(accForLang?.userId), Number(chatId));
            await ctx.reply(LABELS[lng].menuTitle, { reply_markup: kb });
            return;
        }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        const linked = Boolean(acc?.userId);

        // ── Active wizard intercepts text first ──────────────────────────
        if (linked) {
            const wizard = await getWizardState(chatId);
            if (wizard.kind) {
                // Patient-side skoriy wizard doesn't need a ClinicCtx —
                // anyone with a linked telegram can run it.
                if (wizard.kind === 'skory' && wizard.data?.step === 4) {
                    try { await handleSkoryDescription(ctx, text); }
                    catch (e) {
                        console.error('[bot] skory desc failed:', e);
                        await setWizardState(chatId, null);
                        await ctx.reply('Wizard xato — qaytadan boshlang');
                    }
                    return;
                }
                const ctxCl = await loadClinicCtx(chatId);
                if (ctxCl) {
                    try { await handleWizardText(ctx, ctxCl, wizard, text); }
                    catch (e) {
                        console.error('[bot] wizard text failed:', e);
                        await setWizardState(chatId, null);
                        await ctx.reply('Wizard xato — qaytadan boshlang');
                    }
                    return;
                }
            }
        }

        // ── Clinic keyboard hits first ───────────────────────────────────
        const clinicRoute = routeClinicLabel(lang, text);
        if (clinicRoute && linked) {
            const ctxCl = await loadClinicCtx(chatId);
            if (!ctxCl) {
                await ctx.reply(LABELS[lang].notLinkedHint);
                return;
            }
            try {
                await handleClinicReply(ctx, ctxCl, clinicRoute);
            } catch (e) {
                console.error('[bot] clinic view failed:', e);
                await ctx.reply('Xato yuz berdi');
            }
            return;
        }

        const route = routeReplyLabel(lang, text);
        if (!route) {
            await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, linked) });
            return;
        }

        if (route.kind === 'url') {
            // 🆘 Tez yordam gets the inline-menu treatment (nearest /
            // cheapest / mini-app) instead of dropping the patient
            // straight into the mini-app — they often want a quick
            // glance + one-tap call from inside Telegram.
            if (route.param === 'skory') {
                await sendSkoryMenu(ctx, lang);
                return;
            }
            const kb = new InlineKeyboard().url(
                `${LABELS[lang].open} ${route.label}`,
                startApp(route.param),
            );
            await ctx.reply(route.label, { reply_markup: kb });
            return;
        }

        // route.kind === 'view'
        if (!acc?.userId) {
            await ctx.reply(LABELS[lang].notLinkedHint);
            return;
        }
        try {
            if (route.view === 'bookings') {
                const r = await renderMyAppointments(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'HTML', reply_markup: r.keyboard });
            } else if (route.view === 'cart') {
                const r = await renderCart(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'HTML', reply_markup: r.keyboard });
            } else if (route.view === 'profile') {
                const r = await renderProfile(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'HTML', reply_markup: r.keyboard });
            } else if (route.view === 'notifs') {
                const kb = new InlineKeyboard().url(
                    `${LABELS[lang].open} ${route.label}`,
                    startApp('notifications'),
                );
                await ctx.reply(route.label, { reply_markup: kb });
            } else if (route.view === 'disp-my-amb') {
                const r = await renderDispatcherMyAmbulance(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'HTML', reply_markup: r.keyboard });
            } else if (route.view === 'disp-live') {
                const r = await renderDispatcherLiveHelp(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'HTML' });
            } else if (route.view === 'disp-history') {
                const r = await renderDispatcherHistory(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error('[telegram] view render failed:', e);
            await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, linked) });
        }
    });

    // ─── Convenience commands for native views ───────────────────────────
    bot.command('myappointments', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) { await ctx.reply(LABELS[lang].notLinkedHint); return; }
        const r = await renderMyAppointments(acc.userId, lang);
        await ctx.reply(r.text, { parse_mode: 'HTML', reply_markup: r.keyboard });
    });

    bot.command('cart', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) { await ctx.reply(LABELS[lang].notLinkedHint); return; }
        const r = await renderCart(acc.userId, lang);
        await ctx.reply(r.text, { parse_mode: 'HTML', reply_markup: r.keyboard });
    });

    bot.command('profile', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) { await ctx.reply(LABELS[lang].notLinkedHint); return; }
        const r = await renderProfile(acc.userId, lang);
        await ctx.reply(r.text, { parse_mode: 'HTML', reply_markup: r.keyboard });
    });

    bot.catch((err) => {
        console.error('[telegram] bot error:', err);
    });
}
