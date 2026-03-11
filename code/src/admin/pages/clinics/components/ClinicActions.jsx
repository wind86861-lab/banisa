import React from 'react';
import { Eye, Edit3, Trash2, CheckCircle2, XCircle, RefreshCw, Clock } from 'lucide-react';

const ClinicActions = ({
    clinic,
    enableWorkflow = false,
    onView,
    onEdit,
    onDelete,
    onApprove,
    onReject,
    onReopen,
    onReview,
    approving,
    rejecting,
    reopening,
}) => {
    const { status } = clinic;

    return (
        <div className="actions-cell" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="btn-icon" title="Ko'rish" onClick={onView}>
                <Eye size={15} />
            </button>

            {(status === 'APPROVED' || status === 'BLOCKED' || status === 'SUSPENDED') && (
                <button className="btn-icon" title="Tahrirlash" onClick={onEdit}>
                    <Edit3 size={15} />
                </button>
            )}

            {enableWorkflow && status === 'PENDING' && (
                <button
                    className="btn-icon"
                    title="Ko'rib chiqishga olish"
                    onClick={onReview}
                    style={{ color: '#3b82f6' }}
                >
                    <Clock size={15} />
                </button>
            )}

            {enableWorkflow && (status === 'PENDING' || status === 'IN_REVIEW') && (
                <>
                    <button
                        className="btn-icon"
                        title="Tasdiqlash"
                        onClick={onApprove}
                        disabled={approving}
                        style={{ color: '#10b981' }}
                    >
                        <CheckCircle2 size={15} />
                    </button>
                    <button
                        className="btn-icon danger"
                        title="Rad etish"
                        onClick={onReject}
                        disabled={rejecting}
                    >
                        <XCircle size={15} />
                    </button>
                </>
            )}

            {enableWorkflow && status === 'REJECTED' && (
                <button
                    className="btn-icon"
                    title="Qayta ko'rib chiqish"
                    onClick={onReopen}
                    disabled={reopening}
                    style={{ color: '#f59e0b' }}
                >
                    <RefreshCw size={15} />
                </button>
            )}

            <button className="btn-icon danger" title="O'chirish" onClick={onDelete}>
                <Trash2 size={15} />
            </button>
        </div>
    );
};

export default ClinicActions;
