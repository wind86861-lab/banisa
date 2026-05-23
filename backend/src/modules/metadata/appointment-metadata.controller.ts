import { Request, Response } from 'express';
import prisma from '../../config/database';
import { validateMetadataValue } from './metadata-validation';

async function resolveClinicId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clinicId: true },
  });
  return user?.clinicId ?? null;
}

function isAuthorized(role: string, appointmentClinicId: string, userClinicId: string | null): boolean {
  if (role === 'SUPER_ADMIN') return true;
  if (!userClinicId) return false;
  return appointmentClinicId === userClinicId;
}

export class AppointmentMetadataController {
  // GET /clinic/appointments/:id/required-metadata
  async getRequiredMetadata(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          diagnosticService: true,
          surgicalService: true,
          services: true,
        },
      });

      if (!appointment) {
        return res.status(404).json({ success: false, error: { message: 'Appointment not found' } });
      }

      const userClinicId = await resolveClinicId(user?.id);
      if (!isAuthorized(user?.role, appointment.clinicId, userClinicId)) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      }

      // Determine service type and ID
      let serviceType: string | null = null;
      let serviceId: string | null = null;

      if (appointment.diagnosticServiceId) {
        serviceType = 'DIAGNOSTIC';
        serviceId = appointment.diagnosticServiceId;
      } else if (appointment.surgicalServiceId) {
        serviceType = 'SURGICAL';
        serviceId = appointment.surgicalServiceId;
      } else {
        const services = (appointment as any).services || [];
        const checkupService = services.find(
          (s: any) => s.originalServiceId && (s.serviceName?.toLowerCase().includes('checkup') || s.serviceName?.toLowerCase().includes('tekshiruv'))
        );
        if (checkupService && checkupService.originalServiceId) {
          serviceType = 'CHECKUP';
          serviceId = checkupService.originalServiceId;
        }
      }

      if (!serviceType || !serviceId) {
        return res.json({ success: true, data: [] });
      }

      const links = await prisma.serviceMetadataLink.findMany({
        where: {
          serviceType: serviceType as any,
          serviceId,
        },
        include: { template: true },
        orderBy: { displayOrder: 'asc' },
      });

      const activeLinks = links.filter((link: any) => link.template?.isActive);

      const existingMetadata = await prisma.appointmentMetadata.findMany({
        where: { appointmentId: id as string },
      });

      const existingMap = new Map(existingMetadata.map((m: any) => [m.templateId, m.value]));

      const result = activeLinks.map((link: any) => ({
        template: link.template,
        isRequired: link.isRequired,
        currentValue: existingMap.get(link.templateId) || null,
      }));

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // POST /clinic/appointments/:id/metadata
  async setMetadata(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;
      const { templateId, value } = req.body;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        select: { id: true, clinicId: true },
      });

      if (!appointment) {
        return res.status(404).json({ success: false, error: { message: 'Appointment not found' } });
      }

      const userClinicId = await resolveClinicId(user?.id);
      if (!isAuthorized(user?.role, appointment.clinicId, userClinicId)) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      }

      const template = await prisma.metadataTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template || !template.isActive) {
        return res.status(400).json({ success: false, error: { message: 'Invalid template' } });
      }

      const validationError = validateMetadataValue(value, template);
      if (validationError) {
        return res.status(400).json({ success: false, error: { message: validationError } });
      }

      const metadata = await prisma.appointmentMetadata.upsert({
        where: {
          appointmentId_templateId: { appointmentId: id, templateId },
        },
        create: {
          appointmentId: id,
          templateId,
          value,
          createdBy: user?.id,
        },
        update: {
          value,
          updatedAt: new Date(),
        },
      });

      res.json({ success: true, data: metadata });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
