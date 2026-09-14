import prisma from '../../config/database';

/**
 * Close the referral behind a finished visit.
 *
 * BOOKED only means the patient paid or reserved — the doctor's referral is not
 * actually fulfilled until the patient turned up and the clinic finished the
 * visit. Both completion paths (the clinic's "yakunlandi" and the cash-confirm
 * shortcut that completes in one tap) call this.
 *
 * Best-effort by design: a referral bookkeeping failure must never roll back a
 * clinic's completed appointment, so everything is swallowed and logged.
 *
 * Only BOOKED/ACCEPTED rows advance. A REJECTED or EXPIRED referral that somehow
 * shares an appointment stays as it is — it did not lead to this visit.
 */
export async function completeRecommendationForAppointment(appointmentId: string): Promise<void> {
    try {
        const appt = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { recommendationId: true },
        });
        const recId = (appt as any)?.recommendationId as string | null | undefined;
        if (!recId) return;

        await (prisma as any).recommendation.updateMany({
            where: { id: recId, status: { in: ['BOOKED', 'ACCEPTED'] } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });
    } catch (e) {
        console.error('[recommendation] complete-on-visit failed', { appointmentId }, e);
    }
}
