import { NotificationEvent } from './notification.types';

/**
 * Render a single event into channel-specific strings.
 * SMS templates are short (Eskiz charges per ~70-char segment for Cyrillic).
 * In-app templates can be richer (title + body).
 * Telegram templates use markdown and can include an inline link.
 */

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

function fmtTime(at: Date | string | undefined | null): string {
    if (!at) return '';
    const d = typeof at === 'string' ? new Date(at) : at;
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('uz-UZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function renderTemplate(event: NotificationEvent): RenderedTemplate {
    switch (event.type) {
        case 'booking_confirmed': {
            const when = fmtTime(event.appointmentAt);
            const svc = event.serviceName || 'Xizmat';
            return {
                title: '✅ Bron tasdiqlandi',
                body: `${svc}${when ? ` — ${when}` : ''}${event.clinicName ? ` (${event.clinicName})` : ''}`,
                sms: `Banisa: bron tasdiqlandi. ${svc}${when ? ` ${when}` : ''}.`,
                telegram: `✅ *Bron tasdiqlandi*\n${svc}${when ? `\n📅 ${when}` : ''}${event.clinicName ? `\n🏥 ${event.clinicName}` : ''}`,
            };
        }
        case 'booking_cancelled': {
            const when = fmtTime(event.appointmentAt);
            return {
                title: '❌ Bron bekor qilindi',
                body: `${event.serviceName || 'Xizmat'}${when ? ` — ${when}` : ''}`,
                sms: `Banisa: bron bekor qilindi${event.bookingNumber ? ` (№${event.bookingNumber})` : ''}.`,
                telegram: `❌ *Bron bekor qilindi*\n${event.serviceName || 'Xizmat'}${when ? `\n📅 ${when}` : ''}`,
            };
        }
        case 'booking_reminder_24h': {
            const when = fmtTime(event.appointmentAt);
            return {
                title: '🔔 Ertaga qabul',
                body: `${event.serviceName || 'Qabul'}${when ? ` — ${when}` : ''}`,
                sms: `Banisa: ertaga qabul${when ? ` ${when}` : ''}. ${event.clinicName || ''}`.trim(),
                telegram: `🔔 *Ertaga qabul*\n${event.serviceName || 'Qabul'}${when ? `\n📅 ${when}` : ''}${event.clinicName ? `\n🏥 ${event.clinicName}` : ''}`,
            };
        }
        case 'booking_reminder_1h': {
            const when = fmtTime(event.appointmentAt);
            return {
                title: '⏰ 1 soatdan keyin qabul',
                body: `${event.serviceName || 'Qabul'}${when ? ` — ${when}` : ''}`,
                sms: `Banisa: 1 soatdan keyin qabul${when ? ` ${when}` : ''}.`,
                telegram: `⏰ *1 soatdan keyin qabul*\n${event.serviceName || 'Qabul'}${when ? `\n📅 ${when}` : ''}${event.clinicName ? `\n🏥 ${event.clinicName}` : ''}`,
            };
        }
        case 'payment_received': {
            return {
                title: '✅ To\'lovingiz qabul qilindi',
                body: `${fmtPrice(event.amount)} so'm to'lov tasdiqlandi`,
                sms: `Banisa: ${fmtPrice(event.amount)} so'm to'lov qabul qilindi.`,
                telegram: `✅ *To'lov qabul qilindi*\n💵 ${fmtPrice(event.amount)} so'm`,
            };
        }
        case 'queue_called': {
            return {
                title: '📣 Navbat sizniki',
                body: event.queueNumber ? `Navbat №${event.queueNumber} — kabinetga o'ting` : 'Kabinetga o\'ting',
                sms: `Banisa: navbat sizniki${event.queueNumber ? ` (№${event.queueNumber})` : ''}.`,
                telegram: `📣 *Navbat sizniki*${event.queueNumber ? `\n#${event.queueNumber}` : ''}`,
            };
        }
        case 'clinic_new_booking': {
            const when = fmtTime(event.appointmentAt);
            return {
                title: '📅 Yangi bron',
                body: `${event.patientName || 'Bemor'} — ${event.serviceName || 'Xizmat'}${when ? ` — ${when}` : ''}`,
                sms: `Banisa: yangi bron${event.bookingNumber ? ` №${event.bookingNumber}` : ''}.`,
                telegram: `📅 *Yangi bron*\n👤 ${event.patientName || 'Bemor'}\n🩺 ${event.serviceName || 'Xizmat'}${when ? `\n📅 ${when}` : ''}`,
            };
        }
        case 'clinic_patient_checked_in': {
            const isCash = event.paymentMethod === 'CASH';
            return {
                title: isCash ? '💵 Naqd to\'lov kutilmoqda' : '✅ Bemor keldi',
                body: `${event.patientName || 'Bemor'} — ${event.serviceName || 'Xizmat'}${event.finalPrice ? ` — ${fmtPrice(event.finalPrice)} so'm` : ''}${isCash ? '' : ' (onlayn to\'langan)'}`,
                sms: `Banisa: ${event.patientName || 'bemor'} keldi${event.bookingNumber ? ` №${event.bookingNumber}` : ''}.`,
                telegram: `${isCash ? '💵' : '✅'} *${isCash ? 'Naqd to\'lov kutilmoqda' : 'Bemor keldi'}*\n👤 ${event.patientName || 'Bemor'}\n🩺 ${event.serviceName || 'Xizmat'}${event.finalPrice ? `\n💵 ${fmtPrice(event.finalPrice)} so'm` : ''}`,
            };
        }
        case 'clinic_cash_pending': {
            return {
                title: '⏰ Naqd to\'lov hali tasdiqlanmagan',
                body: `${event.patientName || 'Bemor'} — ${event.serviceName || 'Xizmat'} — ${fmtPrice(event.finalPrice)} so'm${event.waitMinutes ? ` — ${event.waitMinutes} daq kutmoqda` : ''}`,
                sms: `Banisa: ${event.patientName || 'bemor'} kutmoqda${event.waitMinutes ? ` (${event.waitMinutes} daq)` : ''}.`,
                telegram: `⏰ *Naqd to'lov kutilmoqda*\n👤 ${event.patientName || 'Bemor'}\n💵 ${fmtPrice(event.finalPrice)} so'm${event.waitMinutes ? `\n⏱ ${event.waitMinutes} daq` : ''}`,
            };
        }
        case 'general': {
            return {
                title: event.title,
                body: event.body,
                sms: `Banisa: ${event.body}`.slice(0, 160),
                telegram: `*${event.title}*\n${event.body}`,
            };
        }
    }
}
