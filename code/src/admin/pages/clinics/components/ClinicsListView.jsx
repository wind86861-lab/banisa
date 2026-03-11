import React from 'react';
import { MapPin, Phone, Star } from 'lucide-react';
import StatusChip, { SourceBadge } from './StatusChip';
import ClinicActions from './ClinicActions';

const CLINIC_TYPE_LABELS = {
    GENERAL: '🏥 Umumiy', SPECIALIZED: '🔬 Ixtisoslashgan',
    DIAGNOSTIC: '📊 Diagnostika', DENTAL: '🦷 Stomatologiya',
    MATERNITY: "👶 Tug'ruqxona", REHABILITATION: '♿ Reabilitatsiya',
    PHARMACY: '💊 Dorixona', OTHER: '🏛️ Boshqa',
};

const ClinicsListView = ({
    clinics,
    selected,
    onSelectAll,
    onSelect,
    onView,
    onEdit,
    onDelete,
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
        <table className="master-table">
            <thead>
                <tr>
                    <th style={{ width: 40 }}>
                        <input
                            type="checkbox"
                            onChange={(e) => onSelectAll(e.target.checked)}
                            checked={selected.length === clinics.length && clinics.length > 0}
                        />
                    </th>
                    <th>Klinika nomi</th>
                    <th>Turi</th>
                    <th>Viloyat</th>
                    <th>Reyting</th>
                    <th>Holati</th>
                    <th>Amallar</th>
                </tr>
            </thead>
            <tbody>
                {clinics.map(clinic => (
                    <tr key={clinic.id} onClick={() => onView(clinic)}>
                        <td onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={selected.includes(clinic.id)}
                                onChange={() => onSelect(clinic.id)}
                            />
                        </td>
                        <td>
                            <div className="service-name-cell">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 8, overflow: 'hidden',
                                        flexShrink: 0, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', background: '#f3f4f6', fontSize: 18
                                    }}>
                                        {clinic.logo
                                            ? <img src={clinic.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : '🏥'}
                                    </div>
                                    <div>
                                        <span className="main-name">{clinic.nameUz}</span>
                                        {showSourceBadge && <SourceBadge source={clinic.source} />}
                                        {clinic.adminPhone && (
                                            <span className="meta" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                <Phone size={11} /> {clinic.adminPhone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span className="cat-badge">
                                {CLINIC_TYPE_LABELS[clinic.type] ?? clinic.type}
                            </span>
                        </td>
                        <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                                <MapPin size={13} color="#6b7280" /> {clinic.region}
                            </span>
                        </td>
                        <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500 }}>
                                <Star size={13} fill="#fbbf24" color="#fbbf24" />
                                {clinic.averageRating?.toFixed(1) ?? '0.0'}
                            </span>
                        </td>
                        <td>
                            <StatusChip status={clinic.status} />
                        </td>
                        <td>
                            <ClinicActions
                                clinic={clinic}
                                enableWorkflow={enableWorkflow}
                                onView={() => onView(clinic)}
                                onEdit={(e) => { e?.stopPropagation(); onEdit(clinic); }}
                                onDelete={(e) => { e?.stopPropagation(); onDelete(clinic.id); }}
                                onApprove={() => onApprove(clinic.id)}
                                onReject={() => onReject(clinic)}
                                onReopen={() => onReopen(clinic.id)}
                                onReview={() => onReview(clinic)}
                                approving={approvingId === clinic.id}
                                rejecting={rejectingId === clinic.id}
                                reopening={reopeningId === clinic.id}
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ClinicsListView;
