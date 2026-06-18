/**
 * /report command for the super-admin Telegram group. Parses range from
 * the user's text, aggregates appointments per-clinic with status
 * breakdown + paid/pending revenue, sends a text summary, then attaches
 * a PDF with the full per-clinic detail.
 *
 * Everything is computed in Asia/Tashkent so day/week/month boundaries
 * line up with the operator's calendar instead of UTC midnight.
 */
import PDFDocument from 'pdfkit';
import prisma from '../../config/database';

const TZ = 'Asia/Tashkent';
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5 — Tashkent has no DST.

/** Convert a local Tashkent Y-M-D into a UTC Date marking 00:00 Tashkent. */
function tashkentMidnight(y: number, m: number, d: number): Date {
    // 00:00 +05:00 → 19:00 previous-day UTC.
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - TZ_OFFSET_MS);
}

function tashkentNow(): Date {
    return new Date(Date.now() + TZ_OFFSET_MS);
}

function fmtDateOnly(d: Date): string {
    const tz = new Date(d.getTime() + TZ_OFFSET_MS);
    return `${String(tz.getUTCDate()).padStart(2, '0')}.${String(tz.getUTCMonth() + 1).padStart(2, '0')}.${tz.getUTCFullYear()}`;
}

function parseDDMMYYYY(s: string): Date | null {
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!m) return null;
    const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
    return tashkentMidnight(y, mo, d);
}

export interface ReportRange { from: Date; to: Date; label: string; }

/** Parse the args following `/report`. Returns null on invalid input. */
export function parseReportArgs(rawArgs: string): ReportRange | null {
    const args = (rawArgs || '').trim().toLowerCase();
    const now = tashkentNow();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const d = now.getUTCDate();
    const todayStart = tashkentMidnight(y, m, d);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    if (!args || args === 'day' || args === 'kun' || args === 'bugun') {
        return { from: todayStart, to: tomorrowStart, label: `Bugun (${fmtDateOnly(todayStart)})` };
    }
    if (args === 'week' || args === 'hafta') {
        const from = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
        return { from, to: tomorrowStart, label: `Oxirgi 7 kun (${fmtDateOnly(from)} – ${fmtDateOnly(todayStart)})` };
    }
    if (args === 'month' || args === 'oy') {
        const from = tashkentMidnight(y, m, 1);
        return { from, to: tomorrowStart, label: `Joriy oy (${fmtDateOnly(from)} – ${fmtDateOnly(todayStart)})` };
    }
    // Custom range: "DD.MM.YYYY DD.MM.YYYY" or "DD.MM.YYYY-DD.MM.YYYY"
    const parts = args.split(/[\s-]+/).filter(Boolean);
    if (parts.length === 2) {
        const a = parseDDMMYYYY(parts[0]);
        const b = parseDDMMYYYY(parts[1]);
        if (a && b) {
            const from = a < b ? a : b;
            const toStartDay = a < b ? b : a;
            const to = new Date(toStartDay.getTime() + 24 * 60 * 60 * 1000);
            return { from, to, label: `${fmtDateOnly(from)} – ${fmtDateOnly(toStartDay)}` };
        }
    }
    return null;
}

interface ClinicRollup {
    clinicId: string;
    clinicName: string;
    total: number;
    byStatus: Record<string, number>;
    paidRevenue: number;
    pendingRevenue: number;
}

export interface ReportData {
    range: ReportRange;
    perClinic: ClinicRollup[];
    grandTotal: number;
    grandPaidRevenue: number;
    grandPendingRevenue: number;
    grandByStatus: Record<string, number>;
}

const STATUS_LABEL_UZ: Record<string, string> = {
    PENDING: 'Yangi',
    CONFIRMED: 'Tasdiqlangan',
    CHECKED_IN: 'Klinikada',
    IN_PROGRESS: 'Jarayonda',
    COMPLETED: 'Yakunlangan',
    CANCELLED: 'Bekor',
    NO_SHOW: 'Kelmagan',
};
const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export async function buildReport(range: ReportRange): Promise<ReportData> {
    const rows = await prisma.appointment.findMany({
        where: { createdAt: { gte: range.from, lt: range.to } },
        select: {
            clinicId: true,
            status: true,
            paymentStatus: true,
            finalPrice: true,
            price: true,
            paidAmount: true,
            clinic: { select: { nameUz: true } },
        },
    });

    const byClinic = new Map<string, ClinicRollup>();
    for (const r of rows) {
        if (!byClinic.has(r.clinicId)) {
            byClinic.set(r.clinicId, {
                clinicId: r.clinicId,
                clinicName: (r as any).clinic?.nameUz || 'Klinika',
                total: 0,
                byStatus: {},
                paidRevenue: 0,
                pendingRevenue: 0,
            });
        }
        const c = byClinic.get(r.clinicId)!;
        c.total += 1;
        c.byStatus[r.status] = (c.byStatus[r.status] || 0) + 1;
        const amount = r.finalPrice || (r as any).price || 0;
        if (r.paymentStatus === 'PAID') c.paidRevenue += (r as any).paidAmount || amount;
        else if (r.status !== 'CANCELLED' && r.status !== 'NO_SHOW') c.pendingRevenue += amount;
    }

    const perClinic = Array.from(byClinic.values())
        .sort((a, b) => (b.paidRevenue + b.pendingRevenue) - (a.paidRevenue + a.pendingRevenue));

    const grandByStatus: Record<string, number> = {};
    let grandTotal = 0, grandPaid = 0, grandPending = 0;
    for (const c of perClinic) {
        grandTotal += c.total;
        grandPaid += c.paidRevenue;
        grandPending += c.pendingRevenue;
        for (const [k, v] of Object.entries(c.byStatus)) grandByStatus[k] = (grandByStatus[k] || 0) + v;
    }
    return { range, perClinic, grandTotal, grandPaidRevenue: grandPaid, grandPendingRevenue: grandPending, grandByStatus };
}

function fmtMoney(n: number): string {
    return Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');
}

function esc(s: string | number | null | undefined): string {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Compact text summary suitable for a Telegram message (~under 4 KB). */
export function formatReportText(data: ReportData): string {
    const lines: string[] = [];
    lines.push(`📊 <b>HISOBOT</b>`);
    lines.push(`🗓 ${esc(data.range.label)}`);
    lines.push('');
    lines.push(`<b>Jami:</b> ${data.grandTotal} ta bron`);
    const statusBits = STATUS_ORDER
        .filter(s => data.grandByStatus[s])
        .map(s => `${esc(STATUS_LABEL_UZ[s])}: ${data.grandByStatus[s]}`);
    if (statusBits.length) lines.push(`   ${statusBits.join(' · ')}`);
    lines.push(`💵 Tushum (toʻlangan): <b>${esc(fmtMoney(data.grandPaidRevenue))}</b> soʻm`);
    lines.push(`⏳ Kutilayotgan: <b>${esc(fmtMoney(data.grandPendingRevenue))}</b> soʻm`);
    lines.push('');
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    for (const c of data.perClinic.slice(0, 20)) {
        lines.push(`🏥 <b>${esc(c.clinicName)}</b>`);
        lines.push(`   Bron: ${c.total} · Toʻlangan: ${esc(fmtMoney(c.paidRevenue))} soʻm · Kutilayotgan: ${esc(fmtMoney(c.pendingRevenue))} soʻm`);
        const cs = STATUS_ORDER
            .filter(s => c.byStatus[s])
            .map(s => `${esc(STATUS_LABEL_UZ[s])}: ${c.byStatus[s]}`);
        if (cs.length) lines.push(`   ${cs.join(' · ')}`);
    }
    if (data.perClinic.length > 20) lines.push(`…va yana ${data.perClinic.length - 20} ta klinika (PDF da)`);
    return lines.join('\n').slice(0, 4000);
}

/** Render the full per-clinic table to PDF. Returns the binary buffer. */
export function buildReportPdf(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(c as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').text('Banisa — Hisobot');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#475569').text(data.range.label);
        doc.moveDown(1);

        // Grand summary card
        doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Umumiy:');
        doc.font('Helvetica').fontSize(11);
        doc.text(`Bronlar: ${data.grandTotal}`);
        const grandStatuses = STATUS_ORDER
            .filter(s => data.grandByStatus[s])
            .map(s => `${STATUS_LABEL_UZ[s]}: ${data.grandByStatus[s]}`).join(' · ');
        if (grandStatuses) doc.text(grandStatuses);
        doc.text(`Toʻlangan tushum: ${fmtMoney(data.grandPaidRevenue)} soʻm`);
        doc.text(`Kutilayotgan: ${fmtMoney(data.grandPendingRevenue)} soʻm`);
        doc.moveDown(1);

        // Per-clinic table
        const tableTop = doc.y;
        const colX = { name: 40, total: 280, paid: 350, pending: 460 };
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
        doc.text('Klinika', colX.name, tableTop);
        doc.text('Bron', colX.total, tableTop, { width: 60, align: 'right' });
        doc.text('Toʻlangan', colX.paid, tableTop, { width: 100, align: 'right' });
        doc.text('Kutilmoq', colX.pending, tableTop, { width: 100, align: 'right' });
        doc.moveTo(40, tableTop + 14).lineTo(560, tableTop + 14).strokeColor('#cbd5e1').stroke();
        doc.font('Helvetica').fontSize(10).fillColor('#0f172a');
        let y = tableTop + 20;
        for (const c of data.perClinic) {
            if (y > 760) { doc.addPage(); y = 50; }
            doc.text(c.clinicName, colX.name, y, { width: 230, ellipsis: true });
            doc.text(String(c.total), colX.total, y, { width: 60, align: 'right' });
            doc.text(fmtMoney(c.paidRevenue), colX.paid, y, { width: 100, align: 'right' });
            doc.text(fmtMoney(c.pendingRevenue), colX.pending, y, { width: 100, align: 'right' });
            y += 16;
            // Status breakdown one line under
            const breakdown = STATUS_ORDER
                .filter(s => c.byStatus[s])
                .map(s => `${STATUS_LABEL_UZ[s]}: ${c.byStatus[s]}`).join(' · ');
            if (breakdown) {
                doc.fillColor('#64748b').fontSize(8).text(breakdown, colX.name + 6, y, { width: 500 });
                doc.fillColor('#0f172a').fontSize(10);
                y += 12;
            }
            y += 4;
        }

        // Footer
        doc.fontSize(8).fillColor('#94a3b8').text(
            `Yaratildi: ${new Date().toISOString()}  ·  banisa.uz`,
            40, 800, { align: 'center', width: 520 },
        );

        doc.end();
    });
}
