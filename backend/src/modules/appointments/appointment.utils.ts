import crypto from 'crypto';
import prisma from '../../config/database';

/**
 * Generate a unique booking number in format: BRN-YYYY-NNNNNN
 * Thread-safe via DB unique constraint + retry
 */
export async function generateBookingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 5; attempt++) {
        // Count existing bookings this year
        const count = await prisma.appointment.count({
            where: {
                bookingNumber: { startsWith: `BRN-${year}-` },
            },
        });
        const seq = String(count + 1 + attempt).padStart(6, '0');
        const candidate = `BRN-${year}-${seq}`;
        const exists = await prisma.appointment.findUnique({
            where: { bookingNumber: candidate },
            select: { id: true },
        });
        if (!exists) return candidate;
    }
    // Fallback: use timestamp
    return `BRN-${year}-${Date.now().toString().slice(-6)}`;
}

/**
 * Generate a cryptographically secure QR token
 * 32 bytes = 64 hex chars — collision-resistant
 */
export function generateQrToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute discount amount and final price
 */
export function computePricing(price: number, discountPercent: number) {
    const safePct = Math.max(0, Math.min(100, discountPercent || 0));
    const discountAmount = Math.floor((price * safePct) / 100);
    const finalPrice = price - discountAmount;
    return { discountPercent: safePct, discountAmount, finalPrice };
}

/**
 * Log an appointment event to the audit trail
 */
export async function logAppointmentEvent(params: {
    appointmentId: string;
    action: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    userId?: string | null;
    userRole?: string | null;
    userName?: string | null;
    note?: string | null;
    metadata?: any;
}) {
    try {
        await prisma.appointmentLog.create({
            data: {
                appointmentId: params.appointmentId,
                action: params.action,
                oldStatus: params.oldStatus ?? null,
                newStatus: params.newStatus ?? null,
                userId: params.userId ?? null,
                userRole: params.userRole ?? null,
                userName: params.userName ?? null,
                note: params.note ?? null,
                metadata: params.metadata ?? null,
            },
        });
    } catch (err) {
        // Logging failures should never break the main flow
        console.error('AppointmentLog failed:', err);
    }
}
