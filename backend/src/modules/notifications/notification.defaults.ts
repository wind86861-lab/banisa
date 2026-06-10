import { Channel, EventType } from './notification.types';

/**
 * Default channel set per event when a user has no explicit preference.
 * SMS is reserved for events with real-world consequences (booking, payment).
 * Reminders default to all enabled channels — they're the bot's main job.
 */
export const DEFAULT_CHANNELS: Record<EventType, Channel[]> = {
    // Patient
    booking_confirmed: ['inapp', 'sms'],
    booking_cancelled: ['inapp', 'sms'],
    booking_reminder_24h: ['inapp', 'sms', 'telegram'],
    booking_reminder_1h: ['inapp', 'sms', 'telegram'],
    payment_received: ['inapp', 'sms'],
    queue_called: ['inapp', 'telegram'],
    // Clinic
    clinic_new_booking: ['inapp', 'telegram'],
    clinic_patient_checked_in: ['inapp', 'telegram'],
    clinic_cash_pending: ['inapp', 'telegram'],
    clinic_daily_report: ['inapp', 'telegram'],
    // Fallback
    general: ['inapp'],
};

/**
 * SMS per-user rate limit (Eskiz costs money). One day window.
 */
export const SMS_DAILY_LIMIT_PER_USER = 5;
