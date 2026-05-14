import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import './ProgressTimeline.css';

const TIMELINE_STEPS = [
    { key: 'created', label: 'Yaratildi', statuses: ['PENDING', 'OPERATOR_CONFIRMED'] },
    { key: 'confirmed', label: 'Tasdiqlandi', statuses: ['SENT_TO_CLINIC', 'CLINIC_ACCEPTED'] },
    { key: 'checkin', label: 'Check-in', statuses: ['PENDING_ARRIVAL', 'CHECKED_IN'] },
    { key: 'paid', label: 'To\'landi', statuses: ['PAID', 'IN_PROGRESS'] },
    { key: 'completed', label: 'Yakunlandi', statuses: ['COMPLETED'] },
];

export default function ProgressTimeline({ appointment }) {
    if (!appointment) return null;

    const currentStatus = appointment.status;
    const paymentStatus = appointment.paymentStatus;
    const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'NO_SHOW';

    const getCurrentStep = () => {
        if (isCancelled) return -1;
        if (currentStatus === 'COMPLETED') return 4;
        if (paymentStatus === 'PAID' || currentStatus === 'IN_PROGRESS') return 3;
        if (currentStatus === 'CHECKED_IN' || currentStatus === 'PENDING_ARRIVAL') return 2;
        if (currentStatus === 'CLINIC_ACCEPTED' || currentStatus === 'SENT_TO_CLINIC') return 1;
        return 0;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="progress-timeline">
            <div className="progress-timeline-header">
                <h3>Jarayon</h3>
                {isCancelled && <span className="progress-cancelled-badge">Bekor qilingan</span>}
            </div>
            <div className="progress-timeline-track">
                {TIMELINE_STEPS.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    const isFuture = index > currentStep;

                    return (
                        <div key={step.key} className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''} ${isCancelled ? 'cancelled' : ''}`}>
                            <div className="progress-step-icon">
                                {isCancelled && index === currentStep ? (
                                    <XCircle size={24} />
                                ) : isCompleted ? (
                                    <CheckCircle2 size={24} />
                                ) : isActive ? (
                                    <Clock size={24} className="progress-pulse" />
                                ) : (
                                    <Circle size={24} />
                                )}
                            </div>
                            <div className="progress-step-label">{step.label}</div>
                            {index < TIMELINE_STEPS.length - 1 && (
                                <div className={`progress-connector ${isCompleted ? 'completed' : ''}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
