import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { AppointmentStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import {
    generateBookingNumber,
    generateQrToken,
    computePricing,
    logAppointmentEvent,
} from './appointment.utils';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';

/**
 * AppointmentService
 * Central state-machine for the booking workflow.
 * Every transition is guarded by an explicit "from" status check.
 */

const INCLUDE_FULL = {
    clinic: {
        select: {
            id: true,
            nameUz: true,
            nameRu: true,
            logo: true,
            phones: true,
            street: true,
            district: true,
            region: true,
            defaultDiscountPercent: true,
            commissionRate: true,
        },
    },
    patient: {
        select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    },
    doctor: {
        select: { id: true, firstName: true, lastName: true, specialty: true },
    },
    diagnosticService: { select: { id: true, nameUz: true, nameRu: true } },
    surgicalService: { select: { id: true, nameUz: true, nameRu: true } },
    services: true,
} as const;

type Actor = {
    userId: string;
    role: 'PATIENT' | 'OPERATOR' | 'CLINIC';
    name?: string;
};

function assertStatus(
    current: AppointmentStatus,
    allowed: AppointmentStatus[],
    msg = 'Bu amal hozirgi bron statusida bajarib bo\'lmaydi'
) {
    if (!allowed.includes(current)) {
        throw new AppError(msg, 400, ErrorCodes.VALIDATION_ERROR);
    }
}

export class AppointmentService {
    // ─────────────────────────────────────────────────────────────
    // PATIENT: Create booking
    // ─────────────────────────────────────────────────────────────
    async createBooking(
        patientId: string,
        data: {
            clinicId: string;
            serviceType: 'DIAGNOSTIC' | 'SURGICAL' | 'OTHER';
            diagnosticServiceId?: string;
            surgicalServiceId?: string;
            scheduledAt: string;
            notes?: string;
            price: number;
        }
    ) {
        // 1. Verify clinic is active
        const clinic = await prisma.clinic.findUnique({
            where: { id: data.clinicId },
            select: { id: true, status: true, defaultDiscountPercent: true, commissionRate: true },
        });
        if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
        if (clinic.status !== 'APPROVED') {
            throw new AppError('Klinika faol emas', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // 2. Verify service
        if (data.serviceType === 'DIAGNOSTIC' && data.diagnosticServiceId) {
            const svc = await prisma.diagnosticService.findUnique({
                where: { id: data.diagnosticServiceId },
                select: { isActive: true },
            });
            if (!svc || !svc.isActive) {
                throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);
            }
        }
        if (data.serviceType === 'SURGICAL' && data.surgicalServiceId) {
            const svc = await prisma.surgicalService.findUnique({
                where: { id: data.surgicalServiceId },
                select: { id: true },
            });
            if (!svc) throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        // 3+6. Duplicate check + create inside one Serializable transaction so
        // two concurrent requests for the same patient/clinic/day can't both
        // pass the duplicate check and produce twin bookings.
        const scheduledDate = new Date(data.scheduledAt);
        const dayStart = new Date(scheduledDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(scheduledDate);
        dayEnd.setHours(23, 59, 59, 999);

        const pricing = computePricing(data.price, clinic.defaultDiscountPercent);
        const bookingNumber = await generateBookingNumber();
        const qrToken = generateQrToken();

        const appointment = await prisma.$transaction(async (tx) => {
            const existing = await tx.appointment.findFirst({
                where: {
                    patientId,
                    clinicId: data.clinicId,
                    scheduledAt: { gte: dayStart, lte: dayEnd },
                    status: {
                        notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED', 'RESCHEDULED'],
                    },
                },
                include: INCLUDE_FULL,
            });
            if (existing) return existing; // idempotent

            return tx.appointment.create({
                data: {
                    bookingNumber,
                    clinicId: data.clinicId,
                    patientId,
                    serviceType: data.serviceType,
                    diagnosticServiceId: data.diagnosticServiceId,
                    surgicalServiceId: data.surgicalServiceId,
                    scheduledAt: scheduledDate,
                    status: 'PENDING',
                    price: data.price,
                    notes: data.notes,
                    qrToken,
                    discountPercent: pricing.discountPercent,
                    discountAmount: pricing.discountAmount,
                    finalPrice: pricing.finalPrice,
                    commissionRate: clinic.commissionRate,
                    paymentStatus: 'UNPAID',
                },
                include: INCLUDE_FULL,
            });
        }, { isolationLevel: 'Serializable' });

        // If the row was already there, skip the audit log + early return.
        if ((appointment as any).bookingNumber !== bookingNumber) {
            return appointment;
        }

        await logAppointmentEvent({
            appointmentId: appointment.id,
            action: 'CREATED',
            newStatus: 'PENDING',
            userId: patientId,
            userRole: 'PATIENT',
            metadata: { bookingNumber, discountPercent: pricing.discountPercent },
        });

        return appointment;
    }

    // ─────────────────────────────────────────────────────────────
    // PATIENT: Cancel own booking (only before payment)
    // ─────────────────────────────────────────────────────────────
    async cancelByPatient(patientId: string, appointmentId: string, reason?: string) {
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, patientId },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        assertStatus(appt.status, [
            'PENDING', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED',
        ], 'To\'lov qilingan bronni bekor qilib bo\'lmaydi');

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledBy: 'PATIENT',
                cancellationReason: reason ?? null,
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'CANCELLED',
            oldStatus: appt.status,
            newStatus: 'CANCELLED',
            userId: patientId,
            userRole: 'PATIENT',
            note: reason,
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // OPERATOR: Confirm booking after phone call
    // PENDING → OPERATOR_CONFIRMED → auto SENT_TO_CLINIC
    // ─────────────────────────────────────────────────────────────
    async operatorConfirm(
        actor: Actor,
        appointmentId: string,
        payload: { callNote?: string; discountPercent?: number }
    ) {
        const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        assertStatus(appt.status, ['PENDING', 'PENDING_ARRIVAL'], 'Faqat yangi bronni tasdiqlash mumkin');

        // Optional discount override
        const discountPct = typeof payload.discountPercent === 'number'
            ? payload.discountPercent
            : appt.discountPercent;
        const pricing = computePricing(appt.price, discountPct);

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'SENT_TO_CLINIC',
                confirmedByOperatorId: actor.userId,
                operatorConfirmedAt: new Date(),
                operatorCallNote: payload.callNote ?? null,
                discountPercent: pricing.discountPercent,
                discountAmount: pricing.discountAmount,
                finalPrice: pricing.finalPrice,
            },
            include: INCLUDE_FULL,
        });

        await logAppointmentEvent({
            appointmentId,
            action: 'OPERATOR_CONFIRMED',
            oldStatus: appt.status,
            newStatus: 'SENT_TO_CLINIC',
            userId: actor.userId,
            userRole: 'OPERATOR',
            userName: actor.name,
            note: payload.callNote,
            metadata: { discountPercent: pricing.discountPercent },
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // OPERATOR: Cancel booking with reason
    // ─────────────────────────────────────────────────────────────
    async operatorCancel(actor: Actor, appointmentId: string, reason: string) {
        const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        assertStatus(appt.status, [
            'PENDING', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED',
            'PENDING_ARRIVAL', 'PAID',
        ]);

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledBy: 'OPERATOR',
                cancellationReason: reason,
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'CANCELLED',
            oldStatus: appt.status,
            newStatus: 'CANCELLED',
            userId: actor.userId,
            userRole: 'OPERATOR',
            userName: actor.name,
            note: reason,
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC: Accept booking (SENT_TO_CLINIC → CLINIC_ACCEPTED)
    // No rejection allowed — only accept or reschedule
    // ─────────────────────────────────────────────────────────────
    async clinicAccept(actor: Actor, clinicId: string, appointmentId: string, notes?: string) {
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        assertStatus(appt.status, ['SENT_TO_CLINIC'], 'Faqat yuborilgan bronlarni qabul qilish mumkin');

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'CLINIC_ACCEPTED',
                clinicRespondedAt: new Date(),
                clinicRespondedById: actor.userId,
                clinicNotes: notes ?? null,
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'CLINIC_ACCEPTED',
            oldStatus: appt.status,
            newStatus: 'CLINIC_ACCEPTED',
            userId: actor.userId,
            userRole: 'CLINIC',
            userName: actor.name,
            note: notes,
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC: Request reschedule (in lieu of rejection)
    // ─────────────────────────────────────────────────────────────
    async clinicReschedule(
        actor: Actor,
        clinicId: string,
        appointmentId: string,
        newScheduledAt: string,
        reason: string
    ) {
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        assertStatus(appt.status, ['SENT_TO_CLINIC', 'CLINIC_ACCEPTED']);

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'RESCHEDULED',
                scheduledAt: new Date(newScheduledAt),
                clinicRespondedAt: new Date(),
                clinicRespondedById: actor.userId,
                clinicNotes: reason,
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'RESCHEDULED',
            oldStatus: appt.status,
            newStatus: 'RESCHEDULED',
            userId: actor.userId,
            userRole: 'CLINIC',
            userName: actor.name,
            note: reason,
            metadata: { newScheduledAt },
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // PAYMENT: Mark paid (called by Payme webhook or cash at clinic)
    // CLINIC_ACCEPTED → PAID (QR becomes active)
    // ─────────────────────────────────────────────────────────────
    async markPaid(
        appointmentId: string,
        payload: {
            method: PaymentMethod;
            amount: number;
            paymeTransactionId?: string;
            actor?: Actor;
        }
    ) {
        const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);

        // Accept payment from CLINIC_ACCEPTED or OPERATOR_CONFIRMED/SENT_TO_CLINIC (pre-pay)
        if (!['CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC'].includes(appt.status)) {
            throw new AppError('Bu bronga to\'lov qabul qilib bo\'lmaydi', 400, ErrorCodes.VALIDATION_ERROR);
        }
        if (appt.paymentStatus === 'PAID') {
            return appt; // idempotent
        }

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'PAID',
                paymentStatus: 'PAID',
                paymentMethod: payload.method,
                paidAmount: payload.amount,
                paidAt: new Date(),
                paymeTransactionId: payload.paymeTransactionId ?? null,
                qrActivatedAt: new Date(),
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'PAID',
            oldStatus: appt.status,
            newStatus: 'PAID',
            userId: payload.actor?.userId,
            userRole: payload.actor?.role,
            metadata: { method: payload.method, amount: payload.amount },
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC: Start service (CHECKED_IN → IN_PROGRESS)
    // ─────────────────────────────────────────────────────────────
    async clinicStart(actor: Actor, clinicId: string, appointmentId: string) {
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        assertStatus(appt.status, ['CHECKED_IN']);

        if ((appt as any).paymentStatus !== 'PAID') {
            throw new AppError(
                'Xizmatni boshlashdan oldin to\'lov tasdiqlanishi shart',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'STARTED',
            oldStatus: appt.status,
            newStatus: 'IN_PROGRESS',
            userId: actor.userId,
            userRole: 'CLINIC',
            userName: actor.name,
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC: Complete service (IN_PROGRESS → COMPLETED)
    // ─────────────────────────────────────────────────────────────
    async clinicComplete(
        actor: Actor,
        clinicId: string,
        appointmentId: string,
        payload: { note?: string } = {}
    ) {
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        assertStatus(appt.status, ['IN_PROGRESS', 'CHECKED_IN']);

        // Compute commission
        const rate = appt.commissionRate ?? 0;
        const commissionAmount = Math.floor(appt.finalPrice * rate);

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                completedById: actor.userId,
                clinicNotes: payload.note ?? appt.clinicNotes,
                commissionAmount,
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'COMPLETED',
            oldStatus: appt.status,
            newStatus: 'COMPLETED',
            userId: actor.userId,
            userRole: 'CLINIC',
            userName: actor.name,
            note: payload.note,
            metadata: { commissionAmount },
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC/OPERATOR: Mark no-show
    // ─────────────────────────────────────────────────────────────
    async markNoShow(actor: Actor, appointmentId: string, clinicId?: string) {
        const where: Prisma.AppointmentWhereInput = clinicId
            ? { id: appointmentId, clinicId }
            : { id: appointmentId };
        const appt = await prisma.appointment.findFirst({ where });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'NO_SHOW',
                noShowMarkedAt: new Date(),
                noShowMarkedById: actor.userId,
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId,
            action: 'NO_SHOW',
            oldStatus: appt.status,
            newStatus: 'NO_SHOW',
            userId: actor.userId,
            userRole: actor.role,
            userName: actor.name,
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────
    async findById(id: string) {
        return prisma.appointment.findUnique({
            where: { id },
            include: {
                ...INCLUDE_FULL,
                logs: { orderBy: { createdAt: 'asc' } },
            },
        });
    }

    async findByIdForPatient(id: string, patientId: string) {
        return prisma.appointment.findFirst({
            where: { id, patientId },
            include: {
                ...INCLUDE_FULL,
                logs: { orderBy: { createdAt: 'asc' } },
            },
        });
    }

    async findByIdForClinic(id: string, clinicId: string) {
        return prisma.appointment.findFirst({
            where: { id, clinicId },
            include: {
                ...INCLUDE_FULL,
                logs: { orderBy: { createdAt: 'asc' } },
            },
        });
    }

    async listForAdmin(filters: {
        status?: AppointmentStatus | 'ALL';
        clinicId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const page = Math.max(1, filters.page ?? 1);
        const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
        const skip = (page - 1) * limit;

        const where: Prisma.AppointmentWhereInput = {};
        if (filters.status && filters.status !== 'ALL') where.status = filters.status;
        if (filters.clinicId) where.clinicId = filters.clinicId;
        if (filters.search) {
            where.OR = [
                { bookingNumber: { contains: filters.search, mode: 'insensitive' } },
                { patient: { firstName: { contains: filters.search, mode: 'insensitive' } } },
                { patient: { lastName: { contains: filters.search, mode: 'insensitive' } } },
                { patient: { phone: { contains: filters.search } } },
            ];
        }

        const [items, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: INCLUDE_FULL,
            }),
            prisma.appointment.count({ where }),
        ]);
        return {
            items,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    // ─────────────────────────────────────────────────────────────
    // PATIENT: Scan clinic QR → check in  (PENDING_ARRIVAL → CHECKED_IN)
    // ─────────────────────────────────────────────────────────────
    async patientCheckIn(
        patientId: string,
        appointmentId: string,
        clinicSecret: string,
        lat?: number,
        lng?: number,
    ) {
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, patientId },
            include: { clinic: true },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);

        // Idempotent: already checked in → return current state
        if (['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'].includes(appt.status)) {
            return appt;
        }
        // Terminal failure states
        if (['CANCELLED', 'NO_SHOW'].includes(appt.status)) {
            throw new AppError('Bu bron faol emas', 400, ErrorCodes.VALIDATION_ERROR);
        }
        // Accept any active "expecting-arrival" status:
        //   - Cash: PENDING_ARRIVAL (operator pre-confirmed cash flow)
        //   - Online paid: CLINIC_ACCEPTED / OPERATOR_CONFIRMED / SENT_TO_CLINIC / PAID / PENDING_ARRIVAL
        const allowed = ['PENDING_ARRIVAL', 'CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'PAID'];
        if (!allowed.includes(appt.status)) {
            throw new AppError('Bu bron hozir check-in qilinishi mumkin emas', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // Time window: scheduledAt − 24h ≤ now ≤ scheduledAt + 2h. Late → NO_SHOW.
        const now = Date.now();
        const sched = new Date(appt.scheduledAt).getTime();
        const LATE_MS = 2 * 60 * 60 * 1000;
        const EARLY_MS = 24 * 60 * 60 * 1000;
        const fmtTime = (ms: number) => new Date(ms).toLocaleString('uz-UZ', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });
        if (now > sched + LATE_MS) {
            await prisma.appointment.update({
                where: { id: appt.id },
                data: { status: 'NO_SHOW', noShowMarkedAt: new Date() } as any,
            });
            throw new AppError(
                `Belgilangan vaqt (${fmtTime(sched)}) o'tib ketgan. Iltimos, klinikaga qo'ng'iroq qiling.`,
                400, ErrorCodes.VALIDATION_ERROR,
            );
        }
        if (now < sched - EARLY_MS) {
            const hoursToGo = Math.round((sched - now) / 3600000);
            throw new AppError(
                `Hali erta — tashrif ${fmtTime(sched)} da. ${hoursToGo} soatdan keyin qaytib keling.`,
                400, ErrorCodes.VALIDATION_ERROR,
            );
        }

        // Verify clinic QR secret matches
        const clinic = appt.clinic as any;
        if (!clinic.checkInSecret || clinic.checkInSecret !== clinicSecret) {
            throw new AppError('QR kod noto\'g\'ri yoki bu klinikaga tegishli emas', 403, ErrorCodes.FORBIDDEN);
        }

        // GPS distance check (soft — skip if no location or clinic has no coords)
        if (lat !== undefined && lng !== undefined && clinic.latitude && clinic.longitude) {
            const dist = this.haversineKm(lat, lng, clinic.latitude, clinic.longitude);
            if (dist > 0.5) { // 500m radius
                throw new AppError(`Siz klinikadan uzoqda turibsiz (${Math.round(dist * 1000)}m). Klinikaga yaqinroq keling.`, 400, ErrorCodes.VALIDATION_ERROR);
            }
        }

        const updated = await prisma.appointment.update({
            where: { id: appt.id },
            data: {
                status: 'CHECKED_IN',
                checkedInAt: new Date(),
                checkInLat: lat ?? null,
                checkInLng: lng ?? null,
                checkInMethod: 'PATIENT_QR',
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId: appt.id,
            action: 'CHECKED_IN',
            oldStatus: appt.status,
            newStatus: 'CHECKED_IN',
            userId: patientId,
            userRole: 'PATIENT',
            metadata: { method: 'PATIENT_QR', lat, lng },
        });

        // Notify clinic admins (best-effort — never break check-in on notify failure)
        try {
            const fullName = [updated.patient?.firstName, updated.patient?.lastName]
                .filter(Boolean).join(' ') || updated.patient?.phone || 'Bemor';
            const serviceName =
                (updated as any).diagnosticService?.nameUz ||
                (updated as any).surgicalService?.nameUz ||
                'Xizmat';
            const finalPrice = (updated as any).finalPrice || (updated as any).price || 0;
            const isCash = (updated as any).paymentMethod === 'CASH' || (updated as any).paymentStatus === 'UNPAID';
            const formattedPrice = Number(finalPrice).toLocaleString('en-US').replace(/,/g, ' ');

            await dispatchNotification({
                type: 'clinic_patient_checked_in',
                clinicId: clinic.id,
                appointmentId: appt.id,
                bookingNumber: (updated as any).bookingNumber,
                patientName: fullName,
                serviceName,
                finalPrice,
                paymentMethod: (updated as any).paymentMethod,
                priority: isCash ? 'HIGH' : 'NORMAL',
                link: `/clinic/bookings?focus=${appt.id}`,
            });
        } catch (e) {
            console.error('[patientCheckIn] notify failed:', e);
        }

        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // PATIENT: One-shot QR check-in
    //   secret → clinic → patient's eligible booking at that clinic
    //   - 1 eligible PENDING_ARRIVAL → check in (delegates to patientCheckIn for notify+audit)
    //   - 1 already CHECKED_IN/IN_PROGRESS/COMPLETED → idempotent return
    //   - >1 eligible → caller picks
    //   - 0 → tell caller no booking
    // ─────────────────────────────────────────────────────────────
    async scanCheckIn(patientId: string, secret: string, lat?: number, lng?: number) {
        const clinic = await prisma.clinic.findFirst({
            where: { checkInSecret: secret } as any,
            select: { id: true, nameUz: true },
        });
        if (!clinic) {
            throw new AppError('QR kod noto\'g\'ri yoki eskirgan', 404, ErrorCodes.NOT_FOUND);
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Consider any active "expecting-arrival" status — cash (PENDING_ARRIVAL)
        // OR online-paid (CLINIC_ACCEPTED / OPERATOR_CONFIRMED / SENT_TO_CLINIC / PAID).
        const pending = await prisma.appointment.findMany({
            where: {
                patientId,
                clinicId: clinic.id,
                scheduledAt: { gte: todayStart },
                status: { in: ['PENDING_ARRIVAL', 'CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'PAID'] },
            },
            orderBy: { scheduledAt: 'asc' },
            include: INCLUDE_FULL,
        });

        if (pending.length === 0) {
            // Check if already checked-in today for idempotent message
            const already = await prisma.appointment.findFirst({
                where: {
                    patientId,
                    clinicId: clinic.id,
                    scheduledAt: { gte: todayStart },
                    status: { in: ['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] },
                },
                orderBy: { scheduledAt: 'desc' },
                include: INCLUDE_FULL,
            });
            if (already) {
                return { kind: 'already' as const, appointment: already };
            }
            return { kind: 'none' as const, clinic };
        }

        if (pending.length === 1) {
            const target = pending[0];
            const checkedIn = await this.patientCheckIn(patientId, target.id, secret, lat, lng);
            return { kind: 'checked_in' as const, appointment: checkedIn };
        }

        // >1 eligible → caller must pick (UI lists them).
        return { kind: 'multiple' as const, appointments: pending, clinic };
    }

    // Pick a specific booking when scanCheckIn returned 'multiple'.
    async scanCheckInPick(patientId: string, secret: string, appointmentId: string, lat?: number, lng?: number) {
        const clinic = await prisma.clinic.findFirst({
            where: { checkInSecret: secret } as any,
            select: { id: true },
        });
        if (!clinic) throw new AppError('QR kod noto\'g\'ri yoki eskirgan', 404, ErrorCodes.NOT_FOUND);
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, patientId, clinicId: clinic.id },
            select: { id: true },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
        return this.patientCheckIn(patientId, appt.id, secret, lat, lng);
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC: Confirm cash payment (CHECKED_IN, paymentStatus UNPAID → PAID)
    // ─────────────────────────────────────────────────────────────
    async clinicConfirmCash(
        actor: Actor,
        clinicId: string,
        appointmentId: string,
        payload: { amount: number; note?: string }
    ) {
        const appt = await prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId },
        });
        if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);

        if (!['CHECKED_IN', 'IN_PROGRESS'].includes(appt.status as any)) {
            throw new AppError(
                'Naqd to\'lov faqat bemor kelganidan so\'ng tasdiqlanadi',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }
        if ((appt as any).paymentStatus === 'PAID') {
            throw new AppError('Bu bron allaqachon to\'langan', 400, ErrorCodes.VALIDATION_ERROR);
        }

        const expected = (appt as any).finalPrice || (appt as any).price || 0;
        if (payload.amount < expected && !payload.note) {
            throw new AppError(
                'Kam summa qabul qilish uchun sabab kiritish shart',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                paymentStatus: 'PAID',
                paymentMethod: 'CASH',
                paidAmount: payload.amount,
                paidAt: new Date(),
                cashConfirmedById: actor.userId,
                cashConfirmedAt: new Date(),
                cashReceivedAmount: payload.amount,
                cashAdjustmentNote: payload.note ?? null,
            } as any,
            include: INCLUDE_FULL,
        });

        await logAppointmentEvent({
            appointmentId,
            action: 'CASH_CONFIRMED',
            oldStatus: appt.status,
            newStatus: appt.status,
            userId: actor.userId,
            userRole: 'CLINIC',
            userName: actor.name,
            metadata: { amount: payload.amount, expected, note: payload.note },
        });

        // Notify patient that payment was received (best-effort).
        try {
            await dispatchNotification({
                type: 'payment_received',
                userId: appt.patientId,
                appointmentId,
                amount: payload.amount,
                priority: 'HIGH',
                link: `/user/appointments/${appointmentId}`,
            });
        } catch (e) {
            console.error('[clinicConfirmCash] notify patient failed:', e);
        }

        return updated;
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: haversine distance in km
    // ─────────────────────────────────────────────────────────────
    private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

export const appointmentService = new AppointmentService();
