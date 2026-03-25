import { useState, useEffect } from 'react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomizationBasicTab from './CustomizationBasicTab';
import CustomizationDescriptionTab from './CustomizationDescriptionTab';
import CustomizationTechnicalTab from './CustomizationTechnicalTab';
import CustomizationPreparationTab from './CustomizationPreparationTab';
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
    { key: 1, label: 'Tavsif & Jarayon' },
    { key: 2, label: 'Texnik' },
    { key: 3, label: 'Tayyorgarlik' },
    { key: 4, label: 'Rasmlar' },
    { key: 5, label: 'Ish vaqti' },
    { key: 6, label: "Qo'shimcha" },
];

const EMPTY_FORM = {
    // Basic naming & pricing
    customNameUz: '',
    customNameRu: '',
    customDescriptionUz: '',
    customDescriptionRu: '',
    customPrice: null,
    discountPercent: null,

    // ─── CLINIC-SPECIFIC FULL CONTENT ───
    fullDescriptionUz: '',
    fullDescriptionRu: '',
    processDescription: '',

    // ─── CLINIC-SPECIFIC TECHNICAL ───
    sampleVolume: '',
    resultFormat: '',
    resultTimeHours: null,
    estimatedDurationMinutes: null,

    // Equipment & Quality
    equipment: '',
    accuracy: '',
    certifications: [],

    // ─── CLINIC-SPECIFIC PREPARATION ───
    preparationUz: '',
    preparationRu: '',
    preparationJson: {
        fastingHours: null,
        waterAllowed: true,
        stopMedications: '',
        alcoholHours: null,
        smokingHours: null,
        exerciseRestriction: '',
        bestTime: '',
        specialDiet: '',
        documents: '',
        womenWarnings: '',
    },

    // ─── CLINIC-SPECIFIC BOOKING POLICY ───
    bookingPolicy: {
        prepaymentRequired: false,
        cancellationPolicy: '',
        modificationPolicy: '',
        bookingMethods: [],
    },

    // ─── ADDITIONAL INFO ───
    additionalInfo: {
        experience: '',
        dailyCapacity: null,
        specialFeatures: [],
    },

    // Legacy fields
    benefits: [],
    tags: [],
    customCategory: null,
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
    const [saveError, setSaveError] = useState(null);

    // In activate mode, clinicServiceId won't exist until after activation
    // In regular edit mode, use service.clinicService.id
    const clinicServiceId = activatedClinicServiceId || service?.clinicService?.id;

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
            setSaveError(null);
        }
    }, [open]);

    const buildCleanedData = () => {
        const cleaned = { ...formData };

        // ── String fields with backend min-length requirements ──
        // If value is empty OR shorter than the minimum, send null (field is optional)
        const STRING_MIN = {
            customNameUz: 5, customNameRu: 5,
            customDescriptionUz: 10, customDescriptionRu: 10,
            fullDescriptionUz: 20, fullDescriptionRu: 20,
            processDescription: 20,
            preparationUz: 10, preparationRu: 10,
            sampleVolume: 1, resultFormat: 1,
            equipment: 1, accuracy: 1,
        };
        Object.entries(STRING_MIN).forEach(([k, min]) => {
            const val = cleaned[k];
            if (!val || val.trim().length < min) cleaned[k] = null;
            else cleaned[k] = val.trim();
        });

        // ── customCategory must be valid enum or null ──
        if (!cleaned.customCategory || cleaned.customCategory === '') cleaned.customCategory = null;

        // ── Numeric fields: falsy (but not 0) → null ──
        if (!cleaned.estimatedDurationMinutes) cleaned.estimatedDurationMinutes = null;
        if (!cleaned.resultTimeHours) cleaned.resultTimeHours = null;
        if (!cleaned.displayOrder) cleaned.displayOrder = null;
        if (!cleaned.prepaymentPercentage) cleaned.prepaymentPercentage = null;
        if (!cleaned.customPrice) cleaned.customPrice = null;
        // discountPercent: keep 0 as valid, only null if truly empty
        if (cleaned.discountPercent === null || cleaned.discountPercent === undefined || cleaned.discountPercent === '') {
            cleaned.discountPercent = null;
        }

        // ── Benefits: filter invalid, strip empty ru ──
        if (cleaned.benefits && cleaned.benefits.length > 0) {
            cleaned.benefits = cleaned.benefits
                .map(b => {
                    const uz = b.uz?.trim() || '';
                    const ru = b.ru?.trim() || '';
                    return { uz, ...(ru.length >= 3 ? { ru } : {}) };
                })
                .filter(b => b.uz.length >= 3);
            if (cleaned.benefits.length === 0) delete cleaned.benefits;
        } else {
            delete cleaned.benefits;
        }

        // ── Tags: remove empty ──
        if (!cleaned.tags || cleaned.tags.length === 0) {
            delete cleaned.tags;
        } else {
            cleaned.tags = cleaned.tags.filter(t => t && t.trim().length >= 2);
        }

        // ── Certifications ──
        if (!cleaned.certifications || cleaned.certifications.length === 0) {
            cleaned.certifications = null;
        } else {
            cleaned.certifications = cleaned.certifications.filter(c => c && c.trim().length >= 1);
        }

        // ── Available days ──
        if (!cleaned.availableDays || cleaned.availableDays.length === 0) delete cleaned.availableDays;

        // ── Available time slots ──
        if (!cleaned.availableTimeSlots || Object.keys(cleaned.availableTimeSlots).length === 0) {
            cleaned.availableTimeSlots = null;
        }

        // ── preparationJson: remove deleted fields, null if all fields empty ──
        if (cleaned.preparationJson) {
            // Remove fields that were deleted from the UI
            delete cleaned.preparationJson.waterAllowed;
            delete cleaned.preparationJson.alcoholHours;
            delete cleaned.preparationJson.smokingHours;
            delete cleaned.preparationJson.stopMedications;
            delete cleaned.preparationJson.exerciseRestriction;
            delete cleaned.preparationJson.womenWarnings;

            const hasData = Object.values(cleaned.preparationJson).some(v =>
                v !== null && v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
            );
            if (!hasData) cleaned.preparationJson = null;
        }

        // ── bookingPolicy: null if all fields empty ──
        if (cleaned.bookingPolicy) {
            const bp = cleaned.bookingPolicy;
            const hasData = bp.cancellationPolicy?.trim() || bp.modificationPolicy?.trim() ||
                bp.bookingMethods?.length > 0 || bp.prepaymentRequired === true;
            if (!hasData) cleaned.bookingPolicy = null;
        }

        // ── additionalInfo: null if all fields empty ──
        if (cleaned.additionalInfo) {
            const ai = cleaned.additionalInfo;
            const hasData = ai.experience?.trim() || ai.dailyCapacity || ai.specialFeatures?.length > 0;
            if (!hasData) cleaned.additionalInfo = null;
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
        setSaveError(null);
        const cleanedData = buildCleanedData();
        console.log('📤 Sending customization data:', JSON.stringify(cleanedData, null, 2));
        try {
            await upsertMut.mutateAsync({ clinicServiceId, data: cleanedData });
            onClose();
        } catch (err) {
            console.error('❌ Customization save error:', err?.response?.data);
            const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || 'Saqlashda xatolik yuz berdi';
            setSaveError(msg);
        }
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
                                const isDisabled = activateMode && t.key === 4 && !activatedClinicServiceId;
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
                                        <CustomizationDescriptionTab
                                            service={service}
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                    {activeTab === 2 && (
                                        <CustomizationTechnicalTab
                                            service={service}
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                    {activeTab === 3 && (
                                        <CustomizationPreparationTab
                                            service={service}
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                    {activeTab === 4 && (
                                        <CustomizationImagesTab
                                            clinicServiceId={activatedClinicServiceId || clinicServiceId}
                                            images={customization?.images || []}
                                        />
                                    )}
                                    {activeTab === 5 && (
                                        <CustomizationScheduleTab
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                    {activeTab === 6 && (
                                        <CustomizationExtrasTab
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                </>
                            ) : null}
                        </div>

                        {/* Footer */}
                        {saveError && (
                            <div style={{
                                margin: '0 20px 8px',
                                padding: '10px 14px',
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8, fontSize: 13, color: '#ef4444',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>⚠️</span>
                                <span>{saveError}</span>
                            </div>
                        )}
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
