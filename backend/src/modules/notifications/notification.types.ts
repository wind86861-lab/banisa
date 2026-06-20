/**
 * Strongly typed event catalog for the notification system.
 * Each event type has a fixed payload shape (used by templates + channels)
 * and a default channel set (overridable per-user via NotificationPreference).
 */

export type Channel = 'inapp' | 'sms' | 'telegram';

export type EventType =
    // Patient-facing
    | 'booking_confirmed'
    | 'booking_ready_for_payment'  // Clinic accepted; patient must pay now (online flow)
    | 'booking_cancelled'
    | 'booking_payment_expired'    // 24h grace expired; auto-cancelled
    | 'booking_reminder_24h'
    | 'booking_reminder_1h'
    | 'payment_received'
    | 'queue_called'
    // Clinic-facing
    | 'clinic_new_booking'
    | 'clinic_patient_checked_in'
    | 'clinic_cash_pending'
    | 'clinic_daily_report'
    | 'general';

export interface BaseEvent<T extends EventType> {
    type: T;
    /** Recipient — exactly one of userId / clinicId must be set. */
    userId?: string;
    clinicId?: string;
    /** Optional deep-link path (no host). */
    link?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    /** Channel allowlist override — useful for legacy in-app-only flows. */
    forceChannels?: Channel[];
}

export interface BookingEvent extends BaseEvent<
    | 'booking_confirmed'
    | 'booking_ready_for_payment'
    | 'booking_cancelled'
    | 'booking_payment_expired'
    | 'booking_reminder_24h'
    | 'booking_reminder_1h'
    | 'queue_called'
    | 'clinic_new_booking'
    | 'clinic_patient_checked_in'
    | 'clinic_cash_pending'
> {
    appointmentId: string;
    bookingNumber?: string;
    patientName?: string;
    serviceName?: string;
    clinicName?: string;
    appointmentAt?: Date | string;
    queueNumber?: number;
    waitMinutes?: number;
    finalPrice?: number;
    paymentMethod?: 'CASH' | 'PAYME' | string;
}

export interface PaymentEvent extends BaseEvent<'payment_received'> {
    appointmentId: string;
    amount: number;
}

export interface GeneralEvent extends BaseEvent<'general'> {
    title: string;
    body: string;
    data?: Record<string, any>;
}

export interface ClinicDailyReportEvent extends BaseEvent<'clinic_daily_report'> {
    /** Aggregated numbers the template renders into the body. */
    total: number;
    completed: number;
    cancelled: number;
    revenue: number;
    paidCount: number;
    pending: number;
}

export type NotificationEvent = BookingEvent | PaymentEvent | GeneralEvent | ClinicDailyReportEvent;
