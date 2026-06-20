/**
 * Auto-cancel Payme/Click bookings that the clinic accepted but the
 * patient never paid for. 24-hour grace from clinicRespondedAt (or
 * createdAt if older bookings predate that column).
 *
 * Cancels the appointment, releases the slot, and pings the patient
 * via the `booking_payment_expired` notification so they understand
 * why the booking disappeared from their list.
 */
import prisma from '../../config/database';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';

const GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours
const TICK_MS = 15 * 60 * 1000;       // run every 15 minutes

async function runPaymentExpiry() {
    const cutoff = new Date(Date.now() - GRACE_MS);
    const stale = await prisma.appointment.findMany({
        where: {
            status: 'CONFIRMED',
            paymentStatus: 'UNPAID',
            paymentMethod: { in: ['PAYME' as any, 'CLICK' as any] },
            // Use clinicRespondedAt when available — that's when the
            // 24-hour countdown actually starts. Fall back to createdAt.
            OR: [
                { clinicRespondedAt: { lt: cutoff } },
                { clinicRespondedAt: null, createdAt: { lt: cutoff } },
            ],
        },
        select: {
            id: true, patientId: true, bookingNumber: true,
            clinicId: true, scheduledAt: true,
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
            clinic: { select: { nameUz: true } },
        },
        take: 100,
    });
    if (stale.length === 0) return;

    for (const a of stale) {
        try {
            await prisma.appointment.update({
                where: { id: a.id },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                    cancelledBy: 'SYSTEM' as any,
                    cancellationReason: 'Payment not made within 24 hours of clinic confirmation',
                },
            });
            await prisma.appointmentLog.create({
                data: {
                    appointmentId: a.id,
                    action: 'CANCELLED',
                    oldStatus: 'CONFIRMED' as any,
                    newStatus: 'CANCELLED' as any,
                    userRole: 'SYSTEM',
                    note: 'Auto-cancelled: payment not made within 24 hours of clinic confirmation',
                },
            });
            // Tell the patient so the booking disappearing from their list
            // doesn't look like a bug.
            const svcName = (a as any).diagnosticService?.nameUz
                || (a as any).surgicalService?.nameUz
                || 'Xizmat';
            dispatchNotification({
                type: 'booking_payment_expired',
                userId: a.patientId,
                appointmentId: a.id,
                bookingNumber: a.bookingNumber,
                serviceName: svcName,
                clinicName: (a as any).clinic?.nameUz,
                appointmentAt: a.scheduledAt,
                priority: 'NORMAL',
                link: `/user/appointments/${a.id}`,
            }).catch(e => console.warn('[paymentExpiry] notify failed:', e?.message));
        } catch (e) {
            console.error('[paymentExpiry] cancel failed for', a.id, e);
        }
    }
    console.log(`[paymentExpiry] auto-cancelled: ${stale.length} unpaid bookings`);
}

let started = false;

export function startPaymentExpiryScheduler() {
    if (started) return;
    started = true;
    const tick = async () => {
        try { await runPaymentExpiry(); }
        catch (e) { console.error('[paymentExpiry] tick error:', e); }
    };
    setInterval(tick, TICK_MS);
    // Initial run after 20s so server bootstrap finishes first.
    setTimeout(tick, 20_000);
    console.log('[paymentExpiry] started — interval 15min, grace 24h');
}
