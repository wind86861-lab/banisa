import { Request, Response } from 'express';
import prisma from '../../config/database';

export class AppointmentMetadataController {
  // GET /clinic/appointments/:id/required-metadata
  async getRequiredMetadata(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          diagnosticService: true,
          surgicalService: true,
        },
      });

      if (!appointment) {
        return res.status(404).json({ success: false, error: { message: 'Appointment not found' } });
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
      }

      if (!serviceType || !serviceId) {
        return res.json({ success: true, data: [] });
      }

      // Get linked metadata templates
      const links = await prisma.serviceMetadataLink.findMany({
        where: {
          serviceType: serviceType as any,
          serviceId,
        },
        include: {
          template: true,
        },
        orderBy: { displayOrder: 'asc' },
      });

      // Filter only active templates
      const activeLinks = links.filter((link: any) => link.template?.isActive);

      // Get existing values
      const existingMetadata = await prisma.appointmentMetadata.findMany({
        where: { appointmentId: id as string },
      });

      const existingMap = new Map(
        existingMetadata.map((m: any) => [m.templateId, m.value])
      );

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
      const { templateId, value } = req.body;

      // Validate template
      const template = await prisma.metadataTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template || !template.isActive) {
        return res.status(400).json({ success: false, error: { message: 'Invalid template' } });
      }

      // Validate value
      const validationError = this.validateMetadataValue(value, template);
      if (validationError) {
        return res.status(400).json({ success: false, error: { message: validationError } });
      }

      const metadata = await prisma.appointmentMetadata.upsert({
        where: {
          appointmentId_templateId: {
            appointmentId: id,
            templateId,
          },
        },
        create: {
          appointmentId: id,
          templateId,
          value,
          createdBy: (req as any).user?.id,
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

  private validateMetadataValue(value: string, template: any): string | null {
    const validation = template.validation as any;

    switch (template.inputType) {
      case 'NUMBER':
        const num = parseFloat(value);
        if (isNaN(num)) return 'Invalid number';
        if (validation?.min && num < validation.min) return `Min: ${validation.min}`;
        if (validation?.max && num > validation.max) return `Max: ${validation.max}`;
        break;

      case 'SELECT':
        if (validation?.options && !validation.options.includes(value)) {
          return 'Invalid option';
        }
        break;

      case 'TEXT':
      case 'TEXTAREA':
        if (validation?.maxLength && value.length > validation.maxLength) {
          return `Max length: ${validation.maxLength}`;
        }
        break;
    }

    if (validation?.required && !value) {
      return 'Required field';
    }

    return null;
  }
}
