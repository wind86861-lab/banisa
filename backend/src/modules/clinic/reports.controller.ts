import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { resolveUserClinicId } from './clinic-context.util';

// Membership-aware so secondary admins (clinicId=null) resolve their clinic.
const resolveClinicId = (userId: string) => resolveUserClinicId(userId);

// ─── Range resolver ──────────────────────────────────────────────────────────
type Range = 'today' | '7d' | '30d' | '90d' | 'all';
function rangeWindow(range: string): { from: Date; to: Date; prevFrom: Date; prevTo: Date; days: number } {
    const now = new Date();
    const to = now;
    let from: Date;
    let days: number;
    switch (range) {
        case 'today':
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            days = 1;
            break;
        case '7d':
            from = new Date(now.getTime() - 7 * 24 * 3600_000);
            days = 7;
            break;
        case '90d':
            from = new Date(now.getTime() - 90 * 24 * 3600_000);
            days = 90;
            break;
        case 'all':
            from = new Date(2000, 0, 1);
            days = 0;
            break;
        case '30d':
        default:
            from = new Date(now.getTime() - 30 * 24 * 3600_000);
            days = 30;
            break;
    }
    const span = to.getTime() - from.getTime();
    const prevTo = from;
    const prevFrom = new Date(from.getTime() - span);
    return { from, to, prevFrom, prevTo, days };
}

// ─── GET summary ─────────────────────────────────────────────────────────────
export const getSummary = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const range = String(req.query.range || '30d');
    const { from, to, prevFrom, prevTo } = rangeWindow(range);

    const [paidNow, paidPrev, allNow, unpaidNow] = await Promise.all([
        prisma.appointment.aggregate({
            where: { clinicId, paidAt: { gte: from, lte: to }, paymentStatus: 'PAID' },
            _sum: { paidAmount: true },
            _count: { _all: true },
        }),
        prisma.appointment.aggregate({
            where: { clinicId, paidAt: { gte: prevFrom, lte: prevTo }, paymentStatus: 'PAID' },
            _sum: { paidAmount: true },
            _count: { _all: true },
        }),
        prisma.appointment.count({
            where: { clinicId, createdAt: { gte: from, lte: to } },
        }),
        prisma.appointment.aggregate({
            where: {
                clinicId,
                createdAt: { gte: from, lte: to },
                paymentStatus: 'UNPAID',
            },
            _sum: { finalPrice: true },
            _count: true,
        }),
    ]);

    const revenue = paidNow._sum.paidAmount ?? 0;
    const prevRevenue = paidPrev._sum.paidAmount ?? 0;
    const paidCount = paidNow._count._all ?? 0;
    const prevPaidCount = paidPrev._count._all ?? 0;
    const avgTicket = paidCount > 0 ? Math.round(revenue / paidCount) : 0;
    const prevAvgTicket = prevPaidCount > 0 ? Math.round(prevRevenue / prevPaidCount) : 0;

    const pct = (now: number, prev: number) => {
        if (prev === 0) return now > 0 ? 100 : 0;
        return Math.round(((now - prev) / prev) * 100);
    };

    return res.json({
        success: true,
        data: {
            range,
            revenue,
            paidCount,
            unpaidCount: typeof unpaidNow._count === 'number' ? unpaidNow._count : 0,
            unpaidAmount: unpaidNow._sum.finalPrice ?? 0,
            allCount: allNow,
            avgTicket,
            deltas: {
                revenue: pct(revenue, prevRevenue),
                paidCount: pct(paidCount, prevPaidCount),
                avgTicket: pct(avgTicket, prevAvgTicket),
            },
            prev: {
                revenue: prevRevenue,
                paidCount: prevPaidCount,
                avgTicket: prevAvgTicket,
            },
        },
    });
};

// ─── GET revenue (daily buckets) ─────────────────────────────────────────────
export const getRevenueSeries = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const range = String(req.query.range || '30d');
    const { from, to } = rangeWindow(range);

    const rows = await prisma.appointment.findMany({
        where: {
            clinicId,
            paidAt: { gte: from, lte: to },
            paymentStatus: 'PAID',
        },
        select: { paidAt: true, paidAmount: true, paymentMethod: true },
    });

    // Bucket by day (local day key)
    const byDay = new Map<string, { revenue: number; count: number; cash: number; payme: number }>();
    for (const r of rows) {
        if (!r.paidAt) continue;
        const d = r.paidAt;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const cur = byDay.get(key) || { revenue: 0, count: 0, cash: 0, payme: 0 };
        cur.revenue += r.paidAmount ?? 0;
        cur.count += 1;
        if (r.paymentMethod === 'PAYME') cur.payme += r.paidAmount ?? 0;
        else if (r.paymentMethod === 'CASH') cur.cash += r.paidAmount ?? 0;
        byDay.set(key, cur);
    }

    // Fill in missing days
    const series: { date: string; revenue: number; count: number; cash: number; payme: number }[] = [];
    const dayMs = 24 * 3600_000;
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    for (let d = start.getTime(); d <= end.getTime(); d += dayMs) {
        const dd = new Date(d);
        const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
        const v = byDay.get(key) || { revenue: 0, count: 0, cash: 0, payme: 0 };
        series.push({ date: key, ...v });
    }

    return res.json({ success: true, data: { range, series } });
};

// ─── GET by-method (pie) ─────────────────────────────────────────────────────
export const getByMethod = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const range = String(req.query.range || '30d');
    const { from, to } = rangeWindow(range);

    const grouped = await prisma.appointment.groupBy({
        by: ['paymentMethod'],
        where: { clinicId, paidAt: { gte: from, lte: to }, paymentStatus: 'PAID' },
        _sum: { paidAmount: true },
        _count: { _all: true },
    });

    const items = grouped.map((g) => ({
        method: g.paymentMethod ?? 'OTHER',
        revenue: g._sum.paidAmount ?? 0,
        count: g._count._all ?? 0,
    }));

    return res.json({ success: true, data: { range, items } });
};

// ─── GET by-service (top N) ──────────────────────────────────────────────────
export const getByService = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const range = String(req.query.range || '30d');
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit || '8'), 10) || 8));
    const { from, to } = rangeWindow(range);

    const rows = await prisma.appointment.findMany({
        where: {
            clinicId,
            paidAt: { gte: from, lte: to },
            paymentStatus: 'PAID',
        },
        select: {
            paidAmount: true,
            diagnosticService: { select: { id: true, nameUz: true } },
            surgicalService: { select: { id: true, nameUz: true } },
        },
    });

    const byService = new Map<string, { id: string; name: string; revenue: number; count: number }>();
    for (const r of rows) {
        const s = r.diagnosticService ?? r.surgicalService;
        if (!s) continue;
        const cur = byService.get(s.id) || { id: s.id, name: s.nameUz, revenue: 0, count: 0 };
        cur.revenue += r.paidAmount ?? 0;
        cur.count += 1;
        byService.set(s.id, cur);
    }

    const items = Array.from(byService.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);

    return res.json({ success: true, data: { range, items } });
};

// ─── GET transactions (paginated + filterable) ──────────────────────────────
export const getTransactions = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const range = String(req.query.range || '30d');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20));
    const method = req.query.method ? String(req.query.method) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const { from, to } = rangeWindow(range);

    const where: any = {
        clinicId,
        paidAt: { gte: from, lte: to },
        paymentStatus: 'PAID',
    };
    if (method && ['PAYME', 'CASH', 'CARD'].includes(method)) where.paymentMethod = method;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
        prisma.appointment.findMany({
            where,
            orderBy: { paidAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                bookingNumber: true,
                paidAt: true,
                paidAmount: true,
                paymentMethod: true,
                status: true,
                patient: { select: { firstName: true, lastName: true, phone: true } },
                diagnosticService: { select: { nameUz: true } },
                surgicalService: { select: { nameUz: true } },
            },
        }),
        prisma.appointment.count({ where }),
    ]);

    return res.json({
        success: true,
        data: {
            items: items.map((a) => ({
                id: a.id,
                bookingNumber: a.bookingNumber,
                paidAt: a.paidAt,
                paidAmount: a.paidAmount,
                paymentMethod: a.paymentMethod,
                status: a.status,
                patientName: `${a.patient?.firstName ?? ''} ${a.patient?.lastName ?? ''}`.trim() || '—',
                patientPhone: a.patient?.phone ?? null,
                serviceName: a.diagnosticService?.nameUz ?? a.surgicalService?.nameUz ?? '—',
            })),
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    });
};

// ─── GET export (CSV) ───────────────────────────────────────────────────────
export const exportCsv = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const range = String(req.query.range || '30d');
    const { from, to } = rangeWindow(range);

    const rows = await prisma.appointment.findMany({
        where: {
            clinicId,
            paidAt: { gte: from, lte: to },
            paymentStatus: 'PAID',
        },
        orderBy: { paidAt: 'desc' },
        select: {
            bookingNumber: true,
            paidAt: true,
            paidAmount: true,
            paymentMethod: true,
            status: true,
            patient: { select: { firstName: true, lastName: true, phone: true } },
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
        },
    });

    const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const lines = ['Booking,Date,Amount,Method,Status,Patient,Phone,Service'];
    for (const a of rows) {
        lines.push([
            esc(a.bookingNumber),
            esc(a.paidAt?.toISOString() ?? ''),
            esc(a.paidAmount ?? 0),
            esc(a.paymentMethod ?? ''),
            esc(a.status),
            esc(`${a.patient?.firstName ?? ''} ${a.patient?.lastName ?? ''}`.trim()),
            esc(a.patient?.phone ?? ''),
            esc(a.diagnosticService?.nameUz ?? a.surgicalService?.nameUz ?? ''),
        ].join(','));
    }

    const csv = lines.join('\n');
    const filename = `banisa-reports-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv); // BOM for Excel UTF-8
};
