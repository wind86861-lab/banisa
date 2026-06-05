import { Bot, InlineKeyboard } from 'grammy';
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
            await ctx.reply(intro, { reply_markup: mainMenu(lang, linked) });
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

    // Generic message → friendly nudge with the main menu
    bot.on('message', async (ctx) => {
        if (ctx.message.text?.startsWith('/')) return; // handled above
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { language: true, userId: true },
        });
        const lang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
        await ctx.reply(LABELS[lang].menuTitle, { reply_markup: mainMenu(lang, Boolean(acc?.userId)) });
    });

    bot.catch((err) => {
        console.error('[telegram] bot error:', err);
    });
}
