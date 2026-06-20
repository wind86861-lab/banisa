import { NotificationEvent } from './notification.types';

/**
 * Render a single event into channel-specific strings.
 * SMS templates are short (Eskiz charges per ~70-char segment for Cyrillic).
 * In-app templates can be richer (title + body).
 * Telegram templates use markdown and can include an inline link.
 *
 * Language: 'uz' (default) or 'ru'. Currently only Telegram callers pass 'ru'
 * (based on TelegramAccount.language). SMS + in-app stay Uzbek by default
 * since most patients are Uzbek-first; we can extend per-user later.
 */

export type TplLang = 'uz' | 'ru';

interface RenderedTemplate {
    /** Title used by in-app (and telegram first line if no link). */
    title: string;
    /** Body — used by in-app + telegram. */
    body: string;
    /** Compact SMS variant (≤160 chars). */
    sms: string;
    /** Telegram-flavoured markdown — falls back to body if not set. */
    telegram?: string;
}

function fmtPrice(value: number | undefined | null): string {
    if (!value) return '';
    return Number(value).toLocaleString('en-US').replace(/,/g, ' ');
}

// Patient-facing notifications always render in Asia/Tashkent. The host
// runs UTC; without an explicit timeZone toLocaleString quietly returned
// UTC strings, so every appointment reminder said the wrong hour.
const PATIENT_TZ = 'Asia/Tashkent';

/** Escape the chars Telegram HTML parse mode treats as markup. */
function esc(s: string | number | null | undefined): string {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function fmtTime(at: Date | string | undefined | null, lang: TplLang): string {
    if (!at) return '';
    const d = typeof at === 'string' ? new Date(at) : at;
    if (Number.isNaN(d.getTime())) return '';
    const locale = lang === 'ru' ? 'ru-RU' : 'uz-UZ';
    try {
        return d.toLocaleString(locale, {
            timeZone: PATIENT_TZ,
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: false,
        });
    } catch {
        const t = new Date(d.getTime() + 5 * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(t.getUTCDate())}.${pad(t.getUTCMonth() + 1)}.${t.getUTCFullYear()} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
    }
}

/** Per-language short-form strings used inside templates. */
const T = {
    uz: {
        service: 'Xizmat', clinic: 'Klinika', patient: 'Bemor', appt: 'Qabul',
        cabinetOpen: "Kabinetga o'ting",
        bookingConfirmed: 'Bron tasdiqlandi',
        bookingCancelled: 'Bron bekor qilindi',
        remindTomorrow: 'Ertaga qabul',
        remind1h: '1 soatdan keyin qabul',
        paymentReceived: "To'lov qabul qilindi",
        queueIsYours: 'Navbat sizniki',
        newBooking: 'Yangi bron',
        cashPending: "Naqd to'lov kutilmoqda",
        patientArrived: 'Bemor keldi',
        onlinePaid: "onlayn to'langan",
        som: "so'm",
        queueNum: 'Navbat',
        minutes: 'daq',
        waited: 'kutmoqda',
        smsPrefix: 'Banisa:',
        smsBookingConfirmed: 'bron tasdiqlandi',
        smsBookingCancelled: 'bron bekor qilindi',
        smsRemindTomorrow: 'ertaga qabul',
        smsRemind1h: '1 soatdan keyin qabul',
        smsPaymentReceived: "to'lov qabul qilindi",
        smsQueueIsYours: 'navbat sizniki',
        smsNewBooking: 'yangi bron',
        smsPatientArrived: 'keldi',
        bookingReadyForPayment: "To'lash uchun tayyor",
        smsBookingReadyForPayment: "klinika tasdiqladi, to'lashingiz mumkin",
        bookingPaymentExpired: "Bron bekor qilindi (to'lov vaqti tugadi)",
        payNow: "💳 To'lash",
        dailyReport: 'Kunlik hisobot',
        total: 'Jami bronlar',
        completed: 'Bajarildi',
        cancelled: 'Bekor qilindi',
        revenue: 'Tushum',
        paidCount: "To'langan",
        pending: 'Kutilmoqda',
    },
    ru: {
        service: 'Услуга', clinic: 'Клиника', patient: 'Пациент', appt: 'Приём',
        cabinetOpen: 'Пройдите в кабинет',
        bookingConfirmed: 'Бронь подтверждена',
        bookingCancelled: 'Бронь отменена',
        remindTomorrow: 'Завтра приём',
        remind1h: 'Приём через 1 час',
        paymentReceived: 'Оплата получена',
        queueIsYours: 'Ваша очередь',
        newBooking: 'Новая бронь',
        cashPending: 'Ожидается оплата наличными',
        patientArrived: 'Пациент пришёл',
        onlinePaid: 'оплачено онлайн',
        som: 'сум',
        queueNum: 'Очередь',
        minutes: 'мин',
        waited: 'ожидает',
        smsPrefix: 'Banisa:',
        smsBookingConfirmed: 'бронь подтверждена',
        smsBookingCancelled: 'бронь отменена',
        smsRemindTomorrow: 'завтра приём',
        smsRemind1h: 'приём через 1 час',
        smsPaymentReceived: 'оплата получена',
        smsQueueIsYours: 'ваша очередь',
        smsNewBooking: 'новая бронь',
        smsPatientArrived: 'пришёл',
        bookingReadyForPayment: 'Готово к оплате',
        smsBookingReadyForPayment: 'клиника подтвердила, оплатите',
        bookingPaymentExpired: 'Бронь отменена (время оплаты истекло)',
        payNow: '💳 Оплатить',
        dailyReport: 'Дневной отчёт',
        total: 'Всего броней',
        completed: 'Выполнено',
        cancelled: 'Отменено',
        revenue: 'Выручка',
        paidCount: 'Оплачено',
        pending: 'Ожидается',
    },
} as const;

export function renderTemplate(event: NotificationEvent, lang: TplLang = 'uz'): RenderedTemplate {
    const t = T[lang];

    switch (event.type) {
        case 'booking_confirmed': {
            const when = fmtTime(event.appointmentAt, lang);
            const svc = event.serviceName || t.service;
            return {
                title: `✅ ${t.bookingConfirmed}`,
                body: `${svc}${when ? ` — ${when}` : ''}${event.clinicName ? ` (${event.clinicName})` : ''}`,
                sms: `${t.smsPrefix} ${t.smsBookingConfirmed}. ${svc}${when ? ` ${when}` : ''}.`,
                telegram: `✅ <b>${esc(t.bookingConfirmed)}</b>\n${esc(svc)}${when ? `\n📅 ${esc(when)}` : ''}${event.clinicName ? `\n🏥 ${esc(event.clinicName)}` : ''}\n\n👇 Tafsilot uchun pastdagi tugmani bosing`,
            };
        }
        case 'booking_ready_for_payment': {
            const when = fmtTime(event.appointmentAt, lang);
            const svc = event.serviceName || t.service;
            const price = event.finalPrice ? `\n💵 ${fmtPrice(event.finalPrice)} ${t.som}` : '';
            return {
                title: `💳 ${t.bookingReadyForPayment}`,
                body: `${svc}${when ? ` — ${when}` : ''}. ${t.payNow}`,
                sms: `${t.smsPrefix} ${t.smsBookingReadyForPayment}. ${svc}${when ? ` ${when}` : ''}.`,
                telegram: `✅ <b>${esc(t.bookingConfirmed)}</b>\n${esc(svc)}${when ? `\n📅 ${esc(when)}` : ''}${event.clinicName ? `\n🏥 ${esc(event.clinicName)}` : ''}${price}\n\n💳 <b>${esc(t.bookingReadyForPayment)}</b> — pastdagi tugmani bosing`,
            };
        }
        case 'booking_payment_expired': {
            const svc = event.serviceName || t.service;
            return {
                title: `⏰ ${t.bookingPaymentExpired}`,
                body: `${svc} — ${t.bookingPaymentExpired}`,
                sms: `${t.smsPrefix} ${t.bookingPaymentExpired}.`,
                telegram: `⏰ <b>${esc(t.bookingPaymentExpired)}</b>\n${esc(svc)}${event.clinicName ? `\n🏥 ${esc(event.clinicName)}` : ''}`,
            };
        }
        case 'booking_cancelled': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `❌ ${t.bookingCancelled}`,
                body: `${event.serviceName || t.service}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsBookingCancelled}${event.bookingNumber ? ` (№${event.bookingNumber})` : ''}.`,
                telegram: `❌ <b>${esc(t.bookingCancelled)}</b>\n${esc(event.serviceName || t.service)}${when ? `\n📅 ${esc(when)}` : ''}`,
            };
        }
        case 'booking_reminder_24h': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `🔔 ${t.remindTomorrow}`,
                body: `${event.serviceName || t.appt}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsRemindTomorrow}${when ? ` ${when}` : ''}. ${event.clinicName || ''}`.trim(),
                telegram: `🔔 <b>${esc(t.remindTomorrow)}</b>\n${esc(event.serviceName || t.appt)}${when ? `\n📅 ${esc(when)}` : ''}${event.clinicName ? `\n🏥 ${esc(event.clinicName)}` : ''}\n\n👇 Bronni ochish va tafsilotni ko'rish uchun tugmani bosing`,
            };
        }
        case 'booking_reminder_1h': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `⏰ ${t.remind1h}`,
                body: `${event.serviceName || t.appt}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsRemind1h}${when ? ` ${when}` : ''}.`,
                telegram: `⏰ <b>${esc(t.remind1h)}</b>\n${esc(event.serviceName || t.appt)}${when ? `\n📅 ${esc(when)}` : ''}${event.clinicName ? `\n🏥 ${esc(event.clinicName)}` : ''}\n\n👇 Klinikaga keldingizmi? QR'ni skanlash uchun bronni oching`,
            };
        }
        case 'payment_received': {
            return {
                title: `✅ ${t.paymentReceived}`,
                body: `${fmtPrice(event.amount)} ${t.som}`,
                sms: `${t.smsPrefix} ${fmtPrice(event.amount)} ${t.som} ${t.smsPaymentReceived}.`,
                telegram: `✅ <b>${esc(t.paymentReceived)}</b>\n💵 ${esc(fmtPrice(event.amount))} ${esc(t.som)}`,
            };
        }
        case 'queue_called': {
            return {
                title: `📣 ${t.queueIsYours}`,
                body: event.queueNumber ? `${t.queueNum} №${event.queueNumber} — ${t.cabinetOpen}` : t.cabinetOpen,
                sms: `${t.smsPrefix} ${t.smsQueueIsYours}${event.queueNumber ? ` (№${event.queueNumber})` : ''}.`,
                telegram: `📣 <b>${esc(t.queueIsYours)}</b>${event.queueNumber ? `\n#${esc(event.queueNumber)}` : ''}`,
            };
        }
        case 'clinic_new_booking': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `📅 ${t.newBooking}`,
                body: `${event.patientName || t.patient} — ${event.serviceName || t.service}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsNewBooking}${event.bookingNumber ? ` №${event.bookingNumber}` : ''}.`,
                telegram: `📅 <b>${esc(t.newBooking)}</b>\n👤 ${esc(event.patientName || t.patient)}\n🩺 ${esc(event.serviceName || t.service)}${when ? `\n📅 ${esc(when)}` : ''}`,
            };
        }
        case 'clinic_patient_checked_in': {
            const isCash = event.paymentMethod === 'CASH';
            return {
                title: isCash ? `💵 ${t.cashPending}` : `✅ ${t.patientArrived}`,
                body: `${event.patientName || t.patient} — ${event.serviceName || t.service}${event.finalPrice ? ` — ${fmtPrice(event.finalPrice)} ${t.som}` : ''}${isCash ? '' : ` (${t.onlinePaid})`}`,
                sms: `${t.smsPrefix} ${event.patientName || t.patient.toLowerCase()} ${t.smsPatientArrived}${event.bookingNumber ? ` №${event.bookingNumber}` : ''}.`,
                telegram: `${isCash ? '💵' : '✅'} <b>${esc(isCash ? t.cashPending : t.patientArrived)}</b>\n👤 ${esc(event.patientName || t.patient)}\n🩺 ${esc(event.serviceName || t.service)}${event.finalPrice ? `\n💵 ${esc(fmtPrice(event.finalPrice))} ${esc(t.som)}` : ''}`,
            };
        }
        case 'clinic_cash_pending': {
            return {
                title: `⏰ ${t.cashPending}`,
                body: `${event.patientName || t.patient} — ${event.serviceName || t.service} — ${fmtPrice(event.finalPrice)} ${t.som}${event.waitMinutes ? ` — ${event.waitMinutes} ${t.minutes} ${t.waited}` : ''}`,
                sms: `${t.smsPrefix} ${event.patientName || t.patient.toLowerCase()} ${t.waited}${event.waitMinutes ? ` (${event.waitMinutes} ${t.minutes})` : ''}.`,
                telegram: `⏰ <b>${esc(t.cashPending)}</b>\n👤 ${esc(event.patientName || t.patient)}\n💵 ${esc(fmtPrice(event.finalPrice))} ${esc(t.som)}${event.waitMinutes ? `\n⏱ ${esc(event.waitMinutes)} ${esc(t.minutes)}` : ''}`,
            };
        }
        case 'clinic_daily_report': {
            const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
                timeZone: PATIENT_TZ,
                day: '2-digit', month: '2-digit', year: 'numeric',
            });
            const lines = [
                `📊 <b>${esc(t.dailyReport)} — ${esc(today)}</b>`,
                ``,
                `📅 ${esc(t.total)}: <b>${esc(event.total)}</b>`,
                `✅ ${esc(t.completed)}: <b>${esc(event.completed)}</b>`,
                `❌ ${esc(t.cancelled)}: <b>${esc(event.cancelled)}</b>`,
                ``,
                `💵 ${esc(t.revenue)}: <b>${esc(fmtPrice(event.revenue))} ${esc(t.som)}</b>`,
                `💳 ${esc(t.paidCount)}: <b>${esc(event.paidCount)}</b>`,
                `⏳ ${esc(t.pending)}: <b>${esc(event.pending)}</b>`,
            ];
            return {
                title: `📊 ${t.dailyReport} — ${today}`,
                body: `${t.total}: ${event.total} • ${t.completed}: ${event.completed} • ${t.cancelled}: ${event.cancelled} • ${t.revenue}: ${fmtPrice(event.revenue)} ${t.som}`,
                sms: `${t.smsPrefix} ${t.dailyReport.toLowerCase()} ${today}: ${event.total}/${event.completed}, ${fmtPrice(event.revenue)} ${t.som}.`.slice(0, 160),
                telegram: lines.join('\n'),
            };
        }
        case 'general': {
            return {
                title: event.title,
                body: event.body,
                sms: `${t.smsPrefix} ${event.body}`.slice(0, 160),
                telegram: `<b>${esc(event.title)}</b>\n${esc(event.body)}`,
            };
        }
    }
}
