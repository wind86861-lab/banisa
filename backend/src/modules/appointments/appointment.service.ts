import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { AppointmentStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import {
    generateBookingNumber,
    generateQrToken,
    computePricing,
    logAppointmentEvent,
} from './appointment.utils';

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

        // 3. Check duplicate same-day booking
        const scheduledDate = new Date(data.scheduledAt);
        const dayStart = new Date(scheduledDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(scheduledDate);
        dayEnd.setHours(23, 59, 59, 999);
        const existing = await prisma.appointment.findFirst({
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
        if (existing) {
            return existing; // idempotent — returns existing pending booking
        }

        // 4. Compute pricing (discount from clinic default)
        const pricing = computePricing(data.price, clinic.defaultDiscountPercent);

        // 5. Generate booking number + QR token
        const bookingNumber = await generateBookingNumber();
        const qrToken = generateQrToken();

        // 6. Create
        const appointment = await prisma.appointment.create({
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
        assertStatus(appt.status, ['PENDING'], 'Faqat yangi bronni tasdiqlash mumkin');

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
    // CLINIC: Scan QR → check-in
    // ─────────────────────────────────────────────────────────────
    async clinicScanQr(actor: Actor, clinicId: string, qrToken: string) {
        const appt = await prisma.appointment.findUnique({
            where: { qrToken },
            include: INCLUDE_FULL,
        });
        if (!appt) throw new AppError('QR kod topilmadi', 404, ErrorCodes.NOT_FOUND);
        if (appt.clinicId !== clinicId) {
            throw new AppError('Bu QR kod boshqa klinikaga tegishli', 403, ErrorCodes.FORBIDDEN);
        }
        if (appt.paymentStatus !== 'PAID') {
            throw new AppError('Bron hali to\'lanmagan', 400, ErrorCodes.VALIDATION_ERROR);
        }
        // Idempotent: if already checked-in, just return it
        if (['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'].includes(appt.status)) {
            return appt;
        }
        assertStatus(appt.status, ['PAID'], 'Bronni check-in qilib bo\'lmaydi');

        const updated = await prisma.appointment.update({
            where: { id: appt.id },
            data: {
                status: 'CHECKED_IN',
                checkedInAt: new Date(),
                checkedInById: actor.userId,
            },
            include: INCLUDE_FULL,
        });
        await logAppointmentEvent({
            appointmentId: appt.id,
            action: 'CHECKED_IN',
            oldStatus: appt.status,
            newStatus: 'CHECKED_IN',
            userId: actor.userId,
            userRole: 'CLINIC',
            userName: actor.name,
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
        payload: { note?: string; paymentMethod?: PaymentMethod } = {}
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
                // If payment method is provided here (cash), record it
                ...(payload.paymentMethod && appt.paymentStatus !== 'PAID'
                    ? {
                        paymentStatus: 'PAID' as PaymentStatus,
                        paymentMethod: payload.paymentMethod,
                        paidAt: new Date(),
                        paidAmount: appt.finalPrice,
                    }
                    : {}),
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
}

export const appointmentService = new AppointmentService();
