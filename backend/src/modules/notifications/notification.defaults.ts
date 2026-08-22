import { Channel, EventType } from './notification.types';

/**
 * Default channel set per event when a user has no explicit preference.
 * SMS is reserved for events with real-world consequences (booking, payment).
 * Reminders default to all enabled channels — they're the bot's main job.
 */
export const DEFAULT_CHANNELS: Record<EventType, Channel[]> = {
    // Patient — telegram is now in every patient-facing default so a bound
    // user gets the same ping in the bot they get in the app + SMS. The
    // bot channel auto-skips when the user has no TelegramAccount, so this
    // is safe to enable across the board.
    booking_confirmed: ['inapp', 'sms', 'telegram'],
    booking_ready_for_payment: ['inapp', 'sms', 'telegram'],
    booking_cancelled: ['inapp', 'sms', 'telegram'],
    booking_payment_expired: ['inapp', 'telegram'],
    booking_reminder_24h: ['inapp', 'sms', 'telegram'],
    booking_reminder_1h: ['inapp', 'sms', 'telegram'],
    payment_received: ['inapp', 'sms', 'telegram'],
    // Review request — in-app + the bot (the bot carries the star buttons so
    // the patient rates + comments inside Telegram). No SMS: a star keyboard
    // can't live in an SMS.
    review_request: ['inapp', 'telegram'],
    queue_called: ['inapp', 'telegram'],
    // Clinic
    clinic_new_booking: ['inapp', 'telegram'],
    clinic_patient_checked_in: ['inapp', 'telegram'],
    clinic_cash_pending: ['inapp', 'telegram'],
    clinic_daily_report: ['inapp', 'telegram'],
    // Fallback
    general: ['inapp'],
    recommendation_received: ['inapp', 'telegram'],
};

/**
 * SMS per-user rate limit (Eskiz costs money). One day window.
 */
export const SMS_DAILY_LIMIT_PER_USER = 5;
