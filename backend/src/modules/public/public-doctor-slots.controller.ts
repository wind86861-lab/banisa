import { Request, Response } from 'express';
import prisma from '../../config/database';

// Generate available time slots for (doctor, clinic, date).
// Global slot lock: removes slots overlapping the doctor's bookings at ANY clinic,
// not just the requested one — so a doctor can't be double-booked across clinics.

interface Slot {
    time: string;        // "09:30"
    available: boolean;
    reason?: 'booked-here' | 'booked-elsewhere' | 'time-off' | 'past';
}

const HHMM_TO_MIN = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
};
const MIN_TO_HHMM = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const getDoctorSlots = async (req: Request, res: Response) => {
    const doctorId = String(req.params.id || '');
    const clinicId = String(req.query.clinicId || '');
    const dateStr = String(req.query.date || '');
    if (!doctorId || !clinicId || !dateStr) {
        return res.status(400).json({ success: false, message: 'doctorId, clinicId, date kerak' });
    }

    const date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ success: false, message: 'date noto\'g\'ri (YYYY-MM-DD)' });
    }

    // Past date — return empty
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
        return res.json({ success: true, data: { date: dateStr, slots: [], reason: 'past' } });
    }

    const dayOfWeek = date.getDay(); // 0..6
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // 1. Get the DoctorClinic + schedule for this day
    const dc = await prisma.doctorClinic.findFirst({
        where: { doctorId, clinicId, isActive: true },
        include: {
            schedules: { where: { dayOfWeek, isActive: true } },
            timeOffs: {
                where: {
                    OR: [
                        { startAt: { lte: dayEnd }, endAt: { gte: dayStart } },
                    ],
                },
            },
        },
    });
    if (!dc) return res.json({ success: true, data: { date: dateStr, slots: [], reason: 'no-clinic' } });
    if (dc.schedules.length === 0) {
        return res.json({ success: true, data: { date: dateStr, slots: [], reason: 'no-schedule' } });
    }

    // 2. Get all existing appointments for this doctor on this day (across ALL clinics)
    const allBookings = await prisma.appointment.findMany({
        where: {
            doctorId,
            scheduledAt: { gte: dayStart, lte: dayEnd },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { scheduledAt: true, clinicId: true },
    });

    const bookedMinutesByClinic = new Map<string, Set<number>>();
    for (const a of allBookings) {
        const t = new Date(a.scheduledAt);
        const min = t.getHours() * 60 + t.getMinutes();
        if (!bookedMinutesByClinic.has(a.clinicId)) bookedMinutesByClinic.set(a.clinicId, new Set());
        bookedMinutesByClinic.get(a.clinicId)!.add(min);
    }

    // 3. Build slot list per active schedule for this day
    const slots: Slot[] = [];
    const isToday = date.getTime() === today.getTime();
    const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

    for (const sch of dc.schedules) {
        const startMin = HHMM_TO_MIN(sch.startTime);
        const endMin = HHMM_TO_MIN(sch.endTime);
        const breakStartMin = sch.breakStart ? HHMM_TO_MIN(sch.breakStart) : null;
        const breakEndMin = sch.breakEnd ? HHMM_TO_MIN(sch.breakEnd) : null;
        const step = sch.slotDurationMin;

        for (let m = startMin; m + step <= endMin; m += step) {
            // Skip lunch break
            if (breakStartMin != null && breakEndMin != null && m >= breakStartMin && m < breakEndMin) continue;

            const slot: Slot = { time: MIN_TO_HHMM(m), available: true };

            // Past time today
            if (isToday && m <= nowMin) {
                slot.available = false;
                slot.reason = 'past';
            }
            // Time off
            else {
                const slotStart = new Date(date);
                slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotEnd.getMinutes() + step);
                const inTimeOff = dc.timeOffs.some((t) => t.startAt <= slotEnd && t.endAt >= slotStart);
                if (inTimeOff) {
                    slot.available = false;
                    slot.reason = 'time-off';
                }
            }
            // Global slot lock — booked at any clinic
            if (slot.available) {
                for (const [cId, set] of bookedMinutesByClinic.entries()) {
                    if (set.has(m)) {
                        slot.available = false;
                        slot.reason = cId === clinicId ? 'booked-here' : 'booked-elsewhere';
                        break;
                    }
                }
            }

            slots.push(slot);
        }
    }

    return res.json({
        success: true,
        data: {
            date: dateStr,
            dayOfWeek,
            consultationPrice: dc.consultationPrice,
            roomNumber: dc.roomNumber,
            slots,
        },
    });
};
