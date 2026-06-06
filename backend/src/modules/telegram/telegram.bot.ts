import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import prisma from '../../config/database';

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
 * Persistent reply keyboard (lives at the bottom of the chat). Text-only
 * so it renders without BotFather Mini App registration. When the user
 * taps one, the bot replies with an inline url button to the section.
 */
function replyKeyboard(lang: Lang, linked: boolean): Keyboard {
    const L = LABELS[lang];
    const kb = new Keyboard()
        .text(L.services).text(L.clinics).row()
        .text(L.doctors).text(L.skory).row();
    if (linked) {
        kb.text(L.bookings).text(L.cart).row()
          .text(L.notifs).text(L.profile).row();
    }
    return kb.resized().persistent();
}

/** Routes a tapped reply-keyboard label to the right section URL. */
function routeReplyLabel(lang: Lang, text: string): { path: string; label: string } | null {
    const L = LABELS[lang];
    // Match in both langs so the keyboard still works after language toggle
    const map: Record<string, { path: string; label: string }> = {
        [LABELS.uz.services]:  { path: '/xizmatlar',                   label: L.services },
        [LABELS.ru.services]:  { path: '/xizmatlar',                   label: L.services },
        [LABELS.uz.clinics]:   { path: '/klinikalar',                  label: L.clinics },
        [LABELS.ru.clinics]:   { path: '/klinikalar',                  label: L.clinics },
        [LABELS.uz.doctors]:   { path: '/doktorlar',                   label: L.doctors },
        [LABELS.ru.doctors]:   { path: '/doktorlar',                   label: L.doctors },
        [LABELS.uz.skory]:     { path: '/skory',                       label: L.skory },
        [LABELS.ru.skory]:     { path: '/skory',                       label: L.skory },
        [LABELS.uz.bookings]:  { path: '/user/appointments',           label: L.bookings },
        [LABELS.ru.bookings]:  { path: '/user/appointments',           label: L.bookings },
        [LABELS.uz.cart]:      { path: '/user/cart',                   label: L.cart },
        [LABELS.ru.cart]:      { path: '/user/cart',                   label: L.cart },
        [LABELS.uz.notifs]:    { path: '/user/notifications',          label: L.notifs },
        [LABELS.ru.notifs]:    { path: '/user/notifications',          label: L.notifs },
        [LABELS.uz.profile]:   { path: '/user/profile',                label: L.profile },
        [LABELS.ru.profile]:   { path: '/user/profile',                label: L.profile },
    };
    return map[text] || null;
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
            const intro = linked
                ? (lang === 'ru'
                    ? 'С возвращением! Меню ниже 👇'
                    : 'Qaytib kelganingiz uchun rahmat! Menyu pastda 👇')
                : (lang === 'ru'
                    ? `Привет! Это Banisa бот.\n\nЧтобы привязать аккаунт:\n1. Войдите на ${PUBLIC_BASE}\n2. Настройки уведомлений → Telegram → Привязать\n\nА пока — открытые разделы:`
                    : `Salom! Banisa botiga xush kelibsiz.\n\nHisobingizni bog'lash uchun:\n1. Saytga kiring: ${PUBLIC_BASE}\n2. Bildirishnoma sozlamalari → Telegram → Bog'lash\n\nShu paytgacha ochiq bo'limlar:`);
            await ctx.reply(intro, { reply_markup: replyKeyboard(lang, linked) });
            await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, linked) });
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
            await ctx.reply(
                lang === 'ru'
                    ? '✅ Аккаунт привязан!\n\nТеперь брони, оплаты и напоминания будут приходить сюда.'
                    : '✅ Hisobingiz bog\'landi!\n\nEndi bron, to\'lov va eslatma xabarlarini shu yerda olasiz.',
            );
            await ctx.reply(LABELS[lang].replyHint, { reply_markup: replyKeyboard(lang, true) });
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
        await ctx.reply(LABELS[lang].replyHint, { reply_markup: replyKeyboard(lang, linked) });
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

    // Generic message → if it matches a reply-keyboard label, send a quick
    // inline "Open" button to the right section. Otherwise nudge with menu.
    bot.on('message', async (ctx) => {
        const text = ctx.message.text || '';
        if (text.startsWith('/')) return; // commands handled above
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        const linked = Boolean(acc?.userId);

        const route = routeReplyLabel(lang, text);
        if (route) {
            const url = `${PUBLIC_BASE}${route.path}`;
            const kb = new InlineKeyboard().url(`${LABELS[lang].open} ${route.label}`, url);
            await ctx.reply(`${route.label}\n${url}`, { reply_markup: kb });
            return;
        }

        await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, linked) });
    });

    bot.catch((err) => {
        console.error('[telegram] bot error:', err);
    });
}
