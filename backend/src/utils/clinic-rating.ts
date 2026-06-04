import prisma from '../config/database';

// Recompute Clinic.averageRating + reviewCount as a weighted average of:
//   1. Clinic-level Review (overall clinic feedback)
//   2. ServiceReview for any service belonging to this clinic
//   3. DoctorReview where clinicId = this clinic
// All ratings carry equal weight. Fire-and-forget safe.
export async function recomputeClinicRating(clinicId: string): Promise<void> {
    const [clinicReviews, doctorReviews, serviceReviews] = await Promise.all([
        prisma.review.findMany({
            where: { clinicId, isActive: true },
            select: { rating: true },
        }),
        prisma.doctorReview.findMany({
            where: { clinicId, isActive: true },
            select: { rating: true },
        }),
        // Service reviews are linked via ClinicDiagnosticService/Surgical/Sanatorium —
        // we collect them by checking which services this clinic offers.
        prisma.$queryRaw<Array<{ rating: number }>>`
            SELECT sr."rating" FROM "ServiceReview" sr
            WHERE sr."status" = 'APPROVED'::"ReviewStatus"
              AND (
                sr."diagnosticServiceId" IN (
                  SELECT cds."diagnosticServiceId" FROM "ClinicDiagnosticService" cds
                  WHERE cds."clinicId" = ${clinicId} AND cds."isActive" = true
                )
                OR sr."surgicalServiceId" IN (
                  SELECT csv."surgicalServiceId" FROM "ClinicSurgicalService" csv
                  WHERE csv."clinicId" = ${clinicId} AND csv."isActive" = true
                )
                OR sr."sanatoriumServiceId" IN (
                  SELECT css."sanatoriumServiceId" FROM "ClinicSanatoriumService" css
                  WHERE css."clinicId" = ${clinicId} AND css."isActive" = true
                )
              )
        `,
    ]);

    const allRatings = [
        ...clinicReviews.map((r) => r.rating),
        ...doctorReviews.map((r) => r.rating),
        ...serviceReviews.map((r) => r.rating),
    ];

    const total = allRatings.length;
    const avg = total > 0 ? allRatings.reduce((s, r) => s + r, 0) / total : 0;

    await prisma.clinic.update({
        where: { id: clinicId },
        data: {
            averageRating: Math.round(avg * 100) / 100, // 2 decimal places
            reviewCount: total,
        },
    });
}

// Recompute Doctor.averageRating + reviewCount from DoctorReview only.
export async function recomputeDoctorRating(doctorId: string): Promise<void> {
    const reviews = await prisma.doctorReview.findMany({
        where: { doctorId, isActive: true },
        select: { rating: true },
    });
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

    await prisma.doctor.update({
        where: { id: doctorId },
        data: {
            averageRating: Math.round(avg * 100) / 100,
            reviewCount: total,
        },
    });
}
