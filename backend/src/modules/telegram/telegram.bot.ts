import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import prisma from '../../config/database';
import { registerOrLoginViaContact } from './telegram.register';
import {
    renderMyAppointments, renderCart, renderProfile,
    getCartCount, tryCancelAppointment, clearUserCart,
} from './telegram.views';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const PUBLIC_BASE = (process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');

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
            'Pastdagi *Telefon raqamni yuborish* tugmasini bosing — siz Banisa bemori sifatida ro\'yxatdan o\'tasiz va shu yerda avtomatik kirasiz.\n\n' +
            'Telefon raqamingiz faqat Banisa\'da saqlanadi. Boshqa joyga uzatilmaydi.',
        registerSuccess: '✅ Ro\'yxatdan o\'tdingiz! Endi bron qilish va bildirishnomalarni shu yerda olasiz.',
        loginSuccess: '✅ Xush kelibsiz! Hisobingiz Telegram bilan bog\'landi.',
        contactInvalid: '❌ Telefon raqami noto\'g\'ri. Iltimos, qaytadan urinib ko\'ring.',
        contactNotOwn: '❌ Iltimos, faqat *o\'zingizning* kontaktingizni yuboring. "Telefon raqamni yuborish" tugmasidan foydalaning.',
        contactError: '❌ Xato yuz berdi. Birozdan keyin urinib ko\'ring.',
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
            'Нажмите кнопку *Отправить номер телефона* — вы будете зарегистрированы как пациент Banisa и автоматически войдёте.\n\n' +
            'Ваш номер хранится только в Banisa и никуда не передаётся.',
        registerSuccess: '✅ Регистрация прошла! Брони и уведомления теперь приходят сюда.',
        loginSuccess: '✅ С возвращением! Аккаунт привязан к Telegram.',
        contactInvalid: '❌ Неверный номер телефона. Попробуйте снова.',
        contactNotOwn: '❌ Пожалуйста, отправьте только *свой собственный* контакт через кнопку "Отправить номер телефона".',
        contactError: '❌ Произошла ошибка. Попробуйте чуть позже.',
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
        .url(L.services, `${PUBLIC_BASE}/xizmatlar`)
        .url(L.clinics, `${PUBLIC_BASE}/klinikalar`).row()
        .url(L.doctors, `${PUBLIC_BASE}/doktorlar`)
        .url(L.skory, `${PUBLIC_BASE}/skory`).row();

    if (linked) {
        kb.url(L.bookings, `${PUBLIC_BASE}/user/appointments`)
          .url(L.cart, `${PUBLIC_BASE}/user/cart`).row()
          .url(L.notifs, `${PUBLIC_BASE}/user/notifications`)
          .url(L.profile, `${PUBLIC_BASE}/user/profile`).row()
          .url(L.settings, `${PUBLIC_BASE}/user/notification-settings`);
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
 * Routes a tapped reply-keyboard label. Returns either:
 *   - { kind: 'url' } — public/browse section that opens in the user's browser
 *   - { kind: 'view' } — patient-private content rendered natively in the bot
 *
 * Native views (bookings/cart/profile) keep the user inside Telegram — they
 * read live data instead of just sending a URL.
 */
type ReplyRoute =
    | { kind: 'url'; path: string; label: string }
    | { kind: 'view'; view: 'bookings' | 'cart' | 'profile' | 'notifs'; label: string };

function routeReplyLabel(lang: Lang, text: string): ReplyRoute | null {
    const L = LABELS[lang];
    const urls: Record<string, { path: string; label: string }> = {
        [LABELS.uz.services]: { path: '/xizmatlar',   label: L.services },
        [LABELS.ru.services]: { path: '/xizmatlar',   label: L.services },
        [LABELS.uz.clinics]:  { path: '/klinikalar',  label: L.clinics },
        [LABELS.ru.clinics]:  { path: '/klinikalar',  label: L.clinics },
        [LABELS.uz.doctors]:  { path: '/doktorlar',   label: L.doctors },
        [LABELS.ru.doctors]:  { path: '/doktorlar',   label: L.doctors },
        [LABELS.uz.skory]:    { path: '/skory',       label: L.skory },
        [LABELS.ru.skory]:    { path: '/skory',       label: L.skory },
    };
    if (urls[text]) return { kind: 'url', ...urls[text] };

    const views: Record<string, { view: 'bookings' | 'cart' | 'profile' | 'notifs'; label: string }> = {
        [LABELS.uz.bookings]: { view: 'bookings', label: L.bookings },
        [LABELS.ru.bookings]: { view: 'bookings', label: L.bookings },
        [LABELS.uz.cart]:     { view: 'cart',     label: L.cart },
        [LABELS.ru.cart]:     { view: 'cart',     label: L.cart },
        [LABELS.uz.profile]:  { view: 'profile',  label: L.profile },
        [LABELS.ru.profile]:  { view: 'profile',  label: L.profile },
        [LABELS.uz.notifs]:   { view: 'notifs',   label: L.notifs },
        [LABELS.ru.notifs]:   { view: 'notifs',   label: L.notifs },
    };
    if (views[text]) return { kind: 'view', ...views[text] };
    return null;
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
                const kb = await freshReplyKeyboard(existing!.userId!, lang, true);
                await ctx.reply(intro, { reply_markup: kb });
                await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, true) });
                return;
            }

            // Not bound — kick off in-bot register/login by asking for the
            // user's phone via Telegram's native contact-share dialog.
            await ctx.reply(LABELS[lang].sharePhoneTitle, { parse_mode: 'Markdown' });
            await ctx.reply(LABELS[lang].sharePhoneBody, {
                parse_mode: 'Markdown',
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
            const kb = await freshReplyKeyboard(justLinked?.userId ?? null, lang, true);
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
        const kb = await freshReplyKeyboard(acc?.userId ?? null, lang, linked);
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
                parse_mode: 'Markdown',
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
        const kb = await freshReplyKeyboard(result.user?.id ?? null, lang, true);
        await ctx.reply(welcome, { reply_markup: kb });
        await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, true) });
    });

    // ─── Inline callback queries (Bekor qil / Tozalash / Unlink etc) ──────
    bot.callbackQuery(/^appt:cancel:(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        const appointmentId = ctx.match[1];
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        if (!acc?.userId) {
            await ctx.answerCallbackQuery({ text: LABELS[lang].notLinkedHint, show_alert: true });
            return;
        }
        const result = await tryCancelAppointment(acc.userId, appointmentId);
        if (!result.ok) {
            const msg = result.error === 'not_cancellable'
                ? (lang === 'ru' ? 'Эту бронь нельзя отменить.' : 'Bu bronni bekor qilib bo\'lmaydi.')
                : (lang === 'ru' ? 'Бронь не найдена.' : 'Bron topilmadi.');
            await ctx.answerCallbackQuery({ text: msg, show_alert: true });
            return;
        }
        await ctx.answerCallbackQuery({ text: lang === 'ru' ? '✅ Отменено' : '✅ Bekor qilindi' });
        const rendered = await renderMyAppointments(acc.userId, lang);
        try {
            await ctx.editMessageText(rendered.text, {
                parse_mode: 'Markdown',
                reply_markup: rendered.keyboard,
            });
        } catch { /* original message may be too old to edit */ }
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
                parse_mode: 'Markdown',
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

    // ─── Reply keyboard text → native render or URL ──────────────────────
    bot.on('message', async (ctx) => {
        const text = ctx.message.text || '';
        if (text.startsWith('/')) return;
        if (ctx.message.contact) return;
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        const linked = Boolean(acc?.userId);

        const route = routeReplyLabel(lang, text);
        if (!route) {
            await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, linked) });
            return;
        }

        if (route.kind === 'url') {
            const url = `${PUBLIC_BASE}${route.path}`;
            const kb = new InlineKeyboard().url(`${LABELS[lang].open} ${route.label}`, url);
            await ctx.reply(`${route.label}\n${url}`, { reply_markup: kb });
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
                await ctx.reply(r.text, { parse_mode: 'Markdown', reply_markup: r.keyboard });
            } else if (route.view === 'cart') {
                const r = await renderCart(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'Markdown', reply_markup: r.keyboard });
            } else if (route.view === 'profile') {
                const r = await renderProfile(acc.userId, lang);
                await ctx.reply(r.text, { parse_mode: 'Markdown', reply_markup: r.keyboard });
            } else if (route.view === 'notifs') {
                const url = `${PUBLIC_BASE}/user/notifications`;
                const kb = new InlineKeyboard().url(`${LABELS[lang].open} ${route.label}`, url);
                await ctx.reply(`${route.label}\n${url}`, { reply_markup: kb });
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
        await ctx.reply(r.text, { parse_mode: 'Markdown', reply_markup: r.keyboard });
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
        await ctx.reply(r.text, { parse_mode: 'Markdown', reply_markup: r.keyboard });
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
        await ctx.reply(r.text, { parse_mode: 'Markdown', reply_markup: r.keyboard });
    });

    bot.catch((err) => {
        console.error('[telegram] bot error:', err);
    });
}
