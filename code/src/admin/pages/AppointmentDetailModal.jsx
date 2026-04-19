import { useQuery } from '@tanstack/react-query';
import { X, Calendar, User, Phone, Building2, Tag, FileText, Clock, CreditCard } from 'lucide-react';
import api from '../../shared/api/axios';
import './AppointmentsPage.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function AppointmentDetailModal({ appointmentId, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'appointment', appointmentId],
        queryFn: async () => (await api.get(`/admin/appointments/${appointmentId}`)).data.data,
    });

    return (
        <div className="apm-overlay" onClick={onClose}>
            <div className="apm-modal apm-modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="apm-header">
                    <div className="apm-title">Bron tafsiloti {data?.bookingNumber && `— ${data.bookingNumber}`}</div>
                    <button className="apm-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="apm-body">
                    {isLoading ? (
                        <div style={{ padding: 40, textAlign: 'center' }}>Yuklanmoqda...</div>
                    ) : data ? (
                        <div className="apd-detail-grid">
                            <section>
                                <h4>Bemor</h4>
                                <div className="apm-row"><User size={14} /><span>{data.patient?.firstName} {data.patient?.lastName}</span></div>
                                <div className="apm-row"><Phone size={14} /><span>{data.patient?.phone}</span></div>
                                {data.patient?.email && <div className="apm-row"><span>✉</span><span>{data.patient.email}</span></div>}
                            </section>
                            <section>
                                <h4>Klinika</h4>
                                <div className="apm-row"><Building2 size={14} /><span>{data.clinic?.nameUz}</span></div>
                                {data.clinic?.street && <div className="apm-row"><span>📍</span><span>{data.clinic.street}, {data.clinic.district}</span></div>}
                            </section>
                            <section>
                                <h4>Xizmat</h4>
                                <div className="apm-row"><Tag size={14} /><span>{data.diagnosticService?.nameUz || data.surgicalService?.nameUz}</span></div>
                                <div className="apm-row"><Calendar size={14} /><span>{new Date(data.scheduledAt).toLocaleString('uz-UZ')}</span></div>
                            </section>
                            <section>
                                <h4>To'lov</h4>
                                <div className="apm-row"><span>Narx:</span><span>{fmt(data.price)} so'm</span></div>
                                <div className="apm-row"><span>Chegirma ({data.discountPercent}%):</span><span>-{fmt(data.discountAmount)} so'm</span></div>
                                <div className="apm-row"><strong>Jami:</strong><strong>{fmt(data.finalPrice)} so'm</strong></div>
                                <div className="apm-row"><CreditCard size={14} /><span>{data.paymentStatus === 'PAID' ? 'To\'langan' : 'To\'lanmagan'}</span></div>
                            </section>
                            {Array.isArray(data.logs) && data.logs.length > 0 && (
                                <section className="apd-timeline-section">
                                    <h4>Tarix</h4>
                                    <ul className="apm-timeline">
                                        {data.logs.map((log) => (
                                            <li key={log.id}>
                                                <div className="apm-timeline-head">
                                                    <strong>{log.action}</strong>
                                                    <span>{new Date(log.createdAt).toLocaleString('uz-UZ')}</span>
                                                </div>
                                                {log.userName && <div className="apm-timeline-user">{log.userName} ({log.userRole})</div>}
                                                {log.note && <div className="apm-timeline-note">{log.note}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
