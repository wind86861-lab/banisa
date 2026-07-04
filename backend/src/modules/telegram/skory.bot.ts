/**
 * Skoriy (tez yordam) dispatch — Telegram bot integration.
 *
 * Two roles run through this file:
 *
 *   • PATIENT — kicks off "🚑 Tez yordam chaqirish" from the main menu and
 *     walks a 4-step wizard (pickup live geo → destination chip → price
 *     ceiling chip → optional description). On confirm we fan out offer
 *     messages to every eligible ambulance's dispatcher.
 *
 *   • AMBULANCE DISPATCHER — one telegram user per ambulance (linked by
 *     phone at ambulance creation). Receives a rich offer message with
 *     [✅ Qabul] / [❌ O'tkazib yuborish] buttons. The first dispatcher to
 *     accept wins atomically — every other dispatcher's message is edited
 *     in place to "❌ boshqa ambulans qabul qildi".
 *
 * Wizard state lives on TelegramAccount.wizardState as
 *   { kind: 'skory', data: { step, pickup?, dest?, priceMaxSom?, description? } }
 * sharing the same single-wizard slot as the existing search/booking
 * wizards in clinic.wizards.ts.
 */

import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import prisma from '../../config/database';
import { setWizardState, getWizardState } from './clinic.wizards';
import {
    createRequest,
    findCandidates,
    acceptOffer,
    declineOffer,
    cancelRequest,
    reverseGeocode,
    getActivePendingForPatient,
    expirePendingRequest,
    updateRequestStatus,
    submitReview,
    getMarketPriceRange,
    getNearbyClinics,
    type CandidateAmbulance,
    type DispatcherStatus,
} from '../skory/skory.service';

type Lang = 'uz' | 'ru';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

function fmtSom(n: number | null | undefined): string {
    if (n == null) return '—';
    return Number(n).toLocaleString('uz-UZ');
}

function esc(s: string | null | undefined): string {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Localized labels (kept inline so we don't depend on telegram.bot.ts internals)
// ─────────────────────────────────────────────────────────────────────────────

const L = {
    uz: {
        startTitle: '🚑 <b>Tez yordam chaqirish</b>',
        startHelp: 'Quyidagi tugmani bosib joylashuvingizni ulashing. Eng yaqin va bo\'sh ambulanslarga so\'rov yuboriladi.',
        sharePickup: '📍 Joyimni ulashish',
        cancel: '↩️ Bekor qilish',
        cancelled: '❌ Bekor qilindi.',
        step2Title: '✅ Joy qabul qilindi.\n\n📍 <b>Qaerga olib borish kerak?</b>',
        destNearest: '🏥 Yaqin shifoxonaga',
        destSkip: 'Hozir kerakmas',
        step3Title: '✅ Manzil belgilandi.\n\n💰 <b>Maksimal narx</b>?',
        priceUnlimited: 'Cheklovsiz',
        step4Title: '✅ Narx oralig\'i qabul qilindi.\n\n📝 <b>Tafsilot</b> (ixtiyoriy): nima bo\'ldi?\n\nMatn yuboring yoki <b>O\'tkazib yuborish</b> tugmasini bosing.',
        descSkip: 'O\'tkazib yuborish',
        confirmIntro: '✅ Hammasi tayyor — yuborilsinmi?\n\n',
        confirmSend: '🚨 Yuborish',
        sending: 'So\'rov yuborilmoqda...',
        noCandidates: '😔 Hozir bo\'sh ambulans topilmadi. Iltimos, davlat <b>103</b> raqamiga qo\'ng\'iroq qiling.',
        sentTitle: '🔎 <b>Ambulans qidirilmoqda...</b>',
        sentDesc: (n: number) =>
            `Mos keladigan <b>${n} ta</b> ambulansga so\'rov yuborildi.\n\n` +
            'Birinchi qabul qilgan ambulans sizga keladi. Javob kelsa shu yerda xabar olasiz.',
        cancelRequest: '❌ So\'rovni bekor qilish',
        wonTitle: '✅ <b>Ambulans yo\'lda!</b>',
        wonBody: (clinic: string, callSign: string, phones: string[], etaMin: number | null) => {
            const lines = [
                `🏥 Klinika: <b>${esc(clinic)}</b>`,
                `🚑 Ambulans: <b>${esc(callSign)}</b>`,
            ];
            if (etaMin) lines.push(`⏱ Taxminiy yetib kelish: <b>~${etaMin} daq</b>`);
            if (phones.length > 0) {
                lines.push('📞 Aloqa: ' + phones.map((p) => `<a href="tel:${p}">${esc(p)}</a>`).join(', '));
            }
            return lines.join('\n');
        },
        patientCancelled: '✅ So\'rov bekor qilindi.',
        // Confirm summary
        sumYourLocation: '📍 Joyingiz olinadi',
        sumDestCoord: '🏥 Manzil: tanlangan koordinata',
        sumDestLabel: (l: string) => `🏥 Manzil: ${l}`,
        sumPrice: (v: string) => `💰 Maksimal narx: ${v}`,
        sumDesc: (d: string) => `📝 ${d}`,
        // Dispatcher messages
        offerTitle: '🚨 <b>YANGI TEZ YORDAM SO\'ROVI</b>',
        offerPatient: 'Bemor',
        offerPickup: 'Olib ketish',
        offerDest: 'Manzil',
        offerDistance: 'Masofa',
        offerEta: 'ETA',
        offerPrice: 'Taxminiy narx',
        offerMaxPrice: 'Bemor maks',
        accept: '✅ Qabul qilaman',
        decline: '❌ O\'tkazib yuborish',
        acceptedByMe: '✅ Siz qabul qildingiz. Bemorga xabar yuborildi.',
        acceptedByOther: '❌ Bu chaqiruvni boshqa ambulans qabul qildi.',
        declinedByMe: 'O\'tkazib yuborildi.',
        requestCancelled: '❌ Bemor so\'rovni bekor qildi.',
        requestExpired: '⌛ So\'rov vaqti tugadi (hech kim qabul qilmadi).',
        patientExpired: '⌛ <b>So\'rov vaqti tugadi.</b>\n\nHech bir ambulans javob bermadi. Iltimos <b>103</b> raqamiga qo\'ng\'iroq qiling.',
        patientAlreadyPending: '⚠️ Sizda allaqachon yuborilgan so\'rov bor. Avval uni bekor qiling.',
        noneReceived: '😔 Texnik sabab tufayli birorta ambulans habar olmadi. Iltimos <b>103</b> ga qo\'ng\'iroq qiling.',
        // Status update (dispatcher → patient)
        actOnRoute: '🚦 Yo\'lga chiqdim',
        actArrived: '📍 Yetib keldim',
        actCompleted: '✅ Yakunlandi',
        statusOnRouteDisp: '🚦 Holat: <b>YO\'LDA</b>. Bemorga xabar yuborildi.',
        statusArrivedDisp: '📍 Holat: <b>BEMOR OLDIDA</b>. Bemorga xabar yuborildi.',
        statusCompletedDisp: '✅ <b>Yakunlandi.</b> Ambulans yana bo\'shadi.',
        statusOnRoutePat: '🚦 <b>Ambulans yo\'lga chiqdi</b>\n\nKutib turing — yetib keladi.',
        statusArrivedPat: '📍 <b>Ambulans yetib keldi!</b>\n\nIltimos, tashqariga chiqing.',
        statusCompletedPat: '✅ <b>Chaqiruv yakunlandi.</b>\n\nTez tuzalishingizni tilaymiz!',
        // Reviews
        reviewAsk: '⭐ Iltimos, ambulansga baho bering:',
        reviewThanks: '🙏 Rahmat! Sharhingiz qabul qilindi.',
        // Wizard back button
        back: '⬅️ Orqaga',
        // ─── Wizard v2: hospital list + price range + edit chips ───
        destPickHospital: '🏥 Shifoxonaga olib boring',
        destShareDropoff: '🗺 Boshqa joy (xaritada belgilash)',
        destSkipNew: '⏭ Hozircha kerakmas',
        destShareDropoffPrompt: '🗺 <b>Borish joyini ulashing</b>\n\nXaritada nuqtani belgilab "Joylashuvni jo\'natish" ni bosing.',
        destClinicHeader: '🏥 <b>Qaysi shifoxonaga olib boriladi?</b>\n\nEng yaqin 10 ta klinika ko\'rsatilgan:',
        destChosen: (label: string) => `✅ Manzil: <b>${label}</b>`,
        priceRangeIntro: (min: string, max: string, n: number, km: number | null) =>
            (km != null
                ? `Bu masofa uchun (~${km} km) <b>${n} ta</b> klinikada narxlar:\n`
                : `Yaqin atrofdagi <b>${n} ta</b> klinikada chaqiruv narxlari:\n`) +
            `💰 <b>${min} – ${max} so'm</b>\n\n` +
            'Maksimal narxni kiriting yoki <b>Hammasini qabul</b> tugmasini bosing:',
        priceRangeNone: 'Yaqin atrofda narxlar ma\'lumoti yo\'q. Maksimal narxni kiriting yoki <b>Hammasini qabul</b>:',
        priceAcceptAll: '✅ Hammasini qabul (limit yo\'q)',
        priceEnterText: '💬 Narxni so\'mda yozing',
        priceEnterPrompt: 'Maksimal narxni faqat raqamlar bilan yozing (so\'m). Masalan: <b>150000</b>',
        priceInvalid: '⚠️ Faqat raqam yuboring (masalan: 150000)',
        // Confirm step — per-field edit buttons
        editPickup: '✏️ Joyim',
        editDest: '✏️ Manzil',
        editPrice: '✏️ Narx',
        editDesc: '✏️ Tafsilot',
        confirmHeader: '✅ <b>Hammasi tayyor — yuborilsinmi?</b>\n',
        confirmDistanceLine: (km: number, min: number) => `📏 Masofa: <b>~${km} km</b> · <b>~${min} daq</b>`,
    },
    ru: {
        startTitle: '🚑 <b>Вызов скорой помощи</b>',
        startHelp: 'Нажмите кнопку ниже и поделитесь местоположением. Запрос будет отправлен ближайшим свободным машинам.',
        sharePickup: '📍 Отправить местоположение',
        cancel: '↩️ Отмена',
        cancelled: '❌ Отменено.',
        step2Title: '✅ Местоположение принято.\n\n📍 <b>Куда отвезти?</b>',
        destNearest: '🏥 В ближайшую больницу',
        destSkip: 'Сейчас не нужно',
        step3Title: '✅ Адрес назначен.\n\n💰 <b>Максимальная цена</b>?',
        priceUnlimited: 'Без лимита',
        step4Title: '✅ Цена принята.\n\n📝 <b>Детали</b> (необязательно): что случилось?\n\nОтправьте текстом или нажмите <b>Пропустить</b>.',
        descSkip: 'Пропустить',
        confirmIntro: '✅ Всё готово — отправить?\n\n',
        confirmSend: '🚨 Отправить',
        sending: 'Отправка запроса...',
        noCandidates: '😔 Сейчас нет свободных машин скорой. Пожалуйста, звоните на <b>103</b>.',
        sentTitle: '🔎 <b>Ищем ближайшую машину...</b>',
        sentDesc: (n: number) =>
            `Запрос отправлен <b>${n}</b> подходящим машинам.\n\n` +
            'Первая принявшая машина приедет к вам. Уведомление придёт сюда.',
        cancelRequest: '❌ Отменить запрос',
        wonTitle: '✅ <b>Машина в пути!</b>',
        wonBody: (clinic: string, callSign: string, phones: string[], etaMin: number | null) => {
            const lines = [
                `🏥 Клиника: <b>${esc(clinic)}</b>`,
                `🚑 Машина: <b>${esc(callSign)}</b>`,
            ];
            if (etaMin) lines.push(`⏱ Прибытие: <b>~${etaMin} мин</b>`);
            if (phones.length > 0) {
                lines.push('📞 Контакт: ' + phones.map((p) => `<a href="tel:${p}">${esc(p)}</a>`).join(', '));
            }
            return lines.join('\n');
        },
        patientCancelled: '✅ Запрос отменён.',
        sumYourLocation: '📍 Ваше местоположение будет передано',
        sumDestCoord: '🏥 Адрес: выбранные координаты',
        sumDestLabel: (l: string) => `🏥 Адрес: ${l}`,
        sumPrice: (v: string) => `💰 Максимальная цена: ${v}`,
        sumDesc: (d: string) => `📝 ${d}`,
        offerTitle: '🚨 <b>НОВЫЙ ВЫЗОВ СКОРОЙ</b>',
        offerPatient: 'Пациент',
        offerPickup: 'Забрать',
        offerDest: 'Адрес',
        offerDistance: 'Расстояние',
        offerEta: 'ETA',
        offerPrice: 'Примерная цена',
        offerMaxPrice: 'Макс. цена пациента',
        accept: '✅ Принимаю',
        decline: '❌ Пропустить',
        acceptedByMe: '✅ Вы приняли. Пациенту отправлено уведомление.',
        acceptedByOther: '❌ Этот вызов принят другой машиной.',
        declinedByMe: 'Пропущено.',
        requestCancelled: '❌ Пациент отменил запрос.',
        requestExpired: '⌛ Время ожидания истекло (никто не принял).',
        patientExpired: '⌛ <b>Время ожидания истекло.</b>\n\nНи одна машина не ответила. Пожалуйста, звоните <b>103</b>.',
        patientAlreadyPending: '⚠️ У вас уже есть активный запрос. Сначала отмените его.',
        noneReceived: '😔 По техническим причинам ни одна машина не получила уведомление. Пожалуйста, звоните <b>103</b>.',
        actOnRoute: '🚦 В пути',
        actArrived: '📍 На месте',
        actCompleted: '✅ Завершить',
        statusOnRouteDisp: '🚦 Статус: <b>В ПУТИ</b>. Пациент уведомлён.',
        statusArrivedDisp: '📍 Статус: <b>НА МЕСТЕ</b>. Пациент уведомлён.',
        statusCompletedDisp: '✅ <b>Завершено.</b> Машина снова свободна.',
        statusOnRoutePat: '🚦 <b>Машина выехала</b>\n\nПодождите — скоро прибудет.',
        statusArrivedPat: '📍 <b>Машина прибыла!</b>\n\nПожалуйста, выходите.',
        statusCompletedPat: '✅ <b>Вызов завершён.</b>\n\nСкорейшего выздоровления!',
        reviewAsk: '⭐ Пожалуйста, оцените машину скорой:',
        reviewThanks: '🙏 Спасибо! Ваш отзыв получен.',
        back: '⬅️ Назад',
        destPickHospital: '🏥 Везти в больницу',
        destShareDropoff: '🗺 Другое место (указать на карте)',
        destSkipNew: '⏭ Пока не нужно',
        destShareDropoffPrompt: '🗺 <b>Поделитесь местом назначения</b>\n\nОтметьте точку на карте и отправьте "Отправить местоположение".',
        destClinicHeader: '🏥 <b>В какую больницу везти?</b>\n\nПоказаны 10 ближайших:',
        destChosen: (label: string) => `✅ Адрес: <b>${label}</b>`,
        priceRangeIntro: (min: string, max: string, n: number, km: number | null) =>
            (km != null
                ? `Для этого расстояния (~${km} км) у <b>${n}</b> клиник цены:\n`
                : `Ближайшие <b>${n}</b> клиник имеют цены вызова:\n`) +
            `💰 <b>${min} – ${max} сум</b>\n\n` +
            'Введите максимальную цену или нажмите <b>Принять все</b>:',
        priceRangeNone: 'Данных о ценах поблизости нет. Введите максимальную цену или нажмите <b>Принять все</b>:',
        priceAcceptAll: '✅ Принять все (без лимита)',
        priceEnterText: '💬 Ввести цену',
        priceEnterPrompt: 'Введите максимальную цену только цифрами (сум). Например: <b>150000</b>',
        priceInvalid: '⚠️ Отправьте только число (например: 150000)',
        editPickup: '✏️ Откуда',
        editDest: '✏️ Куда',
        editPrice: '✏️ Цена',
        editDesc: '✏️ Детали',
        confirmHeader: '✅ <b>Всё готово — отправить?</b>\n',
        confirmDistanceLine: (km: number, min: number) => `📏 Расстояние: <b>~${km} км</b> · <b>~${min} мин</b>`,
    },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Wizard step helpers
// ─────────────────────────────────────────────────────────────────────────────

async function lookupLang(chatId: number): Promise<Lang> {
    try {
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { language: true },
        });
        return acc?.language === 'ru' ? 'ru' : 'uz';
    } catch { return 'uz'; }
}

async function resolvePatient(chatId: number): Promise<{ userId: string; lang: Lang } | null> {
    const acc = await (prisma as any).telegramAccount.findUnique({
        where: { chatId: BigInt(chatId) },
        select: { userId: true, language: true },
    });
    if (!acc?.userId) return null;
    return { userId: acc.userId, lang: acc.language === 'ru' ? 'ru' : 'uz' };
}

function pickupKeyboard(lang: Lang): Keyboard {
    return new Keyboard()
        .requestLocation(L[lang].sharePickup).row()
        .text(L[lang].cancel).row()
        .resized()
        .oneTime();
}

function destKeyboard(lang: Lang): InlineKeyboard {
    return new InlineKeyboard()
        .text(L[lang].destPickHospital, 'skory:dest:hospital').row()
        .text(L[lang].destShareDropoff, 'skory:dest:custom').row()
        .text(L[lang].destSkipNew, 'skory:dest:skip').row()
        .text(L[lang].back, 'skory:back:1')
        .text(L[lang].cancel, 'skory:cancel');
}

function clinicListKeyboard(
    lang: Lang,
    clinics: Array<{ id: string; nameUz: string; nameRu: string | null; distanceKm: number }>,
): InlineKeyboard {
    const kb = new InlineKeyboard();
    for (const c of clinics) {
        const name = lang === 'ru' ? (c.nameRu || c.nameUz) : c.nameUz;
        const label = `🏥 ${name} · ${c.distanceKm.toFixed(1)} km`;
        kb.text(label.length > 64 ? label.slice(0, 61) + '…' : label, `skory:clinic:${c.id}`).row();
    }
    kb.text(L[lang].back, 'skory:back:2')
      .text(L[lang].cancel, 'skory:cancel');
    return kb;
}

function priceKeyboard(lang: Lang): InlineKeyboard {
    return new InlineKeyboard()
        .text(L[lang].priceAcceptAll, 'skory:price:all').row()
        .text(L[lang].priceEnterText, 'skory:price:enter').row()
        .text(L[lang].back, 'skory:back:2')
        .text(L[lang].cancel, 'skory:cancel');
}

function customDropoffKeyboard(lang: Lang): Keyboard {
    return new Keyboard()
        .requestLocation(L[lang].sharePickup).row()
        .text(L[lang].cancel).row()
        .resized()
        .oneTime();
}

function descKeyboard(lang: Lang): InlineKeyboard {
    return new InlineKeyboard()
        .text(L[lang].descSkip, 'skory:desc:skip').row()
        .text(L[lang].back, 'skory:back:3')
        .text(L[lang].cancel, 'skory:cancel');
}

function patientPendingKeyboard(lang: Lang, requestId: string): InlineKeyboard {
    return new InlineKeyboard()
        .text(L[lang].cancelRequest, `skory:patient:cancel:${requestId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC entrypoints (called from telegram.bot.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patient tapped "🚑 Tez yordam chaqirish" — kick off the wizard.
 */
export async function startSkoryWizard(ctx: any): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const patient = await resolvePatient(chatId);
    if (!patient) {
        await ctx.reply('Avval ro\'yxatdan o\'ting. /start ni bosing.');
        return;
    }
    const lang = patient.lang;
    await setWizardState(chatId, { kind: 'skory' as any, data: { step: 1 } });
    await ctx.reply(`${L[lang].startTitle}\n\n${L[lang].startHelp}`, {
        parse_mode: 'HTML',
        reply_markup: pickupKeyboard(lang),
    });
}

/**
 * Inbound `location` message routing. Two flavours:
 *   • Step 1 — patient's pickup → advances to dest picker (step 2)
 *   • Step 2 with sub='await_dropoff' — patient's custom dropoff → fills
 *     dest.{lat,lng,label} and advances to price step (3)
 */
export async function handleSkoryPickup(ctx: any, location: { latitude: number; longitude: number }): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const lang = await lookupLang(chatId);
    const wiz = await getWizardState(chatId);
    if ((wiz as any).kind !== 'skory') return;
    const data = (wiz as any).data || {};

    // Dropoff branch (custom map-pin in step 2)
    if (data.step === 2 && data.sub === 'await_dropoff') {
        const dropAddress = await reverseGeocode(location.latitude, location.longitude);
        const dest = {
            lat: location.latitude,
            lng: location.longitude,
            label: dropAddress || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
        };
        // Price step removed — go straight to the description step, no budget.
        await setWizardState(chatId, { kind: 'skory' as any, data: { ...data, sub: undefined, dest, step: 4, priceMaxSom: null } });
        try { await ctx.reply('✓', { reply_markup: { remove_keyboard: true } }); } catch { /* */ }
        await ctx.reply(L[lang].step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
        return;
    }

    // Pickup branch (step 1)
    if (data.step !== 1) return;
    const address = await reverseGeocode(location.latitude, location.longitude);

    await setWizardState(chatId, {
        kind: 'skory' as any,
        data: {
            step: 2,
            pickup: { lat: location.latitude, lng: location.longitude, address },
        },
    });
    try { await ctx.reply('✓', { reply_markup: { remove_keyboard: true } }); } catch { /* */ }
    await ctx.reply(L[lang].step2Title, {
        parse_mode: 'HTML',
        reply_markup: destKeyboard(lang),
    });
}

/**
 * Step 3 price text input — runs when handleWizardText sees step:3 + sub:'await_price'.
 * Parses an integer (sum), validates, stores priceMaxSom, and advances to step 4.
 */
export async function handleSkoryPriceText(ctx: any, text: string): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const lang = await lookupLang(chatId);
    const wiz = await getWizardState(chatId);
    const data = (wiz as any).data;
    if ((wiz as any).kind !== 'skory' || data?.step !== 3 || data?.sub !== 'await_price') return;
    const digits = text.replace(/[\s,.]/g, '');
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) {
        await ctx.reply(L[lang].priceInvalid);
        return;
    }
    const nextData = { ...data, sub: undefined, priceMaxSom: n, step: 4 };
    await setWizardState(chatId, { kind: 'skory' as any, data: nextData });
    await ctx.reply(L[lang].step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
}

async function sendPriceStep(ctx: any, lang: Lang, data: any): Promise<void> {
    const t = L[lang];
    let header = t.step3Title + '\n\n';
    try {
        const range = await getMarketPriceRange({
            pickupLat: data.pickup.lat,
            pickupLng: data.pickup.lng,
            destLat: data.dest?.lat ?? null,
            destLng: data.dest?.lng ?? null,
        });
        if (range && range.min !== range.max) {
            header += t.priceRangeIntro(fmtSom(range.min), fmtSom(range.max), range.sampleCount, range.tripKm);
        } else if (range) {
            header += t.priceRangeIntro(fmtSom(range.min), fmtSom(range.max), range.sampleCount, range.tripKm);
        } else {
            header += t.priceRangeNone;
        }
    } catch (e) {
        console.warn('[skory] price range fetch failed', e);
        header += t.priceRangeNone;
    }
    await ctx.reply(header, { parse_mode: 'HTML', reply_markup: priceKeyboard(lang) });
}

/**
 * Description-step text handler. Called from telegram.bot.ts's
 * handleWizardText branch when wizard kind === 'skory' && step === 4.
 */
export async function handleSkoryDescription(ctx: any, text: string): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const lang = await lookupLang(chatId);
    const wiz = await getWizardState(chatId);
    if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 4) return;

    const data = { ...wiz.data, step: 5, description: text.slice(0, 500) };
    await setWizardState(chatId, { kind: 'skory' as any, data });
    await showConfirm(ctx, lang, data);
}

async function showConfirm(ctx: any, lang: Lang, data: any): Promise<void> {
    const t = L[lang];
    const summary: string[] = [t.confirmHeader];
    summary.push(data.pickup?.address ? `📍 ${esc(data.pickup.address)}` : t.sumYourLocation);
    if (data.dest?.label) summary.push(t.sumDestLabel(esc(data.dest.label)));
    else if (data.dest?.lat) summary.push(t.sumDestCoord);

    // Distance preview if we have a destination
    if (data.pickup && data.dest?.lat != null && data.dest?.lng != null) {
        try {
            const range = await getMarketPriceRange({
                pickupLat: data.pickup.lat,
                pickupLng: data.pickup.lng,
                destLat: data.dest.lat,
                destLng: data.dest.lng,
            });
            const km = range?.tripKm ?? null;
            if (km != null) {
                const eta = Math.max(1, Math.round(km * 2));
                summary.push(t.confirmDistanceLine(km, eta));
            }
        } catch { /* */ }
    }

    // Price line removed — the patient no longer sets a budget; the request
    // always reaches every matching ambulance.
    if (data.description) summary.push(t.sumDesc(esc(data.description)));

    await ctx.reply(summary.join('\n'), {
        parse_mode: 'HTML',
        reply_markup: confirmKeyboardV2(lang),
    });
}

function confirmKeyboardV2(lang: Lang): InlineKeyboard {
    const t = L[lang];
    return new InlineKeyboard()
        .text(t.confirmSend, 'skory:confirm').row()
        .text(t.editPickup, 'skory:edit:1')
        .text(t.editDest, 'skory:edit:2').row()
        .text(t.editDesc, 'skory:edit:4').row()
        .text(t.cancel, 'skory:cancel');
}

// ─────────────────────────────────────────────────────────────────────────────
// Fanout — send offer messages to every candidate's dispatcher
// ─────────────────────────────────────────────────────────────────────────────

function renderOfferText(lang: Lang, ctx: {
    bookingId: string;
    patientName: string | null;
    patientPhone: string | null;
    pickupAddress: string | null;
    pickupLat: number;
    pickupLng: number;
    destAddress: string | null;
    distanceKm: number;
    durationMin: number;
    estimatedPrice: number;
    priceMaxSom: number | null;
    description: string | null;
}): string {
    const t = L[lang];
    const minLabel = lang === 'ru' ? 'мин' : 'daq';
    const lines = [
        t.offerTitle,
        '',
        `👤 ${t.offerPatient}: <b>${esc(ctx.patientName || t.offerPatient)}</b>`,
    ];
    if (ctx.patientPhone) lines.push(`📞 <a href="tel:${ctx.patientPhone}">${esc(ctx.patientPhone)}</a>`);
    lines.push('');
    lines.push(`📍 ${t.offerPickup}: ${esc(ctx.pickupAddress || `${ctx.pickupLat.toFixed(5)}, ${ctx.pickupLng.toFixed(5)}`)}`);
    if (ctx.destAddress) lines.push(`🏥 ${t.offerDest}: ${esc(ctx.destAddress)}`);
    lines.push('');
    lines.push(`📏 ${t.offerDistance}: <b>${ctx.distanceKm.toFixed(1)} km</b>`);
    lines.push(`⏱ ${t.offerEta}: <b>~${ctx.durationMin} ${minLabel}</b>`);
    lines.push(`💵 ${t.offerPrice}: <b>${fmtSom(ctx.estimatedPrice)} so'm</b>`);
    if (ctx.priceMaxSom) lines.push(`💰 ${t.offerMaxPrice}: ${fmtSom(ctx.priceMaxSom)} so'm`);
    if (ctx.description) {
        lines.push('');
        lines.push(`📝 ${esc(ctx.description)}`);
    }
    return lines.join('\n');
}

function offerKeyboard(lang: Lang, offerId: string): InlineKeyboard {
    return new InlineKeyboard()
        .text(L[lang].accept, `skory:offer:accept:${offerId}`).row()
        .text(L[lang].decline, `skory:offer:decline:${offerId}`);
}

/**
 * Push offer messages to every candidate's dispatcher in parallel. Returns
 * the count that actually got through. Shared between the bot wizard and
 * the mini-app REST controller so both paths emit identical offers.
 *
 * Caller is responsible for: createRequest having run, request+offers
 * persisted, candidates list mapping 1:1 with offers by ambulanceId.
 */
export async function fanoutOffersViaTelegram(
    bot: Bot,
    request: { id: string },
    offers: Array<{ id: string; ambulanceId: string }>,
    candidates: CandidateAmbulance[],
    payload: {
        patientName: string | null;
        patientPhone: string | null;
        pickupLat: number;
        pickupLng: number;
        pickupAddress: string | null;
        destAddress: string | null;
        priceMaxSom: number | null;
        description: string | null;
    },
): Promise<number> {
    const candidateByAmbId = new Map<string, CandidateAmbulance>();
    for (const c of candidates) candidateByAmbId.set(c.ambulanceId, c);

    const sendTasks = offers.map(async (offer) => {
        const c = candidateByAmbId.get(offer.ambulanceId);
        if (!c || !c.dispatcherChatId) return false;
        const dispatcherLang: Lang = c.dispatcherLanguage === 'ru' ? 'ru' : 'uz';
        const text = renderOfferText(dispatcherLang, {
            bookingId: request.id,
            patientName: payload.patientName,
            patientPhone: payload.patientPhone,
            pickupAddress: payload.pickupAddress,
            pickupLat: payload.pickupLat,
            pickupLng: payload.pickupLng,
            destAddress: payload.destAddress,
            distanceKm: c.distanceKm,
            durationMin: c.durationMin,
            estimatedPrice: c.estimatedPrice,
            priceMaxSom: payload.priceMaxSom,
            description: payload.description,
        });
        try {
            const pin = await bot.api.sendLocation(Number(c.dispatcherChatId), payload.pickupLat, payload.pickupLng);
            const sent = await bot.api.sendMessage(Number(c.dispatcherChatId), text, {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true },
                reply_parameters: { message_id: pin.message_id, allow_sending_without_reply: true },
                reply_markup: offerKeyboard(dispatcherLang, offer.id),
            });
            await prisma.dispatchOffer.update({
                where: { id: offer.id },
                data: { telegramMessageId: BigInt(sent.message_id) },
            });
            return true;
        } catch (e) {
            console.error('[skory] sendOffer failed', { offerId: offer.id, chatId: c.dispatcherChatId }, e);
            return false;
        }
    });

    const results = await Promise.allSettled(sendTasks);
    return results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
}

/**
 * Called from "Yuborish" confirm handler. Validates, runs the dispatch
 * engine, creates request + offers, then pushes a message to every
 * dispatcher and records the resulting telegram message ids.
 */
async function dispatchRequestFromWizard(bot: Bot, ctx: any, lang: Lang, data: any): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const patient = await resolvePatient(chatId);
    if (!patient) return;

    // Server-side cooldown: only one PENDING request at a time per patient.
    const existing = await getActivePendingForPatient(patient.userId);
    if (existing) {
        await ctx.reply(L[lang].patientAlreadyPending, {
            parse_mode: 'HTML',
            reply_markup: patientPendingKeyboard(lang, existing.id),
        });
        await setWizardState(chatId, null);
        return;
    }

    // Pull patient name/phone for the offer message
    const userRow = await prisma.user.findUnique({
        where: { id: patient.userId },
        select: { firstName: true, lastName: true, phone: true },
    });
    const patientName = [userRow?.firstName, userRow?.lastName].filter(Boolean).join(' ') || null;
    const patientPhone = userRow?.phone || null;

    const candidates = await findCandidates({
        patientId: patient.userId,
        pickupLat: data.pickup.lat,
        pickupLng: data.pickup.lng,
        pickupAddress: data.pickup.address ?? null,
        priceMaxSom: data.priceMaxSom ?? null,
        description: data.description ?? null,
        destLat: data.dest?.lat ?? null,
        destLng: data.dest?.lng ?? null,
        destAddress: data.dest?.label ?? null,
        destClinicId: data.dest?.clinicId ?? null,
    });

    if (candidates.length === 0) {
        await ctx.reply(L[lang].noCandidates, { parse_mode: 'HTML' });
        await setWizardState(chatId, null);
        return;
    }

    const { request, offers } = await createRequest(
        {
            patientId: patient.userId,
            pickupLat: data.pickup.lat,
            pickupLng: data.pickup.lng,
            pickupAddress: data.pickup.address ?? null,
            priceMaxSom: data.priceMaxSom ?? null,
            description: data.description ?? null,
            destLat: data.dest?.lat ?? null,
            destLng: data.dest?.lng ?? null,
            destAddress: data.dest?.label ?? null,
            destClinicId: data.dest?.clinicId ?? null,
        },
        candidates,
    );

    // Clear wizard state ASAP — even if the rest of fanout slows down, the
    // patient already committed.
    await setWizardState(chatId, null);

    const delivered = await fanoutOffersViaTelegram(bot, request, offers, candidates, {
        patientName,
        patientPhone,
        pickupLat: data.pickup.lat,
        pickupLng: data.pickup.lng,
        pickupAddress: data.pickup.address ?? null,
        destAddress: data.dest?.label ?? null,
        priceMaxSom: data.priceMaxSom ?? null,
        description: data.description ?? null,
    });

    // If all sends failed — be honest with the patient and roll the request
    // back to CANCELLED so they're not stuck staring at "searching...".
    if (delivered === 0) {
        try {
            await prisma.ambulanceRequest.update({
                where: { id: request.id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'no_dispatcher_received' },
            });
        } catch { /* */ }
        await ctx.reply(L[lang].noneReceived, { parse_mode: 'HTML' });
        return;
    }

    // Confirm to patient with the ACTUAL delivered count, not the candidate count.
    await ctx.reply(
        `${L[lang].sentTitle}\n\n${L[lang].sentDesc(delivered)}`,
        { parse_mode: 'HTML', reply_markup: patientPendingKeyboard(lang, request.id) },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit losing messages + notify patient on win/cancel
// ─────────────────────────────────────────────────────────────────────────────

async function editLosingOffers(bot: Bot, requestId: string, winnerOfferId: string | null): Promise<void> {
    const losers = await prisma.dispatchOffer.findMany({
        where: {
            requestId,
            status: 'LOST',
            id: { not: winnerOfferId ?? undefined },
            telegramMessageId: { not: null },
        },
        include: { dispatcher: { select: { telegramAccount: { select: { language: true } } } } },
    });

    for (const o of losers) {
        if (!o.telegramChatId || !o.telegramMessageId) continue;
        const lang = (o.dispatcher?.telegramAccount?.language === 'ru' ? 'ru' : 'uz') as Lang;
        try {
            await bot.api.editMessageText(
                Number(o.telegramChatId),
                Number(o.telegramMessageId),
                `❌ ${L[lang].acceptedByOther}`,
                { parse_mode: 'HTML' },
            );
        } catch { /* message may have been deleted */ }
    }
}

async function notifyPatientWon(bot: Bot, requestId: string): Promise<void> {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: {
            patient: { select: { telegramAccount: { select: { chatId: true, language: true } } } },
            acceptedAmbulance: {
                include: {
                    clinic: { select: { nameUz: true, phones: true } },
                    dispatcher: { select: { phone: true } },
                },
            },
        },
    });
    if (!req || !req.patient.telegramAccount?.chatId || !req.acceptedAmbulance) return;

    const lang: Lang = req.patient.telegramAccount.language === 'ru' ? 'ru' : 'uz';
    const phones = (req.acceptedAmbulance.clinic.phones as string[] | null) ?? [];
    if (req.acceptedAmbulance.dispatcher?.phone) phones.unshift(req.acceptedAmbulance.dispatcher.phone);

    const body = L[lang].wonBody(
        req.acceptedAmbulance.clinic.nameUz,
        req.acceptedAmbulance.callSign,
        Array.from(new Set(phones)),
        req.estimatedDurationMin,
    );
    try {
        await bot.api.sendMessage(
            Number(req.patient.telegramAccount.chatId),
            `${L[lang].wonTitle}\n\n${body}`,
            { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
        );
    } catch (e) {
        console.error('[skory] notifyPatientWon failed', { requestId }, e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher post-accept status workflow (DISPATCHED → ON_ROUTE → ARRIVED → COMPLETED)
// ─────────────────────────────────────────────────────────────────────────────

function dispatcherStatusKeyboard(lang: Lang, requestId: string, next: DispatcherStatus): InlineKeyboard {
    const t = L[lang];
    const kb = new InlineKeyboard();
    if (next === 'ON_ROUTE') kb.text(t.actOnRoute, `skory:status:ON_ROUTE:${requestId}`);
    if (next === 'ARRIVED') kb.text(t.actArrived, `skory:status:ARRIVED:${requestId}`);
    if (next === 'COMPLETED') kb.text(t.actCompleted, `skory:status:COMPLETED:${requestId}`);
    return kb;
}

function nextDispatcherStatus(cur: string): DispatcherStatus | null {
    if (cur === 'DISPATCHED') return 'ON_ROUTE';
    if (cur === 'ON_ROUTE') return 'ARRIVED';
    if (cur === 'ARRIVED') return 'COMPLETED';
    return null;
}

function reviewKeyboard(requestId: string): InlineKeyboard {
    const kb = new InlineKeyboard();
    for (let s = 1; s <= 5; s++) kb.text('⭐'.repeat(s), `skory:review:${s}:${requestId}`);
    return kb;
}

async function notifyPatientStatus(bot: Bot, requestId: string, status: DispatcherStatus): Promise<void> {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { patient: { select: { telegramAccount: { select: { chatId: true, language: true } } } } },
    });
    const chatId = req?.patient.telegramAccount?.chatId;
    if (!chatId) return;
    const lang: Lang = req!.patient.telegramAccount!.language === 'ru' ? 'ru' : 'uz';
    const t = L[lang];
    const msg = status === 'ON_ROUTE' ? t.statusOnRoutePat
        : status === 'ARRIVED' ? t.statusArrivedPat
        : t.statusCompletedPat;
    try {
        await bot.api.sendMessage(Number(chatId), msg, { parse_mode: 'HTML' });
        // On COMPLETED, follow up with a review prompt — best-effort so we don't
        // care if the second send fails.
        if (status === 'COMPLETED') {
            try {
                await bot.api.sendMessage(Number(chatId), t.reviewAsk, {
                    parse_mode: 'HTML',
                    reply_markup: reviewKeyboard(requestId),
                });
            } catch { /* */ }
        }
    } catch (e) {
        console.error('[skory] notifyPatientStatus failed', { requestId, status }, e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending expiry worker — auto-cancels PENDING requests no dispatcher
// accepted within the SLA. Notifies the patient + edits dispatcher messages
// in place to "⌛ request expired".
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_TIMEOUT_MS = Number(process.env.SKORY_PENDING_TIMEOUT_MS) || 5 * 60 * 1000; // 5 min
const EXPIRY_TICK_MS = 30_000;
let expiryWorkerStarted = false;

function startPendingExpiryWorker(bot: Bot): void {
    if (expiryWorkerStarted) return;
    expiryWorkerStarted = true;
    const tick = async () => {
        try {
            const cutoff = new Date(Date.now() - PENDING_TIMEOUT_MS);
            const stale = await prisma.ambulanceRequest.findMany({
                where: { status: 'PENDING', createdAt: { lt: cutoff } },
                select: { id: true },
            });
            for (const r of stale) {
                try {
                    const expired = await expirePendingRequest(r.id);
                    if (!expired) continue;
                    // Notify patient
                    const chatId = expired.patient.telegramAccount?.chatId;
                    if (chatId) {
                        const lang: Lang = expired.patient.telegramAccount?.language === 'ru' ? 'ru' : 'uz';
                        try {
                            await bot.api.sendMessage(Number(chatId), L[lang].patientExpired, { parse_mode: 'HTML' });
                        } catch { /* */ }
                    }
                    // Edit dispatcher messages
                    for (const o of expired.offers) {
                        if (!o.telegramChatId || !o.telegramMessageId) continue;
                        try {
                            // Best-effort: lookup dispatcher's lang to localize
                            const acc = await (prisma as any).telegramAccount.findUnique({
                                where: { chatId: o.telegramChatId },
                                select: { language: true },
                            });
                            const dLang: Lang = acc?.language === 'ru' ? 'ru' : 'uz';
                            await bot.api.editMessageText(
                                Number(o.telegramChatId),
                                Number(o.telegramMessageId),
                                L[dLang].requestExpired,
                                { parse_mode: 'HTML' },
                            );
                        } catch { /* */ }
                    }
                } catch (e) {
                    console.error('[skory] expire request failed', r.id, e);
                }
            }
        } catch (e) {
            console.error('[skory] expiry tick failed', e);
        }
    };
    setInterval(tick, EXPIRY_TICK_MS);
    // First tick on bot startup to mop up any stale rows from a previous run.
    setTimeout(tick, 5_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Callback registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Telegram Live Location handler. When an ambulance dispatcher shares a live
 * location (initial send OR every periodic update), we look up the ambulance
 * by their user id and write the coords + the live-period expiry to the
 * Ambulance row. Public maps and findCandidates() will then pick up the
 * fresh coordinate via Ambulance.currentLatitude/Longitude.
 *
 * Telegram sends:
 *   • message:location with live_period > 0       — first share
 *   • edited_message:location                     — periodic updates (~every 2-5s
 *                                                   while moving)
 * Both are routed here.
 */
async function handleDispatcherLiveLocation(ctx: any): Promise<void> {
    const chatId = ctx.chat?.id;
    const msg = ctx.editedMessage ?? ctx.message;
    const loc = msg?.location;
    if (!chatId || !loc) return;
    // Only care if it's a live share (single-shot pickup is for patient wizard)
    const livePeriod = loc.live_period as number | undefined;
    if (!livePeriod || livePeriod <= 0) {
        // Could still be a one-shot location share — if so we just ignore it
        // here; the patient wizard handler in telegram.bot.ts already owns
        // single-shot location messages.
        return;
    }
    // Resolve dispatcher → ambulance
    const acc = await (prisma as any).telegramAccount.findUnique({
        where: { chatId: BigInt(chatId) },
        select: { userId: true },
    });
    if (!acc?.userId) return;
    const ambulance = await prisma.ambulance.findFirst({
        where: { dispatcherUserId: acc.userId, isActive: true },
        select: { id: true },
    });
    if (!ambulance) return;
    // edit_date (sec since epoch) is when Telegram pushed this update; fall
    // back to now() if the field is absent.
    const editSec = (msg.edit_date ?? msg.date ?? Math.floor(Date.now() / 1000)) as number;
    const expiresAt = new Date((editSec + livePeriod) * 1000);
    try {
        await prisma.ambulance.update({
            where: { id: ambulance.id },
            data: {
                currentLatitude: loc.latitude,
                currentLongitude: loc.longitude,
                liveLocationUntil: expiresAt,
                lastStatusAt: new Date(),
            },
        });
    } catch (e) {
        console.warn('[skory] live location update failed', { ambulanceId: ambulance.id }, e);
    }
}

export function registerSkoryHandlers(bot: Bot): void {
    startPendingExpiryWorker(bot);

    // Dispatcher: short how-to for enabling Live Location share.
    bot.command('livelocation', async (ctx) => {
        const chatId = ctx.chat?.id;
        const lang: Lang = chatId ? await lookupLang(chatId) : 'uz';
        const acc = chatId ? await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) }, select: { userId: true },
        }) : null;
        const amb = acc?.userId ? await prisma.ambulance.findFirst({
            where: { dispatcherUserId: acc.userId, isActive: true },
            select: { id: true, callSign: true, liveLocationUntil: true },
        }) : null;
        if (!amb) {
            await ctx.reply(lang === 'ru'
                ? 'Этот чат не привязан ни к одной машине скорой.'
                : 'Bu chat hech qaysi ambulansga biriktirilmagan.');
            return;
        }
        const liveOn = amb.liveLocationUntil && amb.liveLocationUntil > new Date();
        const statusLine = liveOn
            ? (lang === 'ru' ? `🔴 Live: до ${amb.liveLocationUntil!.toLocaleTimeString('ru')}` : `🔴 Live yoqilgan: ${amb.liveLocationUntil!.toLocaleTimeString('uz-UZ')} gacha`)
            : (lang === 'ru' ? '⚪ Live выключен' : '⚪ Live o\'chiq');
        const howTo = lang === 'ru'
            ? '<b>Как включить Live Location:</b>\n\n' +
              '1. Нажмите 📎 (скрепка)\n' +
              '2. Выберите «Геопозиция»\n' +
              '3. Нажмите «Транслировать геопозицию» (Share My Live Location)\n' +
              '4. Выберите длительность: 15 мин / 1 ч / 8 ч\n\n' +
              'Бот будет получать ваши координаты каждые ~5 секунд, ' +
              'и пациенты увидят машину в реальном времени на карте.'
            : '<b>Live Location\'ni yoqish:</b>\n\n' +
              '1. 📎 (klip) tugmasini bosing\n' +
              '2. "Joylashuv" (Location) ni tanlang\n' +
              '3. "Mening joriy joyimni efirga uzatish" (Share My Live Location) ni bosing\n' +
              '4. Davomiylikni tanlang: 15 daq / 1 soat / 8 soat\n\n' +
              'Bot har ~5 soniyada koordinatangizni oladi, ' +
              'va bemorlar sizning ambulansingizni xaritada real vaqt rejimida ko\'radi.';
        await ctx.reply(`🚑 <b>${esc(amb.callSign)}</b>\n${statusLine}\n\n${howTo}`, {
            parse_mode: 'HTML',
        });
    });

    // Live location updates from dispatchers (initial share + periodic edits)
    bot.on('edited_message:location', handleDispatcherLiveLocation);
    bot.on('message:location', async (ctx, next) => {
        // Only swallow live shares — single-shot pickups belong to the
        // patient wizard router in telegram.bot.ts. We detect live via
        // live_period; otherwise call next() so the other handler runs.
        const lp = ctx.message?.location?.live_period as number | undefined;
        if (lp && lp > 0) {
            await handleDispatcherLiveLocation(ctx);
            return;
        }
        await next();
    });
    // Start wizard from any "skoriy chaqirish" button
    bot.callbackQuery('skory:start', async (ctx) => {
        await ctx.answerCallbackQuery();
        await startSkoryWizard(ctx);
    });

    // Wizard back: re-show the previous step's keyboard inline.
    bot.callbackQuery(/^skory:back:([1-4])$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) { await ctx.answerCallbackQuery(); return; }
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || !wiz.data) {
            await ctx.answerCallbackQuery();
            return;
        }
        await ctx.answerCallbackQuery();
        const target = parseInt(ctx.match![1], 10);
        const t = L[lang];
        const newData: any = { ...wiz.data };
        // Strip downstream fields when going back so user actually re-enters
        if (target <= 1) {
            // back to step 1 — re-prompt for location via reply keyboard
            await setWizardState(chatId, { kind: 'skory' as any, data: { step: 1 } });
            try { await ctx.deleteMessage(); } catch { /* */ }
            await ctx.reply(`${t.startTitle}\n\n${t.startHelp}`, {
                parse_mode: 'HTML',
                reply_markup: pickupKeyboard(lang),
            });
            return;
        }
        if (target <= 2) { delete newData.dest; delete newData.priceMaxSom; delete newData.description; }
        else if (target <= 3) { delete newData.priceMaxSom; delete newData.description; }
        else if (target <= 4) { delete newData.description; }
        newData.step = target;
        await setWizardState(chatId, { kind: 'skory' as any, data: newData });
        if (target === 3) {
            // Price step renders the live market range — needs its own helper.
            try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch { /* */ }
            await sendPriceStep(ctx, lang, newData);
            return;
        }
        const title = target === 2 ? t.step2Title : t.step4Title;
        const kb = target === 2 ? destKeyboard(lang) : descKeyboard(lang);
        try {
            await ctx.editMessageText(title, { parse_mode: 'HTML', reply_markup: kb });
        } catch {
            await ctx.reply(title, { parse_mode: 'HTML', reply_markup: kb });
        }
    });

    // Wizard cancel (from anywhere)
    bot.callbackQuery('skory:cancel', async (ctx) => {
        const chatId = ctx.chat?.id;
        const lang = chatId ? await lookupLang(chatId) : 'uz';
        if (chatId) await setWizardState(chatId, null);
        await ctx.answerCallbackQuery();
        try { await ctx.editMessageText(L[lang].cancelled); } catch { /* */ }
    });

    // Destination — top-level choice (hospital | custom map | skip)
    bot.callbackQuery(/^skory:dest:(hospital|custom|skip)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 2) {
            await ctx.answerCallbackQuery();
            return;
        }
        const choice = ctx.match![1];
        await ctx.answerCallbackQuery();

        if (choice === 'hospital') {
            const clinics = await getNearbyClinics(wiz.data.pickup.lat, wiz.data.pickup.lng, 10);
            if (clinics.length === 0) {
                await ctx.reply(L[lang].noCandidates, { parse_mode: 'HTML' });
                return;
            }
            try {
                await ctx.editMessageText(L[lang].destClinicHeader, {
                    parse_mode: 'HTML',
                    reply_markup: clinicListKeyboard(lang, clinics),
                });
            } catch {
                await ctx.reply(L[lang].destClinicHeader, {
                    parse_mode: 'HTML', reply_markup: clinicListKeyboard(lang, clinics),
                });
            }
            return;
        }

        if (choice === 'custom') {
            await setWizardState(chatId, {
                kind: 'skory' as any,
                data: { ...wiz.data, sub: 'await_dropoff' },
            });
            try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch { /* */ }
            await ctx.reply(L[lang].destShareDropoffPrompt, {
                parse_mode: 'HTML',
                reply_markup: customDropoffKeyboard(lang),
            });
            return;
        }

        // skip — no destination, straight to description (no price step)
        await setWizardState(chatId, { kind: 'skory' as any, data: { ...wiz.data, step: 4, dest: null, priceMaxSom: null } });
        try { await ctx.deleteMessage(); } catch { /* */ }
        await ctx.reply(L[lang].step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
    });

    // Destination — a specific hospital from the list
    bot.callbackQuery(/^skory:clinic:(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 2) {
            await ctx.answerCallbackQuery();
            return;
        }
        const clinicId = ctx.match![1];
        const clinic = await prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { id: true, nameUz: true, latitude: true, longitude: true, addressUz: true },
        });
        if (!clinic || clinic.latitude == null || clinic.longitude == null) {
            await ctx.answerCallbackQuery('—');
            return;
        }
        const dest = {
            clinicId: clinic.id,
            label: clinic.nameUz,
            lat: clinic.latitude,
            lng: clinic.longitude,
        };
        // Price step removed — go straight to the description step, no budget.
        await setWizardState(chatId, { kind: 'skory' as any, data: { ...wiz.data, step: 4, dest, priceMaxSom: null } });
        await ctx.answerCallbackQuery(`✅ ${clinic.nameUz}`);
        try { await ctx.deleteMessage(); } catch { /* */ }
        await ctx.reply(L[lang].step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
    });

    // Price — accept-all (no ceiling)
    bot.callbackQuery('skory:price:all', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 3) {
            await ctx.answerCallbackQuery();
            return;
        }
        await setWizardState(chatId, {
            kind: 'skory' as any,
            data: { ...wiz.data, sub: undefined, step: 4, priceMaxSom: null },
        });
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(L[lang].step4Title, {
                parse_mode: 'HTML', reply_markup: descKeyboard(lang),
            });
        } catch {
            await ctx.reply(L[lang].step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
        }
    });

    // Price — enter custom max
    bot.callbackQuery('skory:price:enter', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 3) {
            await ctx.answerCallbackQuery();
            return;
        }
        await setWizardState(chatId, {
            kind: 'skory' as any,
            data: { ...wiz.data, sub: 'await_price' },
        });
        await ctx.answerCallbackQuery();
        await ctx.reply(L[lang].priceEnterPrompt, { parse_mode: 'HTML' });
    });

    // Confirm-screen edit chips — re-show step N's UI without stripping
    // other fields. (Re-doing that step naturally overwrites just that field.)
    bot.callbackQuery(/^skory:edit:([1-4])$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || !wiz.data) {
            await ctx.answerCallbackQuery();
            return;
        }
        await ctx.answerCallbackQuery();
        const target = parseInt(ctx.match![1], 10);
        const t = L[lang];
        const newData = { ...wiz.data, step: target, sub: undefined };
        await setWizardState(chatId, { kind: 'skory' as any, data: newData });
        try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch { /* */ }

        if (target === 1) {
            await ctx.reply(`${t.startTitle}\n\n${t.startHelp}`, {
                parse_mode: 'HTML', reply_markup: pickupKeyboard(lang),
            });
            return;
        }
        if (target === 2) {
            await ctx.reply(t.step2Title, { parse_mode: 'HTML', reply_markup: destKeyboard(lang) });
            return;
        }
        if (target === 3) {
            // Price step removed — a stale "edit price" tap lands on description.
            await setWizardState(chatId, { kind: 'skory' as any, data: { ...newData, step: 4, priceMaxSom: null } });
            await ctx.reply(t.step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
            return;
        }
        // target === 4
        await ctx.reply(t.step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
    });

    // Description: skip
    bot.callbackQuery('skory:desc:skip', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 4) {
            await ctx.answerCallbackQuery();
            return;
        }
        const data = { ...wiz.data, step: 5, description: null };
        await setWizardState(chatId, { kind: 'skory' as any, data });
        await ctx.answerCallbackQuery();
        try { await ctx.deleteMessage(); } catch { /* */ }
        await showConfirm(ctx, lang, data);
    });

    // Confirm → dispatch
    bot.callbackQuery('skory:confirm', async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 5) {
            await ctx.answerCallbackQuery();
            return;
        }
        await ctx.answerCallbackQuery(L[lang].sending);
        try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch { /* */ }
        await dispatchRequestFromWizard(bot, ctx, lang, wiz.data);
    });

    // Patient cancels in-flight request
    bot.callbackQuery(/^skory:patient:cancel:(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const patient = await resolvePatient(chatId);
        if (!patient) { await ctx.answerCallbackQuery(); return; }
        const requestId = ctx.match![1];
        try {
            await cancelRequest(requestId, patient.userId, 'patient_cancelled');
        } catch (e: any) {
            await ctx.answerCallbackQuery(e?.message || 'Xato');
            return;
        }
        await ctx.answerCallbackQuery();
        try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch { /* */ }
        await ctx.reply(L[lang].patientCancelled);
        // Edit dispatcher messages
        const offers = await prisma.dispatchOffer.findMany({
            where: { requestId, telegramMessageId: { not: null } },
            include: { dispatcher: { select: { telegramAccount: { select: { language: true } } } } },
        });
        for (const o of offers) {
            if (!o.telegramChatId || !o.telegramMessageId) continue;
            const dispatcherLang: Lang = o.dispatcher?.telegramAccount?.language === 'ru' ? 'ru' : 'uz';
            try {
                await bot.api.editMessageText(
                    Number(o.telegramChatId),
                    Number(o.telegramMessageId),
                    L[dispatcherLang].requestCancelled,
                    { parse_mode: 'HTML' },
                );
            } catch { /* */ }
        }
    });

    // Dispatcher accept
    bot.callbackQuery(/^skory:offer:accept:(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { userId: true },
        });
        if (!acc?.userId) { await ctx.answerCallbackQuery(); return; }
        const offerId = ctx.match![1];
        let result;
        try {
            result = await acceptOffer(offerId, acc.userId);
        } catch (e: any) {
            await ctx.answerCallbackQuery(e?.message || 'Xato');
            return;
        }
        await ctx.answerCallbackQuery();
        if (result.won) {
            try {
                await ctx.editMessageText(
                    `${ctx.callbackQuery?.message?.text || ''}\n\n${L[lang].acceptedByMe}`,
                    {
                        parse_mode: 'HTML',
                        link_preview_options: { is_disabled: true },
                        reply_markup: dispatcherStatusKeyboard(lang, result.request.id, 'ON_ROUTE'),
                    },
                );
            } catch { /* */ }
            // Run side-effects after responding to the dispatcher.
            await Promise.all([
                editLosingOffers(bot, result.request.id, offerId),
                notifyPatientWon(bot, result.request.id),
            ]);
        } else {
            try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch { /* */ }
            try {
                await ctx.editMessageText(L[lang].acceptedByOther);
            } catch { /* */ }
        }
    });

    // Dispatcher post-accept status updates (ON_ROUTE → ARRIVED → COMPLETED)
    bot.callbackQuery(/^skory:status:(ON_ROUTE|ARRIVED|COMPLETED):(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { userId: true },
        });
        if (!acc?.userId) { await ctx.answerCallbackQuery(); return; }
        const newStatus = ctx.match![1] as DispatcherStatus;
        const requestId = ctx.match![2];
        let result;
        try {
            result = await updateRequestStatus(requestId, acc.userId, newStatus);
        } catch (e: any) {
            await ctx.answerCallbackQuery(e?.message || 'Xato');
            return;
        }
        await ctx.answerCallbackQuery();
        const t = L[lang];
        const dispLine = newStatus === 'ON_ROUTE' ? t.statusOnRouteDisp
            : newStatus === 'ARRIVED' ? t.statusArrivedDisp
            : t.statusCompletedDisp;
        const nxt = nextDispatcherStatus(newStatus);
        try {
            await ctx.editMessageText(
                `${ctx.callbackQuery?.message?.text || ''}\n\n${dispLine}`,
                {
                    parse_mode: 'HTML',
                    link_preview_options: { is_disabled: true },
                    reply_markup: nxt ? dispatcherStatusKeyboard(lang, requestId, nxt) : undefined,
                },
            );
        } catch { /* */ }
        if (result.ok) await notifyPatientStatus(bot, requestId, newStatus);
    });

    // Patient leaves a 1-5 star review on a completed request.
    bot.callbackQuery(/^skory:review:([1-5]):(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const patient = await resolvePatient(chatId);
        if (!patient) { await ctx.answerCallbackQuery(); return; }
        const rating = parseInt(ctx.match![1], 10);
        const requestId = ctx.match![2];
        try {
            await submitReview({ requestId, patientId: patient.userId, rating });
        } catch (e: any) {
            await ctx.answerCallbackQuery(e?.message || 'Xato');
            return;
        }
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(
                `${L[lang].reviewThanks}\n\n${'⭐'.repeat(rating)}`,
                { parse_mode: 'HTML' },
            );
        } catch { /* */ }
    });

    // Dispatcher decline
    bot.callbackQuery(/^skory:offer:decline:(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const acc = await (prisma as any).telegramAccount.findUnique({
            where: { chatId: BigInt(chatId) },
            select: { userId: true },
        });
        if (!acc?.userId) { await ctx.answerCallbackQuery(); return; }
        const offerId = ctx.match![1];
        try {
            await declineOffer(offerId, acc.userId);
        } catch (e: any) {
            await ctx.answerCallbackQuery(e?.message || 'Xato');
            return;
        }
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(L[lang].declinedByMe);
        } catch { /* */ }
    });
}
