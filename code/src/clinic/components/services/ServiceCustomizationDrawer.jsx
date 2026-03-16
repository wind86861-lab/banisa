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
    customPrice: null,
    discountPercent: null,
    availableDays: [],
    availableTimeSlots: {},
    requiresAppointment: true,
    requiresPrepayment: false,
    prepaymentPercentage: null,
    isHighlighted: false,
    displayOrder: null,
};

export default function ServiceCustomizationDrawer({ open, onClose, service, activateMode = false, onSaveAndActivate, activatedClinicServiceId = null }) {
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [priceError, setPriceError] = useState(false);
    const [activating, setActivating] = useState(false);

    const clinicServiceId = service?.clinicService?.id;

    const { data: customization, isLoading } = useServiceCustomization(
        clinicServiceId,
        { enabled: open && !!clinicServiceId },
    );

    const upsertMut = useUpsertCustomization();
    const deleteMut = useDeleteCustomization();

    // Init form data
    useEffect(() => {
        if (!open) return;
        if (customization) {
            setFormData({ ...EMPTY_FORM, ...customization });
        } else if (!isLoading) {
            setFormData({ ...EMPTY_FORM });
        }
    }, [customization, open, isLoading]);

    // Reset on close
    useEffect(() => {
        if (!open) {
            setActiveTab(0);
            setFormData(null);
            setShowDeleteConfirm(false);
            setPriceError(false);
            setActivating(false);
        }
    }, [open]);

    const buildCleanedData = () => {
        const cleaned = { ...formData };

        // Clean empty strings to null
        ['customNameUz', 'customNameRu', 'customDescriptionUz', 'customDescriptionRu',
            'preparationUz', 'preparationRu'].forEach(k => {
                if (cleaned[k] === '') cleaned[k] = null;
            });

        // customCategory must be enum or null
        if (!cleaned.customCategory || cleaned.customCategory === '') {
            cleaned.customCategory = null;
        }

        // Clean numeric fields
        if (!cleaned.estimatedDurationMinutes) cleaned.estimatedDurationMinutes = null;
        if (!cleaned.displayOrder) cleaned.displayOrder = null;
        if (!cleaned.prepaymentPercentage) cleaned.prepaymentPercentage = null;
        if (!cleaned.customPrice) cleaned.customPrice = null;
        if (!cleaned.discountPercent) cleaned.discountPercent = null;

        // Clean arrays - empty arrays should be undefined for optional fields
        if (!cleaned.benefits || cleaned.benefits.length === 0) {
            delete cleaned.benefits;
        }
        if (!cleaned.tags || cleaned.tags.length === 0) {
            delete cleaned.tags;
        }
        if (!cleaned.availableDays || cleaned.availableDays.length === 0) {
            delete cleaned.availableDays;
        }

        // availableTimeSlots - empty object should be null
        if (!cleaned.availableTimeSlots || Object.keys(cleaned.availableTimeSlots).length === 0) {
            cleaned.availableTimeSlots = null;
        }

        return cleaned;
    };

    const handleSave = async () => {
        if (!formData) return;

        // In activate mode customPrice is required
        if (activateMode) {
            if (!formData.customPrice || formData.customPrice <= 0) {
                setPriceError(true);
                setActiveTab(0);
                return;
            }
            setPriceError(false);
            setActivating(true);
            try {
                await onSaveAndActivate(service.id, buildCleanedData());
            } finally {
                setActivating(false);
            }
            return;
        }

        if (!clinicServiceId) return;
        await upsertMut.mutateAsync({ clinicServiceId, data: buildCleanedData() });
        onClose();
    };

    const handleDelete = async () => {
        if (!clinicServiceId) return;
        await deleteMut.mutateAsync(clinicServiceId);
        setShowDeleteConfirm(false);
        onClose();
    };

    if (!open || !service) return null;

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
                                <span className="ca-drawer-title">
                                    {activateMode ? 'Aktivlashtirish' : 'Xizmatni moslashtirish'}
                                </span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {service.nameUz}
                                </div>
                            </div>
                            <button className="ca-drawer-close" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Activate mode banner */}
                        {activateMode && (
                            <div style={{
                                margin: '0 20px 0', padding: '10px 14px',
                                background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.25)',
                                borderRadius: 8, fontSize: 13, color: 'var(--text-main)',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ fontSize: 18 }}>💡</span>
                                <span>
                                    Xizmatni aktivlashtirish uchun <strong style={{ color: 'var(--color-primary)' }}>Klinika narxi</strong> ni kiriting (majburiy).
                                </span>
                            </div>
                        )}

                        {/* Price error banner */}
                        {priceError && (
                            <div style={{
                                margin: '8px 20px 0', padding: '8px 14px',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8, fontSize: 13, color: '#ef4444',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>⚠️</span>
                                <span><strong>Klinika narxi</strong> kiritilishi shart!</span>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="ca-tabs" style={{ padding: '0 20px', borderBottom: '1px solid var(--border-color)' }}>
                            {TABS.map(t => {
                                // In activate mode, disable images tab until service is activated
                                const isDisabled = activateMode && t.key === 1 && !activatedClinicServiceId;
                                return (
                                    <button
                                        key={t.key}
                                        className={`ca-tab${activeTab === t.key ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
                                        onClick={() => !isDisabled && setActiveTab(t.key)}
                                        disabled={isDisabled}
                                        style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
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
                                            clinicServiceId={activatedClinicServiceId || clinicServiceId}
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
                            {customization && !activateMode && activeTab === 0 && (
                                <button
                                    className="ca-btn-danger"
                                    style={{ marginRight: 'auto' }}
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 size={14} /> O&#39;chirish
                                </button>
                            )}

                            {/* Previous button (not on first tab) */}
                            {activeTab > 0 && (
                                <button
                                    className="ca-btn-secondary"
                                    onClick={() => setActiveTab(activeTab - 1)}
                                    style={{ marginRight: 'auto' }}
                                >
                                    ← Orqaga
                                </button>
                            )}

                            <button className="ca-btn-secondary" onClick={onClose}>Bekor qilish</button>

                            {/* Next button (not on last tab) */}
                            {activeTab < TABS.length - 1 ? (
                                <button
                                    className="ca-btn-primary"
                                    onClick={() => setActiveTab(activeTab + 1)}
                                >
                                    Keyingisi →
                                </button>
                            ) : (
                                /* Save button (only on last tab) */
                                <button
                                    className="ca-btn-primary"
                                    onClick={handleSave}
                                    disabled={upsertMut.isPending || activating}
                                >
                                    {(upsertMut.isPending || activating)
                                        ? <Loader2 size={15} className="ca-spin" />
                                        : <Save size={15} />}
                                    {activateMode ? 'Saqlash va Aktivlashtirish' : 'Saqlash'}
                                </button>
                            )}
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
