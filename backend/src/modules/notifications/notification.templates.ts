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

function fmtTime(at: Date | string | undefined | null, lang: TplLang): string {
    if (!at) return '';
    const d = typeof at === 'string' ? new Date(at) : at;
    if (Number.isNaN(d.getTime())) return '';
    const locale = lang === 'ru' ? 'ru-RU' : 'uz-UZ';
    return d.toLocaleString(locale, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
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
                telegram: `✅ *${t.bookingConfirmed}*\n${svc}${when ? `\n📅 ${when}` : ''}${event.clinicName ? `\n🏥 ${event.clinicName}` : ''}`,
            };
        }
        case 'booking_cancelled': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `❌ ${t.bookingCancelled}`,
                body: `${event.serviceName || t.service}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsBookingCancelled}${event.bookingNumber ? ` (№${event.bookingNumber})` : ''}.`,
                telegram: `❌ *${t.bookingCancelled}*\n${event.serviceName || t.service}${when ? `\n📅 ${when}` : ''}`,
            };
        }
        case 'booking_reminder_24h': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `🔔 ${t.remindTomorrow}`,
                body: `${event.serviceName || t.appt}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsRemindTomorrow}${when ? ` ${when}` : ''}. ${event.clinicName || ''}`.trim(),
                telegram: `🔔 *${t.remindTomorrow}*\n${event.serviceName || t.appt}${when ? `\n📅 ${when}` : ''}${event.clinicName ? `\n🏥 ${event.clinicName}` : ''}`,
            };
        }
        case 'booking_reminder_1h': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `⏰ ${t.remind1h}`,
                body: `${event.serviceName || t.appt}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsRemind1h}${when ? ` ${when}` : ''}.`,
                telegram: `⏰ *${t.remind1h}*\n${event.serviceName || t.appt}${when ? `\n📅 ${when}` : ''}${event.clinicName ? `\n🏥 ${event.clinicName}` : ''}`,
            };
        }
        case 'payment_received': {
            return {
                title: `✅ ${t.paymentReceived}`,
                body: `${fmtPrice(event.amount)} ${t.som}`,
                sms: `${t.smsPrefix} ${fmtPrice(event.amount)} ${t.som} ${t.smsPaymentReceived}.`,
                telegram: `✅ *${t.paymentReceived}*\n💵 ${fmtPrice(event.amount)} ${t.som}`,
            };
        }
        case 'queue_called': {
            return {
                title: `📣 ${t.queueIsYours}`,
                body: event.queueNumber ? `${t.queueNum} №${event.queueNumber} — ${t.cabinetOpen}` : t.cabinetOpen,
                sms: `${t.smsPrefix} ${t.smsQueueIsYours}${event.queueNumber ? ` (№${event.queueNumber})` : ''}.`,
                telegram: `📣 *${t.queueIsYours}*${event.queueNumber ? `\n#${event.queueNumber}` : ''}`,
            };
        }
        case 'clinic_new_booking': {
            const when = fmtTime(event.appointmentAt, lang);
            return {
                title: `📅 ${t.newBooking}`,
                body: `${event.patientName || t.patient} — ${event.serviceName || t.service}${when ? ` — ${when}` : ''}`,
                sms: `${t.smsPrefix} ${t.smsNewBooking}${event.bookingNumber ? ` №${event.bookingNumber}` : ''}.`,
                telegram: `📅 *${t.newBooking}*\n👤 ${event.patientName || t.patient}\n🩺 ${event.serviceName || t.service}${when ? `\n📅 ${when}` : ''}`,
            };
        }
        case 'clinic_patient_checked_in': {
            const isCash = event.paymentMethod === 'CASH';
            return {
                title: isCash ? `💵 ${t.cashPending}` : `✅ ${t.patientArrived}`,
                body: `${event.patientName || t.patient} — ${event.serviceName || t.service}${event.finalPrice ? ` — ${fmtPrice(event.finalPrice)} ${t.som}` : ''}${isCash ? '' : ` (${t.onlinePaid})`}`,
                sms: `${t.smsPrefix} ${event.patientName || t.patient.toLowerCase()} ${t.smsPatientArrived}${event.bookingNumber ? ` №${event.bookingNumber}` : ''}.`,
                telegram: `${isCash ? '💵' : '✅'} *${isCash ? t.cashPending : t.patientArrived}*\n👤 ${event.patientName || t.patient}\n🩺 ${event.serviceName || t.service}${event.finalPrice ? `\n💵 ${fmtPrice(event.finalPrice)} ${t.som}` : ''}`,
            };
        }
        case 'clinic_cash_pending': {
            return {
                title: `⏰ ${t.cashPending}`,
                body: `${event.patientName || t.patient} — ${event.serviceName || t.service} — ${fmtPrice(event.finalPrice)} ${t.som}${event.waitMinutes ? ` — ${event.waitMinutes} ${t.minutes} ${t.waited}` : ''}`,
                sms: `${t.smsPrefix} ${event.patientName || t.patient.toLowerCase()} ${t.waited}${event.waitMinutes ? ` (${event.waitMinutes} ${t.minutes})` : ''}.`,
                telegram: `⏰ *${t.cashPending}*\n👤 ${event.patientName || t.patient}\n💵 ${fmtPrice(event.finalPrice)} ${t.som}${event.waitMinutes ? `\n⏱ ${event.waitMinutes} ${t.minutes}` : ''}`,
            };
        }
        case 'general': {
            return {
                title: event.title,
                body: event.body,
                sms: `${t.smsPrefix} ${event.body}`.slice(0, 160),
                telegram: `*${event.title}*\n${event.body}`,
            };
        }
    }
}
