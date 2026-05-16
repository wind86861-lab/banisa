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

      // Collect all linked service ids per type, then batch-fetch names
      // (avoids an N+1 query per service link).
      const allLinks = templates.flatMap((t: any) => t.serviceLinks);
      const idsByType: Record<string, Set<string>> = {
        DIAGNOSTIC: new Set(),
        SURGICAL: new Set(),
        CHECKUP: new Set(),
      };
      for (const link of allLinks) {
        idsByType[link.serviceType]?.add(link.serviceId);
      }

      const [diagnostics, surgicals, checkups] = await Promise.all([
        prisma.diagnosticService.findMany({
          where: { id: { in: [...idsByType.DIAGNOSTIC] } },
          select: { id: true, nameUz: true },
        }),
        prisma.surgicalService.findMany({
          where: { id: { in: [...idsByType.SURGICAL] } },
          select: { id: true, nameUz: true },
        }),
        prisma.checkupPackage.findMany({
          where: { id: { in: [...idsByType.CHECKUP] } },
          select: { id: true, nameUz: true },
        }),
      ]);

      const nameMap = new Map<string, string>();
      for (const s of [...diagnostics, ...surgicals, ...checkups]) {
        nameMap.set(s.id, s.nameUz);
      }

      const templatesWithNames = templates.map((template: any) => ({
        ...template,
        serviceLinks: template.serviceLinks.map((link: any) => ({
          ...link,
          serviceName: nameMap.get(link.serviceId) || 'Unknown',
        })),
      }));

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
