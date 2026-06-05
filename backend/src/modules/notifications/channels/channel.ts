import { NotificationEvent } from '../notification.types';

export interface DeliveryResult {
    ok: boolean;
    /** Provider message id (Eskiz request_id, Telegram message_id, etc.). */
    externalId?: string;
    /** Set when ok=false. */
    error?: string;
    /** True when channel intentionally skipped (rate limit, missing binding, etc.) — not counted as a failure. */
    skipped?: boolean;
}

export interface NotificationChannel {
    readonly name: 'inapp' | 'sms' | 'telegram';
    /**
     * Deliver one notification to one recipient.
     * Implementations must never throw — always return DeliveryResult.
     */
    send(event: NotificationEvent): Promise<DeliveryResult>;
}
