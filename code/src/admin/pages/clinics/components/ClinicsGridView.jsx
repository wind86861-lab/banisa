import React from 'react';
import { MapPin, Phone, Star, CheckCircle2, XCircle, RefreshCw, Eye, Edit3, Clock } from 'lucide-react';
import StatusChip, { SourceBadge } from './StatusChip';

const CLINIC_TYPE_LABELS = {
    GENERAL: '🏥', SPECIALIZED: '🔬', DIAGNOSTIC: '📊',
    DENTAL: '🦷', MATERNITY: '👶', REHABILITATION: '♿',
    PHARMACY: '💊', OTHER: '🏛️',
};

const ClinicsGridView = ({
    clinics,
    onView,
    onEdit,
    onApprove,
    onReject,
    onReopen,
    onReview,
    showSourceBadge = false,
    enableWorkflow = false,
    approvingId,
    rejectingId,
    reopeningId,
}) => {
    return (
        <div className="cards-grid">
            {clinics.map(clinic => (
                <div key={clinic.id} className="service-card" onClick={() => onView(clinic)}>
                    <div className="card-top">
                        <span className="card-icon">{CLINIC_TYPE_LABELS[clinic.type] ?? '🏥'}</span>
                        <StatusChip status={clinic.status} />
                    </div>

                    <h3 style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 700 }}>
                        {clinic.nameUz}
                    </h3>

                    {showSourceBadge && (
                        <SourceBadge source={clinic.source} />
                    )}

                    <div className="card-meta" style={{ marginTop: 6 }}>
                        <span><MapPin size={13} /> {clinic.region}</span>
                        {clinic.adminPhone && <span><Phone size={13} /> {clinic.adminPhone}</span>}
                    </div>

                    <div className="card-meta">
                        <span><Star size={13} fill="#fbbf24" color="#fbbf24" /> {clinic.averageRating?.toFixed(1) ?? '0.0'} ({clinic.reviewCount ?? 0})</span>
                    </div>

                    {enableWorkflow && clinic.rejectionReason && (
                        <div style={{
                            marginTop: 8, padding: '6px 10px', borderRadius: 8,
                            background: '#fef2f2', fontSize: 12, color: '#dc2626', lineHeight: 1.4
                        }}>
                            ❌ {clinic.rejectionReason}
                        </div>
                    )}

                    {enableWorkflow && clinic.submittedAt && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                            📅 {new Date(clinic.submittedAt).toLocaleDateString('uz-UZ')}
                        </div>
                    )}

                    <div className="card-actions" onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
                        <button className="btn-view" onClick={() => onView(clinic)}>
                            <Eye size={13} /> Ko'rish
                        </button>

                        {(clinic.status === 'APPROVED' || clinic.status === 'BLOCKED' || clinic.status === 'SUSPENDED') && (
                            <button className="btn-edit" onClick={() => onEdit(clinic)}>
                                <Edit3 size={13} /> Tahrirlash
                            </button>
                        )}

                        {enableWorkflow && clinic.status === 'PENDING' && (
                            <button
                                className="btn-view"
                                style={{ color: '#3b82f6', borderColor: '#3b82f6' }}
                                onClick={() => onReview(clinic)}
                            >
                                <Clock size={13} /> Ko'rib chiq
                            </button>
                        )}

                        {enableWorkflow && (clinic.status === 'PENDING' || clinic.status === 'IN_REVIEW') && (
                            <>
                                <button
                                    className="btn-edit"
                                    style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b981' }}
                                    onClick={() => onApprove(clinic.id)}
                                    disabled={approvingId === clinic.id}
                                >
                                    <CheckCircle2 size={13} /> Tasdiqlash
                                </button>
                                <button
                                    className="btn-edit"
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444' }}
                                    onClick={() => onReject(clinic)}
                                    disabled={rejectingId === clinic.id}
                                >
                                    <XCircle size={13} /> Rad etish
                                </button>
                            </>
                        )}

                        {enableWorkflow && clinic.status === 'REJECTED' && (
                            <button
                                className="btn-view"
                                style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                                onClick={() => onReopen(clinic.id)}
                                disabled={reopeningId === clinic.id}
                            >
                                <RefreshCw size={13} /> Qayta ko'rib chiq
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ClinicsGridView;
