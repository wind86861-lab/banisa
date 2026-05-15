import { Request, Response } from 'express';
import prisma from '../../config/database';

export class MetadataTemplateController {
  // GET /admin/metadata-templates
  async listTemplates(req: Request, res: Response) {
    try {
      const templates = await prisma.metadataTemplate.findMany({
        include: {
          serviceLinks: true,
          _count: {
            select: {
              serviceLinks: true,
              appointmentMetadata: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch service names for all links
      const templatesWithNames = await Promise.all(
        templates.map(async (template: any) => {
          const linksWithNames = await Promise.all(
            template.serviceLinks.map(async (link: any) => {
              let serviceName = 'Unknown';

              if (link.serviceType === 'DIAGNOSTIC') {
                const service = await prisma.diagnosticService.findUnique({
                  where: { id: link.serviceId },
                  select: { nameUz: true },
                });
                serviceName = service?.nameUz || 'Unknown';
              } else if (link.serviceType === 'SURGICAL') {
                const service = await prisma.surgicalService.findUnique({
                  where: { id: link.serviceId },
                  select: { nameUz: true },
                });
                serviceName = service?.nameUz || 'Unknown';
              } else if (link.serviceType === 'CHECKUP') {
                const service = await prisma.checkupPackage.findUnique({
                  where: { id: link.serviceId },
                  select: { nameUz: true },
                });
                serviceName = service?.nameUz || 'Unknown';
              }

              return { ...link, serviceName };
            })
          );

          return { ...template, serviceLinks: linksWithNames };
        })
      );

      res.json({ success: true, data: templatesWithNames });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // POST /admin/metadata-templates
  async createTemplate(req: Request, res: Response) {
    try {
      const {
        key,
        labelUz,
        labelRu,
        labelEn,
        inputType,
        unit,
        category,
        validation,
        visibleToPatient,
        editableBy,
      } = req.body;

      const template = await prisma.metadataTemplate.create({
        data: {
          key,
          labelUz,
          labelRu,
          labelEn,
          inputType,
          unit,
          category: category || 'MEDICAL_INFO',
          validation: validation || {},
          visibleToPatient: visibleToPatient !== false,
          editableBy: editableBy || 'CLINIC',
          createdBy: (req as any).user?.id,
        },
      });

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // PUT /admin/metadata-templates/:id
  async updateTemplate(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const {
        labelUz,
        labelRu,
        labelEn,
        inputType,
        unit,
        category,
        validation,
        visibleToPatient,
        editableBy,
        isActive,
      } = req.body;

      const template = await prisma.metadataTemplate.update({
        where: { id },
        data: {
          labelUz,
          labelRu,
          labelEn,
          inputType,
          unit,
          category,
          validation,
          visibleToPatient,
          editableBy,
          isActive,
          updatedAt: new Date(),
        },
      });

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // DELETE /admin/metadata-templates/:id (soft delete)
  async deleteTemplate(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      const template = await prisma.metadataTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // POST /admin/metadata-templates/:id/link-service
  async linkToService(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { serviceType, serviceId, isRequired, displayOrder } = req.body;

      const link = await prisma.serviceMetadataLink.create({
        data: {
          templateId: id,
          serviceType,
          serviceId,
          isRequired: isRequired || false,
          displayOrder: displayOrder || 0,
          createdBy: (req as any).user?.id,
        },
      });

      res.json({ success: true, data: link });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // DELETE /admin/metadata-templates/links/:linkId
  async unlinkFromService(req: Request, res: Response) {
    try {
      const linkId = req.params.linkId as string;

      await prisma.serviceMetadataLink.delete({
        where: { id: linkId },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
