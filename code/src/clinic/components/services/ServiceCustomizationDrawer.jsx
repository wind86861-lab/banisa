import { useState, useEffect } from 'react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomizationBasicTab from './CustomizationBasicTab';
import CustomizationImagesTab from './CustomizationImagesTab';
import CustomizationScheduleTab from './CustomizationScheduleTab';
import CustomizationExtrasTab from './CustomizationExtrasTab';
import {
    useServiceCustomization,
    useUpsertCustomization,
    useDeleteCustomization,
} from '../../hooks/useServiceCustomization';
import '../../pages/clinic-admin.css';

const TABS = [
    { key: 0, label: 'Asosiy' },
    { key: 1, label: 'Rasmlar' },
    { key: 2, label: 'Ish vaqti' },
    { key: 3, label: "Qo'shimcha" },
];

const EMPTY_FORM = {
    customNameUz: '',
    customNameRu: '',
    customDescriptionUz: '',
    customDescriptionRu: '',
    preparationUz: '',
    preparationRu: '',
    benefits: [],
    tags: [],
    customCategory: null,
    estimatedDurationMinutes: null,
    availableDays: [],
    availableTimeSlots: {},
    requiresAppointment: true,
    requiresPrepayment: false,
    prepaymentPercentage: null,
    isHighlighted: false,
    displayOrder: null,
};

export default function ServiceCustomizationDrawer({ open, onClose, service }) {
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const clinicServiceId = service?.clinicService?.id;

    const { data: customization, isLoading } = useServiceCustomization(
        clinicServiceId,
        { enabled: open && !!clinicServiceId },
    );

    const upsertMut = useUpsertCustomization();
    const deleteMut = useDeleteCustomization();

    // Init form data when customization loads
    useEffect(() => {
        if (!open) return;
        if (customization) {
            setFormData({ ...EMPTY_FORM, ...customization });
        } else if (clinicServiceId && !isLoading) {
            setFormData({ ...EMPTY_FORM });
        }
    }, [customization, clinicServiceId, open, isLoading]);

    // Reset on close
    useEffect(() => {
        if (!open) {
            setActiveTab(0);
            setFormData(null);
            setShowDeleteConfirm(false);
        }
    }, [open]);

    const handleSave = async () => {
        if (!clinicServiceId || !formData) return;

        // Clean empty strings to null for optional fields
        const cleaned = { ...formData };
        ['customNameUz', 'customNameRu', 'customDescriptionUz', 'customDescriptionRu',
         'preparationUz', 'preparationRu', 'customCategory'].forEach(k => {
            if (cleaned[k] === '') cleaned[k] = null;
        });
        if (!cleaned.estimatedDurationMinutes) cleaned.estimatedDurationMinutes = null;
        if (!cleaned.displayOrder) cleaned.displayOrder = null;
        if (!cleaned.prepaymentPercentage) cleaned.prepaymentPercentage = null;

        await upsertMut.mutateAsync({ clinicServiceId, data: cleaned });
        onClose();
    };

    const handleDelete = async () => {
        if (!clinicServiceId) return;
        await deleteMut.mutateAsync(clinicServiceId);
        setShowDeleteConfirm(false);
        onClose();
    };

    if (!open || !service?.clinicService) return null;

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="ca-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="ca-drawer"
                        style={{ width: 680, maxWidth: '92vw' }}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.28 }}
                    >
                        {/* Header */}
                        <div className="ca-drawer-header">
                            <div>
                                <span className="ca-drawer-title">Xizmatni moslashtirish</span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {service.nameUz}
                                </div>
                            </div>
                            <button className="ca-drawer-close" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="ca-tabs" style={{ padding: '0 20px', borderBottom: '1px solid var(--border-color)' }}>
                            {TABS.map(t => (
                                <button
                                    key={t.key}
                                    className={`ca-tab${activeTab === t.key ? ' active' : ''}`}
                                    onClick={() => setActiveTab(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Body */}
                        <div className="ca-drawer-body">
                            {isLoading ? (
                                <div className="ca-loading">
                                    <Loader2 size={28} className="ca-spin" />
                                    <span>Yuklanmoqda...</span>
                                </div>
                            ) : formData ? (
                                <>
                                    {activeTab === 0 && (
                                        <CustomizationBasicTab
                                            service={service}
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                    {activeTab === 1 && (
                                        <CustomizationImagesTab
                                            clinicServiceId={clinicServiceId}
                                            images={customization?.images || []}
                                        />
                                    )}
                                    {activeTab === 2 && (
                                        <CustomizationScheduleTab
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                    {activeTab === 3 && (
                                        <CustomizationExtrasTab
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                </>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="ca-drawer-footer">
                            {customization && (
                                <button
                                    className="ca-btn-danger"
                                    style={{ marginRight: 'auto' }}
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 size={14} /> O&#39;chirish
                                </button>
                            )}
                            <button className="ca-btn-secondary" onClick={onClose}>Bekor qilish</button>
                            <button
                                className="ca-btn-primary"
                                onClick={handleSave}
                                disabled={upsertMut.isPending}
                            >
                                {upsertMut.isPending
                                    ? <Loader2 size={15} className="ca-spin" />
                                    : <Save size={15} />}
                                Saqlash
                            </button>
                        </div>
                    </motion.div>

                    {/* Delete confirm */}
                    {showDeleteConfirm && (
                        <div className="ca-dialog-overlay" style={{ zIndex: 1400 }} onClick={() => setShowDeleteConfirm(false)}>
                            <div className="ca-dialog" onClick={e => e.stopPropagation()}>
                                <div className="ca-dialog-icon" style={{ background: 'rgba(252,105,106,0.12)', color: 'var(--color-danger)' }}>
                                    <Trash2 size={26} />
                                </div>
                                <div className="ca-dialog-title">Moslashtirishni o&#39;chirish?</div>
                                <div className="ca-dialog-desc">
                                    Barcha maxsus ma&#39;lumotlar va rasmlar o&#39;chiriladi.
                                    Xizmat asosiy ma&#39;lumotlariga qaytadi.
                                </div>
                                <div className="ca-dialog-actions">
                                    <button className="ca-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Bekor</button>
                                    <button className="ca-btn-danger" onClick={handleDelete} disabled={deleteMut.isPending}>
                                        {deleteMut.isPending ? <Loader2 size={14} className="ca-spin" /> : null}
                                        O&#39;chirish
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}
