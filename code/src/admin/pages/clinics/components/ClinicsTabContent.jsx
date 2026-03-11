import React, { useState } from 'react';
import { Loader2, AlertCircle, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import {
    useClinics, useApproveClinic, useRejectClinic, useReopenClinic,
    useUpdateClinicStatus, useDeleteClinic,
} from '../hooks/useClinics';
import ClinicsFilters from './ClinicsFilters';
import ClinicsListView from './ClinicsListView';
import ClinicsGridView from './ClinicsGridView';
import ClinicDetailsModal from './ClinicDetailsModal';
import ReviewClinicModal from './ReviewClinicModal';
import RejectClinicModal from './RejectClinicModal';

const ClinicsTabContent = ({
    tabFilters = {},       // { source, status } — fixed filters for this tab
    showSourceBadge = false,
    enableWorkflow = false,
    onOpenCreate,
    onOpenEdit,
}) => {
    // ── Local filter state ──────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [region, setRegion] = useState('all');
    const [type, setType] = useState('all');
    const [viewMode, setViewMode] = useState('table');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState([]);

    // ── Modal state ─────────────────────────────────────────────────────────────
    const [detailClinic, setDetailClinic] = useState(null);
    const [reviewClinic, setReviewClinic] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null); // { id, name }

    // ── Build merged filter object ──────────────────────────────────────────────
    const filters = {
        ...tabFilters,
        ...(search.length >= 2 && { search }),
        ...(status !== 'all' && { status }),
        ...(region !== 'all' && { region }),
        ...(type !== 'all' && { type }),
        page,
        limit: 12,
    };

    // ── Queries & mutations ─────────────────────────────────────────────────────
    const { data, isLoading, error, refetch } = useClinics(filters);
    const clinics = data?.data ?? [];
    const meta = data?.meta ?? { total: 0, page: 1, limit: 12, totalPages: 1 };

    const approve = useApproveClinic();
    const reject = useRejectClinic();
    const reopen = useReopenClinic();
    const updateStatus = useUpdateClinicStatus();
    const deleteMut = useDeleteClinic();

    const approvingId = approve.isPending ? approve.variables : null;
    const rejectingId = reject.isPending ? reject.variables?.id : null;
    const reopeningId = reopen.isPending ? reopen.variables : null;

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleApprove = (id) => {
        approve.mutate(id);
    };

    const handleRejectOpen = (clinic) => {
        setRejectTarget({ id: clinic.id, name: clinic.nameUz });
        if (reviewClinic?.id === clinic.id) setReviewClinic(null);
    };

    const handleRejectConfirm = (reason) => {
        reject.mutate(
            { id: rejectTarget.id, reason },
            { onSuccess: () => { setRejectTarget(null); setReviewClinic(null); } }
        );
    };

    const handleReopen = (id) => {
        reopen.mutate(id);
    };

    const handleReview = (clinic) => {
        updateStatus.mutate(
            { id: clinic.id, status: 'IN_REVIEW' },
            { onSuccess: () => setReviewClinic({ ...clinic, status: 'IN_REVIEW' }) }
        );
    };

    const handleDelete = (id) => {
        if (!window.confirm("Klinikani o'chirmoqchimisiz?")) return;
        deleteMut.mutate(id, {
            onSuccess: () => { if (detailClinic?.id === id) setDetailClinic(null); }
        });
    };

    const handleToggleBlock = (clinic) => {
        const newStatus = clinic.status === 'BLOCKED' ? 'APPROVED' : 'BLOCKED';
        if (!window.confirm(clinic.status === 'BLOCKED' ? 'Klinikani faollashtirasizmi?' : 'Klinikani bloklaysizmi?')) return;
        updateStatus.mutate({ id: clinic.id, status: newStatus });
        if (detailClinic?.id === clinic.id) setDetailClinic({ ...clinic, status: newStatus });
    };

    const handleSelectAll = (checked) => {
        setSelected(checked ? clinics.map(c => c.id) : []);
    };

    const handleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        setSelected([]);
    };

    const sharedProps = {
        clinics,
        showSourceBadge,
        enableWorkflow,
        approvingId,
        rejectingId,
        reopeningId,
        onView: setDetailClinic,
        onEdit: (c) => { setDetailClinic(null); onOpenEdit?.(c); },
        onDelete: handleDelete,
        onApprove: handleApprove,
        onReject: handleRejectOpen,
        onReopen: handleReopen,
        onReview: handleReview,
    };

    return (
        <>
            <ClinicsFilters
                search={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                status={status}
                onStatusChange={(v) => { setStatus(v); setPage(1); }}
                region={region}
                onRegionChange={(v) => { setRegion(v); setPage(1); }}
                type={type}
                onTypeChange={(v) => { setType(v); setPage(1); }}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onRefresh={() => refetch()}
                enableWorkflow={enableWorkflow}
            />

            {selected.length > 0 && (
                <div className="bulk-actions-bar">
                    <span>{selected.length} ta tanlandi</span>
                    <button className="btn-bulk-cancel" onClick={() => setSelected([])}>Bekor qilish</button>
                </div>
            )}

            {error && (
                <div className="error-banner">
                    <AlertCircle size={18} /> Ma'lumot yuklashda xatolik
                    <button onClick={() => refetch()}>Qayta urinish</button>
                </div>
            )}

            {isLoading ? (
                <div className="loading-state">
                    <Loader2 size={36} className="spin" />
                    <p>Yuklanmoqda...</p>
                </div>
            ) : clinics.length === 0 ? (
                <div className="empty-state">
                    <span>🏥</span>
                    <h3>Klinikalar topilmadi</h3>
                    <p>Filtr yoki qidiruvni o'zgartiring</p>
                    {!enableWorkflow && (
                        <button className="btn-add-service" onClick={onOpenCreate}>
                            <Plus size={18} /> Yangi klinika
                        </button>
                    )}
                </div>
            ) : (
                <div className="catalog-view">
                    {viewMode === 'table' ? (
                        <ClinicsListView
                            {...sharedProps}
                            selected={selected}
                            onSelectAll={handleSelectAll}
                            onSelect={handleSelect}
                        />
                    ) : (
                        <ClinicsGridView {...sharedProps} />
                    )}

                    {meta.totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                                <ArrowLeft size={16} /> Oldingi
                            </button>
                            <span>{page} / {meta.totalPages} ({meta.total} ta)</span>
                            <button disabled={page >= meta.totalPages} onClick={() => handlePageChange(page + 1)}>
                                Keyingi <ArrowRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Detail drawer */}
            <ClinicDetailsModal
                clinic={detailClinic}
                onClose={() => setDetailClinic(null)}
                onEdit={(c) => { setDetailClinic(null); onOpenEdit?.(c); }}
                onDelete={handleDelete}
                onToggleBlock={handleToggleBlock}
            />

            {/* Review modal (full details + approve/reject buttons) */}
            <ReviewClinicModal
                open={!!reviewClinic}
                clinic={reviewClinic}
                onClose={() => setReviewClinic(null)}
                onApprove={() => handleApprove(reviewClinic?.id)}
                onReject={() => handleRejectOpen(reviewClinic)}
                approving={approvingId === reviewClinic?.id}
                rejecting={rejectingId === reviewClinic?.id}
            />

            {/* Reject reason modal */}
            <RejectClinicModal
                open={!!rejectTarget}
                clinicName={rejectTarget?.name}
                onConfirm={handleRejectConfirm}
                onClose={() => setRejectTarget(null)}
                loading={reject.isPending}
            />
        </>
    );
};

export default ClinicsTabContent;
