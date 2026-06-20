/**
 * Super-admin endpoint for the single-row GlobalFiscalSettings table.
 * This is the platform-wide default for MXIK / package_code / vat_percent
 * that the Payme handler falls back to whenever a clinic-service doesn't
 * have its own per-service override.
 */
import { Request, Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';

const ROW_ID = 'global';
// Numeric-only, 1-32 chars — matches the validation we use on the per-
// clinic fields and on the per-service override.
const FISCAL_CODE_REGEX = /^\d{1,32}$/;

export const getGlobalFiscal = async (_req: Request, res: Response) => {
    const row = await prisma.globalFiscalSettings.findUnique({ where: { id: ROW_ID } });
    sendSuccess(res, {
        fiscalMxikCode: row?.fiscalMxikCode ?? null,
        fiscalPackageCode: row?.fiscalPackageCode ?? null,
        fiscalVatPercent: row?.fiscalVatPercent ?? null,
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.updatedBy ?? null,
    });
};

export const updateGlobalFiscal = async (req: AuthRequest, res: Response) => {
    const { fiscalMxikCode, fiscalPackageCode, fiscalVatPercent } = req.body || {};

    const cleaned: any = {};
    for (const k of ['fiscalMxikCode', 'fiscalPackageCode'] as const) {
        const v = (req.body as any)[k];
        if (v === undefined) continue;
        if (v === null || v === '') { cleaned[k] = null; continue; }
        const s = String(v).trim();
        if (!FISCAL_CODE_REGEX.test(s)) {
            return res.status(400).json({
                success: false,
                message: `${k} faqat raqamlardan iborat bo'lishi kerak (1-32 belgi).`,
            });
        }
        cleaned[k] = s;
    }
    if (fiscalVatPercent !== undefined) {
        if (fiscalVatPercent === null || fiscalVatPercent === '') {
            cleaned.fiscalVatPercent = null;
        } else {
            const n = Number(fiscalVatPercent);
            if (!Number.isFinite(n) || n < 0 || n > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'fiscalVatPercent 0 dan 100 gacha bo\'lishi kerak.',
                });
            }
            cleaned.fiscalVatPercent = Math.trunc(n);
        }
    }

    const saved = await prisma.globalFiscalSettings.upsert({
        where: { id: ROW_ID },
        update: { ...cleaned, updatedBy: req.user?.id ?? null },
        create: { id: ROW_ID, ...cleaned, updatedBy: req.user?.id ?? null },
    });

    sendSuccess(res, {
        fiscalMxikCode: saved.fiscalMxikCode,
        fiscalPackageCode: saved.fiscalPackageCode,
        fiscalVatPercent: saved.fiscalVatPercent,
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy,
    });
};
