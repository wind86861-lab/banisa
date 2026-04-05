import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

const UZ_TO_EN_DAYS: Record<string, string> = {
    'dushanba': 'monday', 'seshanba': 'tuesday', 'chorshanba': 'wednesday',
    'payshanba': 'thursday', 'juma': 'friday', 'shanba': 'saturday', 'yakshanba': 'sunday',
};

const DEFAULT_WORKING_HOURS = {
    monday: { start: '08:00', end: '20:00', isDayOff: false },
    tuesday: { start: '08:00', end: '20:00', isDayOff: false },
    wednesday: { start: '08:00', end: '20:00', isDayOff: false },
    thursday: { start: '08:00', end: '20:00', isDayOff: false },
    friday: { start: '08:00', end: '18:00', isDayOff: false },
    saturday: { start: '09:00', end: '15:00', isDayOff: false },
    sunday: { start: null, end: null, isDayOff: true },
};

const DEFAULT_QUEUE_SETTINGS = {
    patientsPerSlot: 2,
    slotDurationMinutes: 30,
    bufferMinutes: 15,
};

export class ClinicSettingsService {

    private async getClinic(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { clinicId: true },
        });
        if (!user?.clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);

        const clinic = await prisma.clinic.findUnique({
            where: { id: user.clinicId },
            select: { id: true, workingHours: true },
        });
        if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
        return clinic;
    }

    // Stored as: { schedule: {...}, queueSettings: {...} }
    // Falls back gracefully for all legacy formats
    private parseStored(raw: any): { schedule: any; queueSettings: any } {
        if (!raw) {
            return { schedule: DEFAULT_WORKING_HOURS, queueSettings: DEFAULT_QUEUE_SETTINGS };
        }
        // Handle new nested format: { schedule: {...}, queueSettings: {...} }
        if (raw.schedule || raw.queueSettings) {
            return {
                schedule: raw.schedule ?? DEFAULT_WORKING_HOURS,
                queueSettings: raw.queueSettings ?? DEFAULT_QUEUE_SETTINGS,
            };
        }
        // Handle OLD array format: [{day:"Dushanba", from:"08:00", to:"18:00"}]
        if (Array.isArray(raw)) {
            const schedule: any = { ...DEFAULT_WORKING_HOURS };
            for (const item of raw) {
                const key = UZ_TO_EN_DAYS[String(item.day || '').toLowerCase()];
                if (key) schedule[key] = { start: item.from || '08:00', end: item.to || '18:00', isDayOff: false };
            }
            return { schedule, queueSettings: DEFAULT_QUEUE_SETTINGS };
        }
        // Handle legacy root-level object with openTime/closeTime keys
        const schedule: any = {};
        for (const [key, val] of Object.entries(raw)) {
            if (!val || typeof val !== 'object') continue;
            const v = val as any;
            schedule[key] = {
                start: v.start ?? v.openTime ?? '08:00',
                end: v.end ?? v.closeTime ?? '18:00',
                isDayOff: v.isDayOff !== undefined ? v.isDayOff : (v.isOpen !== undefined ? !v.isOpen : false),
            };
        }
        return {
            schedule: Object.keys(schedule).length > 0 ? schedule : DEFAULT_WORKING_HOURS,
            queueSettings: DEFAULT_QUEUE_SETTINGS,
        };
    }

    async getWorkingHours(userId: string) {
        const clinic = await this.getClinic(userId);
        const { schedule } = this.parseStored(clinic.workingHours);
        return schedule;
    }

    async updateWorkingHours(userId: string, hours: any) {
        const clinic = await this.getClinic(userId);
        const { queueSettings } = this.parseStored(clinic.workingHours);
        await prisma.clinic.update({
            where: { id: clinic.id },
            data: { workingHours: { schedule: hours, queueSettings } },
        });
        return hours;
    }

    async getQueueSettings(userId: string) {
        const clinic = await this.getClinic(userId);
        const { queueSettings } = this.parseStored(clinic.workingHours);
        return queueSettings;
    }

    async updateQueueSettings(userId: string, settings: any) {
        const clinic = await this.getClinic(userId);
        const { schedule } = this.parseStored(clinic.workingHours);
        await prisma.clinic.update({
            where: { id: clinic.id },
            data: { workingHours: { schedule, queueSettings: settings } },
        });
        return settings;
    }
}

export const clinicSettingsService = new ClinicSettingsService();
