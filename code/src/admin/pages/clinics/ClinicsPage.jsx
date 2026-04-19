import React, { useState, useEffect } from 'react';
import { Plus, Building2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinics, useCreateClinic, useUpdateClinic } from './hooks/useClinics';
import ClinicsTabContent from './components/ClinicsTabContent';
import ClinicFormWizard from './components/ClinicFormWizard';
import '../../../pages/Services.css';
import '../../../pages/Clinics.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'all', label: 'Barcha klinikalar', filters: {}, showSourceBadge: true, enableWorkflow: false },
    { id: 'admin', label: 'Admin kiritgan', filters: { source: 'ADMIN_CREATED' }, showSourceBadge: false, enableWorkflow: false },
    { id: 'registrations', label: 'Arizalar', filters: { source: 'SELF_REGISTERED' }, showSourceBadge: false, enableWorkflow: true },
];

// ─── Badge count hook ─────────────────────────────────────────────────────────

const useBadgeCounts = () => {
    const allQ = useClinics({ limit: 1 });
    const selfQ = useClinics({ source: 'SELF_REGISTERED', limit: 1 });
    const pendingQ = useClinics({ source: 'SELF_REGISTERED', status: 'PENDING', limit: 1 });
    const adminQ = useClinics({ source: 'ADMIN_CREATED', status: 'APPROVED', limit: 1 });

    return {
        all: allQ.data?.meta?.total ?? 0,
        admin: adminQ.data?.meta?.total ?? 0,
        self: selfQ.data?.meta?.total ?? 0,
        pending: pendingQ.data?.meta?.total ?? 0,
    };
};

// ─── Main ClinicsPage ─────────────────────────────────────────────────────────

const ClinicsPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editClinic, setEditClinic] = useState(null);

    const counts = useBadgeCounts();

    const tabCounts = [counts.all, counts.admin, counts.self];

    const handleOpenCreate = () => { setEditClinic(null); setShowForm(true); };
    const handleOpenEdit = (clinic) => { setEditClinic(clinic); setShowForm(true); };

    return (
        <div className="services-container">
            {/* Header */}
            <div className="services-header">
                <div>
                    <h1><Building2 size={28} /> Klinikalar</h1>
                    <p>Barcha klinikalarni boshqarish</p>
                </div>
                <button className="btn-add-service" onClick={handleOpenCreate}>
                    <Plus size={20} /> Yangi klinika
                </button>
            </div>

            {/* Tab navigation */}
            <div className="clinics-tabs-nav" style={{ marginBottom: 24 }}>
                {TABS.map((tab, i) => (
                    <button
                        key={tab.id}
                        className={`cl-tab-btn ${activeTab === i ? 'active' : ''}`}
                        onClick={() => setActiveTab(i)}
                    >
                        {tab.label}
                        {tabCounts[i] > 0 && (
                            <span className="cl-tab-badge">
                                {tabCounts[i]}
                            </span>
                        )}
                        {tab.id === 'registrations' && counts.pending > 0 && (
                            <span className="cl-tab-badge" style={{ background: '#f59e0b' }}>
                                {counts.pending} yangi
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {TABS.map((tab, i) => (
                <div key={tab.id} style={{ display: activeTab === i ? 'block' : 'none' }}>
                    <ClinicsTabContent
                        tabFilters={tab.filters}
                        showSourceBadge={tab.showSourceBadge}
                        enableWorkflow={tab.enableWorkflow}
                        onOpenCreate={handleOpenCreate}
                        onOpenEdit={handleOpenEdit}
                    />
                </div>
            ))}

            {/* Create/Edit form wizard */}
            <ClinicFormWizard
                open={showForm}
                editData={editClinic}
                onClose={() => { setShowForm(false); setEditClinic(null); }}
            />
        </div>
    );
};

export default ClinicsPage;
