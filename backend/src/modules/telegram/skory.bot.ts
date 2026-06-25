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
    type CandidateAmbulance,
} from '../skory/skory.service';

type Lang = 'uz' | 'ru';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PRICE_TIERS_SOM = [100_000, 200_000, 500_000];

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
        // Dispatcher messages
        offerTitle: '🚨 <b>YANGI TEZ YORDAM SO\'ROVI</b>',
        accept: '✅ Qabul qilaman',
        decline: '❌ O\'tkazib yuborish',
        acceptedByMe: '✅ Siz qabul qildingiz. Bemorga xabar yuborildi.',
        acceptedByOther: '❌ Bu chaqiruvni boshqa ambulans qabul qildi.',
        declinedByMe: 'O\'tkazib yuborildi.',
        requestCancelled: '❌ Bemor so\'rovni bekor qildi.',
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
        offerTitle: '🚨 <b>НОВЫЙ ВЫЗОВ СКОРОЙ</b>',
        accept: '✅ Принимаю',
        decline: '❌ Пропустить',
        acceptedByMe: '✅ Вы приняли. Пациенту отправлено уведомление.',
        acceptedByOther: '❌ Этот вызов принят другой машиной.',
        declinedByMe: 'Пропущено.',
        requestCancelled: '❌ Пациент отменил запрос.',
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
        .text(L[lang].destNearest, 'skory:dest:nearest').row()
        .text(L[lang].destSkip, 'skory:dest:skip').row()
        .text(L[lang].cancel, 'skory:cancel');
}

function priceKeyboard(lang: Lang): InlineKeyboard {
    const kb = new InlineKeyboard();
    for (const p of PRICE_TIERS_SOM) {
        kb.text(`≤ ${fmtSom(p)} so'm`, `skory:price:${p}`).row();
    }
    kb.text(L[lang].priceUnlimited, 'skory:price:0').row();
    kb.text(L[lang].cancel, 'skory:cancel');
    return kb;
}

function descKeyboard(lang: Lang): InlineKeyboard {
    return new InlineKeyboard()
        .text(L[lang].descSkip, 'skory:desc:skip').row()
        .text(L[lang].cancel, 'skory:cancel');
}

function confirmKeyboard(lang: Lang): InlineKeyboard {
    return new InlineKeyboard()
        .text(L[lang].confirmSend, 'skory:confirm').row()
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
 * Called from telegram.bot.ts when an inbound message has `location` AND the
 * current wizard is 'skory' step 1. Advances to step 2.
 */
export async function handleSkoryPickup(ctx: any, location: { latitude: number; longitude: number }): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const lang = await lookupLang(chatId);
    const wiz = await getWizardState(chatId);
    if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 1) return;

    await setWizardState(chatId, {
        kind: 'skory' as any,
        data: {
            step: 2,
            pickup: { lat: location.latitude, lng: location.longitude },
        },
    });
    // Replace the live-geo keyboard with the normal reply keyboard.
    await ctx.reply(L[lang].step2Title, {
        parse_mode: 'HTML',
        reply_markup: destKeyboard(lang),
    });
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
    const summary: string[] = [];
    summary.push(`📍 Joyingiz olinadi`);
    if (data.dest?.lat) summary.push(`🏥 Manzil: tanlangan koordinata`);
    else if (data.dest?.label) summary.push(`🏥 Manzil: ${esc(data.dest.label)}`);
    summary.push(`💰 Maksimal narx: ${data.priceMaxSom ? `${fmtSom(data.priceMaxSom)} so'm` : L[lang].priceUnlimited}`);
    if (data.description) summary.push(`📝 ${esc(data.description)}`);

    await ctx.reply(`${L[lang].confirmIntro}${summary.join('\n')}`, {
        parse_mode: 'HTML',
        reply_markup: confirmKeyboard(lang),
    });
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
    const lines = [
        L[lang].offerTitle,
        '',
        `👤 Bemor: <b>${esc(ctx.patientName || 'Bemor')}</b>`,
    ];
    if (ctx.patientPhone) lines.push(`📞 <a href="tel:${ctx.patientPhone}">${esc(ctx.patientPhone)}</a>`);
    lines.push('');
    lines.push(`📍 Olib ketish: ${esc(ctx.pickupAddress || `${ctx.pickupLat.toFixed(5)}, ${ctx.pickupLng.toFixed(5)}`)}`);
    if (ctx.destAddress) lines.push(`🏥 Manzil: ${esc(ctx.destAddress)}`);
    lines.push('');
    lines.push(`📏 Masofa: <b>${ctx.distanceKm.toFixed(1)} km</b>`);
    lines.push(`⏱ ETA: <b>~${ctx.durationMin} daq</b>`);
    lines.push(`💵 Taxminiy narx: <b>${fmtSom(ctx.estimatedPrice)} so'm</b>`);
    if (ctx.priceMaxSom) lines.push(`💰 Bemor maks: ${fmtSom(ctx.priceMaxSom)} so'm`);
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
 * Called from "Yuborish" confirm handler. Validates, runs the dispatch
 * engine, creates request + offers, then pushes a message to every
 * dispatcher and records the resulting telegram message ids.
 */
async function dispatchRequestFromWizard(bot: Bot, ctx: any, lang: Lang, data: any): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const patient = await resolvePatient(chatId);
    if (!patient) return;

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

    // Confirm to patient.
    await ctx.reply(
        `${L[lang].sentTitle}\n\n${L[lang].sentDesc(candidates.length)}`,
        { parse_mode: 'HTML', reply_markup: patientPendingKeyboard(lang, request.id) },
    );

    // Send to dispatchers. Map by ambulanceId for quick lookup.
    const candidateByAmbId = new Map<string, CandidateAmbulance>();
    for (const c of candidates) candidateByAmbId.set(c.ambulanceId, c);

    for (const offer of offers) {
        const c = candidateByAmbId.get(offer.ambulanceId);
        if (!c || !c.dispatcherChatId) continue;
        const dispatcherLang = c.dispatcherLanguage === 'ru' ? 'ru' : 'uz';
        const text = renderOfferText(dispatcherLang, {
            bookingId: request.id,
            patientName,
            patientPhone,
            pickupAddress: data.pickup.address ?? null,
            pickupLat: data.pickup.lat,
            pickupLng: data.pickup.lng,
            destAddress: data.dest?.label ?? null,
            distanceKm: c.distanceKm,
            durationMin: c.durationMin,
            estimatedPrice: c.estimatedPrice,
            priceMaxSom: data.priceMaxSom ?? null,
            description: data.description ?? null,
        });
        try {
            // Forward pickup live location to dispatcher first (one-tap nav).
            await bot.api.sendLocation(Number(c.dispatcherChatId), data.pickup.lat, data.pickup.lng);
            const sent = await bot.api.sendMessage(Number(c.dispatcherChatId), text, {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true },
                reply_markup: offerKeyboard(dispatcherLang, offer.id),
            });
            await prisma.dispatchOffer.update({
                where: { id: offer.id },
                data: { telegramMessageId: BigInt(sent.message_id) },
            });
        } catch (e) {
            console.error('[skory] sendOffer failed', { offerId: offer.id, chatId: c.dispatcherChatId }, e);
        }
    }
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
// Callback registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerSkoryHandlers(bot: Bot): void {
    // Start wizard from any "skoriy chaqirish" button
    bot.callbackQuery('skory:start', async (ctx) => {
        await ctx.answerCallbackQuery();
        await startSkoryWizard(ctx);
    });

    // Wizard cancel (from anywhere)
    bot.callbackQuery('skory:cancel', async (ctx) => {
        const chatId = ctx.chat?.id;
        const lang = chatId ? await lookupLang(chatId) : 'uz';
        if (chatId) await setWizardState(chatId, null);
        await ctx.answerCallbackQuery();
        try { await ctx.editMessageText(L[lang].cancelled); } catch { /* */ }
    });

    // Destination chips
    bot.callbackQuery(/^skory:dest:(nearest|skip)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 2) {
            await ctx.answerCallbackQuery();
            return;
        }
        const choice = ctx.match![1];
        let dest: any = null;
        if (choice === 'nearest') {
            // Pick nearest active clinic by haversine.
            const clinics = await prisma.clinic.findMany({
                where: { status: 'APPROVED', isActive: true, latitude: { not: null }, longitude: { not: null } },
                select: { id: true, nameUz: true, latitude: true, longitude: true },
            });
            const px = wiz.data.pickup.lat;
            const py = wiz.data.pickup.lng;
            let best: { id: string; nameUz: string; lat: number; lng: number; d: number } | null = null;
            for (const c of clinics) {
                if (c.latitude == null || c.longitude == null) continue;
                const dLat = (c.latitude - px) * Math.PI / 180;
                const dLng = (c.longitude - py) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(px * Math.PI / 180) * Math.cos(c.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
                const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                if (!best || d < best.d) best = { id: c.id, nameUz: c.nameUz, lat: c.latitude, lng: c.longitude, d };
            }
            if (best) dest = { clinicId: best.id, label: best.nameUz, lat: best.lat, lng: best.lng };
        }
        await setWizardState(chatId, { kind: 'skory' as any, data: { ...wiz.data, step: 3, dest } });
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(L[lang].step3Title, {
                parse_mode: 'HTML',
                reply_markup: priceKeyboard(lang),
            });
        } catch { /* fall back to new message */
            await ctx.reply(L[lang].step3Title, { parse_mode: 'HTML', reply_markup: priceKeyboard(lang) });
        }
    });

    // Price chips
    bot.callbackQuery(/^skory:price:(\d+)$/, async (ctx) => {
        const chatId = ctx.chat?.id;
        if (!chatId) return;
        const lang = await lookupLang(chatId);
        const wiz = await getWizardState(chatId);
        if ((wiz as any).kind !== 'skory' || wiz.data?.step !== 3) {
            await ctx.answerCallbackQuery();
            return;
        }
        const priceMaxSom = parseInt(ctx.match![1], 10) || null;
        await setWizardState(chatId, {
            kind: 'skory' as any,
            data: { ...wiz.data, step: 4, priceMaxSom },
        });
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(L[lang].step4Title, {
                parse_mode: 'HTML',
                reply_markup: descKeyboard(lang),
            });
        } catch {
            await ctx.reply(L[lang].step4Title, { parse_mode: 'HTML', reply_markup: descKeyboard(lang) });
        }
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
        try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch { /* */ }
        if (result.won) {
            try {
                await ctx.editMessageText(
                    `${ctx.callbackQuery?.message?.text || ''}\n\n${L[lang].acceptedByMe}`,
                    { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
                );
            } catch { /* */ }
            // Run side-effects after responding to the dispatcher.
            await Promise.all([
                editLosingOffers(bot, result.request.id, offerId),
                notifyPatientWon(bot, result.request.id),
            ]);
        } else {
            try {
                await ctx.editMessageText(L[lang].acceptedByOther);
            } catch { /* */ }
        }
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
