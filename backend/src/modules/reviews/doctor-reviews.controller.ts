import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { recomputeClinicRating, recomputeDoctorRating } from '../../utils/clinic-rating';

// ─── GET /api/user/doctor-reviews/eligibility?appointmentId= ────────────────
// Returns: { canReview, reason?, existingReview? }
// Eligible if:
//   - appointment exists, belongs to this user
//   - appointment.status === COMPLETED
//   - appointment.doctorId is set
//   - no existing review for this appointmentId yet
export const getEligibility = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const appointmentId = String(req.query.appointmentId || '');
    if (!appointmentId) return res.status(400).json({ success: false, message: 'appointmentId kerak' });

    const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true, patientId: true, doctorId: true, clinicId: true, status: true,
            scheduledAt: true,
            // Pull middleName for the patient-facing modal subtitle —
            // post-Doctor-refactor the UZ greeting form expects "Karimov
            // Bahodir Akmalovich".
            doctor: { select: { id: true, firstName: true, lastName: true, middleName: true, photoUrl: true } },
        },
    });
    if (!appt) return res.status(404).json({ success: false, message: 'Topilmadi' });
    if (appt.patientId !== userId) {
        return res.status(403).json({ success: false, message: 'Bu sizning broningiz emas' });
    }
    if (!appt.doctorId) {
        return res.json({ success: true, data: { canReview: false, reason: 'no-doctor' } });
    }
    if (appt.status !== 'COMPLETED') {
        return res.json({
            success: true,
            data: { canReview: false, reason: 'not-completed', currentStatus: appt.status },
        });
    }

    const existing = await prisma.doctorReview.findUnique({
        where: { appointmentId },
        select: { id: true, rating: true, comment: true, createdAt: true },
    });
    if (existing) {
        return res.json({ success: true, data: { canReview: false, reason: 'already-reviewed', existingReview: existing } });
    }

    return res.json({
        success: true,
        data: {
            canReview: true,
            doctor: appt.doctor,
            clinicId: appt.clinicId,
        },
    });
};

// ─── POST /api/user/doctor-reviews ───────────────────────────────────────────
export const createReview = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { appointmentId, rating, comment } = req.body || {};

    if (typeof appointmentId !== 'string' || !appointmentId) {
        return res.status(400).json({ success: false, message: 'appointmentId kerak' });
    }
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ success: false, message: 'rating 1..5 oraliqda butun son bo\'lishi kerak' });
    }
    const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 1000) || null : null;

    const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true, doctorId: true, clinicId: true, status: true },
    });
    if (!appt) return res.status(404).json({ success: false, message: 'Bron topilmadi' });
    if (appt.patientId !== userId) {
        return res.status(403).json({ success: false, message: 'Bu sizning broningiz emas' });
    }
    if (!appt.doctorId) {
        return res.status(400).json({ success: false, message: 'Bu bronga doktor biriktirilmagan' });
    }
    if (appt.status !== 'COMPLETED') {
        return res.status(400).json({ success: false, message: 'Faqat tugagan ko\'rik uchun baho qoldira olasiz' });
    }

    const existing = await prisma.doctorReview.findUnique({ where: { appointmentId } });
    if (existing) {
        return res.status(409).json({ success: false, message: 'Bu ko\'rik uchun siz allaqachon baho qoldirganssiz' });
    }

    const review = await prisma.doctorReview.create({
        data: {
            doctorId: appt.doctorId,
            patientId: userId,
            appointmentId,
            clinicId: appt.clinicId,
            rating: r,
            comment: cleanComment,
        },
    });

    // Recompute aggregates — fire-and-forget so response is fast.
    Promise.all([
        recomputeDoctorRating(appt.doctorId),
        recomputeClinicRating(appt.clinicId),
    ]).catch((err) => console.warn('[doctor-reviews] aggregation failed:', err?.message));

    return res.json({
        success: true,
        data: { id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt },
    });
};

// ─── DELETE /api/user/doctor-reviews/:id (own review, soft) ─────────────────
export const removeReview = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const id = String(req.params.id || '');
    const review = await prisma.doctorReview.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ success: false, message: 'Topilmadi' });
    if (review.patientId !== userId) {
        return res.status(403).json({ success: false, message: 'Faqat o\'zingiznikini o\'chira olasiz' });
    }
    await prisma.doctorReview.update({ where: { id }, data: { isActive: false } });
    Promise.all([
        recomputeDoctorRating(review.doctorId),
        recomputeClinicRating(review.clinicId),
    ]).catch(() => null);
    return res.json({ success: true });
};
