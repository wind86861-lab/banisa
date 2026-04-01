import { useState, useEffect } from 'react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useSurgeryCustomization,
    useUpsertSurgeryCustomization,
    useDeleteSurgeryCustomization,
} from '../../hooks/useSurgeryCustomization';
import '../../pages/clinic-admin.css';

const TABS = [
    { key: 0, label: 'Asosiy' },
    { key: 1, label: 'Tavsif' },
    { key: 2, label: 'Tayyorgarlik' },
    { key: 3, label: 'Tiklanish' },
];

const SURGERY_METHODS = [
    { value: 'LAPAROSCOPIC', label: 'Laparoskopik' },
    { value: 'OPEN', label: 'Ochiq jarrohlik' },
    { value: 'ENDOSCOPIC', label: 'Endoskopik' },
    { value: 'ROBOTIC', label: 'Robot yordamida' },
    { value: 'MINIMALLY_INVASIVE', label: 'Minimal invaziv' },
];

const ANESTHESIA_TYPES = [
    { value: 'GENERAL', label: 'Umumiy narkoz' },
    { value: 'LOCAL', label: 'Lokal anesteziya' },
    { value: 'REGIONAL', label: 'Regional anesteziya' },
    { value: 'SPINAL', label: 'Spinal anesteziya' },
    { value: 'EPIDURAL', label: 'Epidural anesteziya' },
    { value: 'SEDATION', label: 'Sedatsiya' },
];

const EMPTY_FORM = {
    // Basic info
    customNameUz: '',
    customNameRu: '',
    customPrice: null,
    discountPercent: null,

    // Surgery specifics
    surgeryMethod: '',
    anesthesiaType: '',
    durationMinutes: null,
    recoveryDays: null,
    hospitalizationDays: null,

    // Descriptions
    descriptionShortUz: '',
    descriptionShortRu: '',
    descriptionFullUz: '',
    descriptionFullRu: '',

    // Pricing details
    priceIncludesUz: '',
    priceIncludesRu: '',
    installmentAvailable: false,
    installmentMonths: null,
    insuranceAccepted: false,
    insuranceProviders: '',

    // Pre-op preparation
    preOpInstructionsUz: '',
    preOpInstructionsRu: '',
    preOpFastingHours: null,
    preOpMedicationStop: '',
    preOpTestsRequired: '',

    // Post-op care
    postOpInstructionsUz: '',
    postOpInstructionsRu: '',
    postOpDietUz: '',
    postOpActivityRestrictions: '',
    postOpFollowUpDays: null,
};

function BasicTab({ form, setForm, baseService }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Base service info */}
            <div style={{
                padding: '12px 16px', background: 'rgba(139,92,246,0.06)',
                border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10,
            }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{baseService.nameUz}</div>
                {baseService.nameRu && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{baseService.nameRu}</div>
                )}
            </div>

            {/* Custom naming */}
            <div className="ca-form-group">
                <label>Klinikangiz nomlanishi (ixtiyoriy)</label>
                <input
                    type="text"
                    value={form.customNameUz}
                    onChange={e => setForm({ ...form, customNameUz: e.target.value })}
                    placeholder={baseService.nameUz}
                />
                <span className="ca-hint">Bo'sh qoldirilsa, standart nom ishlatiladi</span>
            </div>

            {/* Surgery method */}
            <div className="ca-form-group">
                <label>Operatsiya usuli <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                    value={form.surgeryMethod}
                    onChange={e => setForm({ ...form, surgeryMethod: e.target.value })}
                    required
                >
                    <option value="">Tanlang</option>
                    {SURGERY_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
            </div>

            {/* Anesthesia type */}
            <div className="ca-form-group">
                <label>Anesteziya turi <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                    value={form.anesthesiaType}
                    onChange={e => setForm({ ...form, anesthesiaType: e.target.value })}
                    required
                >
                    <option value="">Tanlang</option>
                    {ANESTHESIA_TYPES.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                </select>
            </div>

            {/* Duration */}
            <div className="ca-form-row">
                <div className="ca-form-group">
                    <label>Davomiyligi (daqiqa) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        type="number"
                        value={form.durationMinutes ?? ''}
                        onChange={e => setForm({ ...form, durationMinutes: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="90"
                        min="1"
                        required
                    />
                </div>
                <div className="ca-form-group">
                    <label>Tiklanish muddati (kun) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        type="number"
                        value={form.recoveryDays ?? ''}
                        onChange={e => setForm({ ...form, recoveryDays: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="7"
                        min="1"
                        required
                    />
                </div>
            </div>

            {/* Hospitalization */}
            <div className="ca-form-group">
                <label>Yotoqxonada qolish (kun)</label>
                <input
                    type="number"
                    value={form.hospitalizationDays ?? ''}
                    onChange={e => setForm({ ...form, hospitalizationDays: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="1-3"
                    min="0"
                />
                <span className="ca-hint">0 = ambulatoriya (yotmasdan)</span>
            </div>

            {/* Pricing */}
            <div className="ca-form-row">
                <div className="ca-form-group">
                    <label>Narx (UZS) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        type="number"
                        value={form.customPrice ?? ''}
                        onChange={e => setForm({ ...form, customPrice: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="5000000"
                        min="0"
                        required
                    />
                </div>
                <div className="ca-form-group">
                    <label>Chegirma (%)</label>
                    <input
                        type="number"
                        value={form.discountPercent ?? ''}
                        onChange={e => setForm({ ...form, discountPercent: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="10"
                        min="0"
                        max="100"
                    />
                </div>
            </div>

            {/* Price includes */}
            <div className="ca-form-group">
                <label>Narxga nima kiritilgan <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                    value={form.priceIncludesUz}
                    onChange={e => setForm({ ...form, priceIncludesUz: e.target.value })}
                    placeholder="Operatsiya, anesteziya, dori-darmonlar, palata (1 kun), ovqatlanish..."
                    rows={3}
                    required
                />
            </div>

            {/* Payment options */}
            <div className="ca-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={form.installmentAvailable}
                        onChange={e => setForm({ ...form, installmentAvailable: e.target.checked })}
                    />
                    Bo'lib to'lash imkoni
                </label>
                {form.installmentAvailable && (
                    <input
                        type="number"
                        value={form.installmentMonths ?? ''}
                        onChange={e => setForm({ ...form, installmentMonths: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Necha oyga? (masalan: 6)"
                        min="2"
                        max="24"
                        style={{ marginTop: 8 }}
                    />
                )}
            </div>

            {/* Insurance */}
            <div className="ca-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={form.insuranceAccepted}
                        onChange={e => setForm({ ...form, insuranceAccepted: e.target.checked })}
                    />
                    Sug'urta qabul qilinadi
                </label>
                {form.insuranceAccepted && (
                    <input
                        type="text"
                        value={form.insuranceProviders}
                        onChange={e => setForm({ ...form, insuranceProviders: e.target.value })}
                        placeholder="Sug'urta kompaniyalari (vergul bilan ajrating)"
                        style={{ marginTop: 8 }}
                    />
                )}
            </div>
        </div>
    );
}

function DescriptionTab({ form, setForm }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ca-form-group">
                <label>Qisqacha tavsif <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                    value={form.descriptionShortUz}
                    onChange={e => setForm({ ...form, descriptionShortUz: e.target.value })}
                    placeholder="Operatsiya haqida qisqacha ma'lumot (1-2 jumla)"
                    rows={2}
                    required
                />
            </div>

            <div className="ca-form-group">
                <label>To'liq tavsif <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                    value={form.descriptionFullUz}
                    onChange={e => setForm({ ...form, descriptionFullUz: e.target.value })}
                    placeholder="Operatsiya jarayoni, qanday o'tishi, natijalar haqida batafsil..."
                    rows={8}
                    required
                />
                <span className="ca-hint">Bemorlar uchun tushunarli tilda yozing</span>
            </div>
        </div>
    );
}

function PreparationTab({ form, setForm }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ca-form-group">
                <label>Operatsiyadan oldin tayyorgarlik <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                    value={form.preOpInstructionsUz}
                    onChange={e => setForm({ ...form, preOpInstructionsUz: e.target.value })}
                    placeholder="Bemor operatsiyadan oldin nima qilishi kerak..."
                    rows={6}
                    required
                />
            </div>

            <div className="ca-form-row">
                <div className="ca-form-group">
                    <label>Och qorin (soat)</label>
                    <input
                        type="number"
                        value={form.preOpFastingHours ?? ''}
                        onChange={e => setForm({ ...form, preOpFastingHours: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="8"
                        min="0"
                    />
                </div>
                <div className="ca-form-group">
                    <label>Dori-darmonlarni to'xtatish</label>
                    <input
                        type="text"
                        value={form.preOpMedicationStop}
                        onChange={e => setForm({ ...form, preOpMedicationStop: e.target.value })}
                        placeholder="Aspirin, antikoagulyantlar..."
                    />
                </div>
            </div>

            <div className="ca-form-group">
                <label>Kerakli tahlillar</label>
                <textarea
                    value={form.preOpTestsRequired}
                    onChange={e => setForm({ ...form, preOpTestsRequired: e.target.value })}
                    placeholder="Qon tahlili, EKG, rentgen..."
                    rows={3}
                />
            </div>
        </div>
    );
}

function RecoveryTab({ form, setForm }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ca-form-group">
                <label>Operatsiyadan keyin rejim <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                    value={form.postOpInstructionsUz}
                    onChange={e => setForm({ ...form, postOpInstructionsUz: e.target.value })}
                    placeholder="Bemor operatsiyadan keyin qanday parhez qilishi, nimalarga e'tibor berishi kerak..."
                    rows={6}
                    required
                />
            </div>

            <div className="ca-form-group">
                <label>Ovqatlanish rejimi</label>
                <textarea
                    value={form.postOpDietUz}
                    onChange={e => setForm({ ...form, postOpDietUz: e.target.value })}
                    placeholder="Ruxsat etilgan va taqiqlangan ovqatlar..."
                    rows={3}
                />
            </div>

            <div className="ca-form-group">
                <label>Faoliyat cheklovlari</label>
                <textarea
                    value={form.postOpActivityRestrictions}
                    onChange={e => setForm({ ...form, postOpActivityRestrictions: e.target.value })}
                    placeholder="Jismoniy mashqlar, og'irlik ko'tarish, haydash..."
                    rows={3}
                />
            </div>

            <div className="ca-form-group">
                <label>Nazorat ko'rigidan keyin (kun)</label>
                <input
                    type="number"
                    value={form.postOpFollowUpDays ?? ''}
                    onChange={e => setForm({ ...form, postOpFollowUpDays: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="7"
                    min="1"
                />
                <span className="ca-hint">Bemor qachon nazoratga kelishi kerak</span>
            </div>
        </div>
    );
}

// Props match ServiceCustomizationDrawer: open, onClose, service, activateMode, onSaveAndActivate
export default function SurgeryCustomizationDrawer({
    open, onClose, service,
    activateMode = false,
    onSaveAndActivate,
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [priceError, setPriceError] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [activating, setActivating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const clinicServiceId = service?.clinicService?.id;
    const { data: existing, isLoading } = useSurgeryCustomization(
        activateMode ? null : clinicServiceId,
        { enabled: open && !activateMode && !!clinicServiceId },
    );
    const upsertMut = useUpsertSurgeryCustomization();
    const deleteMut = useDeleteSurgeryCustomization();

    useEffect(() => {
        if (!open) { setActiveTab(0); setForm({ ...EMPTY_FORM }); setPriceError(false); setSaveError(null); setActivating(false); return; }
        if (existing) setForm({ ...EMPTY_FORM, ...existing });
        else if (!isLoading) setForm({ ...EMPTY_FORM });
    }, [existing, open, isLoading]);

    const handleSave = async () => {
        if (activateMode) {
            if (!form.customPrice || form.customPrice <= 0) { setPriceError(true); setActiveTab(0); return; }
            setPriceError(false);
            setActivating(true);
            try { await onSaveAndActivate(service.id, form); }
            finally { setActivating(false); }
            return;
        }
        if (!clinicServiceId) return;
        setSaveError(null);
        try {
            await upsertMut.mutateAsync({ surgeryId: clinicServiceId, data: form });
            onClose();
        } catch (err) {
            setSaveError(err?.response?.data?.message || 'Saqlashda xatolik yuz berdi');
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
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="ca-drawer"
                        style={{ width: 680, maxWidth: '92vw' }}
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.28 }}
                    >
                        {/* Header */}
                        <div className="ca-drawer-header">
                            <div>
                                <span className="ca-drawer-title">
                                    {activateMode ? 'Aktivlashtirish' : 'Operatsiyani moslashtirish'}
                                </span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {service.nameUz}
                                </div>
                            </div>
                            <button className="ca-drawer-close" onClick={onClose}><X size={20} /></button>
                        </div>

                        {/* Activate banner */}
                        {activateMode && (
                            <div style={{
                                margin: '0 20px', padding: '10px 14px',
                                background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.25)',
                                borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{ fontSize: 18 }}>💡</span>
                                <span>Operatsiyani aktivlashtirish uchun <strong style={{ color: 'var(--color-primary)' }}>Narx</strong> va asosiy ma'lumotlarni kiriting.</span>
                            </div>
                        )}

                        {/* Price error */}
                        {priceError && (
                            <div style={{
                                margin: '8px 20px 0', padding: '8px 14px',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8, fontSize: 13, color: '#ef4444',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>⚠️</span>
                                <span><strong>Narx</strong> kiritilishi shart!</span>
                            </div>
                        )}

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
                                <div className="ca-loading"><Loader2 size={28} className="ca-spin" /><span>Yuklanmoqda...</span></div>
                            ) : (
                                <>
                                    {activeTab === 0 && <BasicTab form={form} setForm={setForm} baseService={service} />}
                                    {activeTab === 1 && <DescriptionTab form={form} setForm={setForm} />}
                                    {activeTab === 2 && <PreparationTab form={form} setForm={setForm} />}
                                    {activeTab === 3 && <RecoveryTab form={form} setForm={setForm} />}
                                </>
                            )}
                        </div>

                        {/* Save error */}
                        {saveError && (
                            <div style={{
                                margin: '0 20px 8px', padding: '10px 14px',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8, fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span>⚠️</span><span>{saveError}</span>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="ca-drawer-footer">
                            {existing && !activateMode && activeTab === 0 && (
                                <button className="ca-btn-danger" style={{ marginRight: 'auto' }} onClick={() => setShowDeleteConfirm(true)}>
                                    <Trash2 size={14} /> O&#39;chirish
                                </button>
                            )}
                            {activeTab > 0 && (
                                <button className="ca-btn-secondary" onClick={() => setActiveTab(activeTab - 1)} style={{ marginRight: 'auto' }}>
                                    ← Orqaga
                                </button>
                            )}
                            <button className="ca-btn-secondary" onClick={onClose}>Bekor qilish</button>
                            {activeTab < TABS.length - 1 ? (
                                <button className="ca-btn-primary" onClick={() => setActiveTab(activeTab + 1)}>
                                    Keyingisi →
                                </button>
                            ) : (
                                <button className="ca-btn-primary" onClick={handleSave} disabled={upsertMut.isPending || activating}>
                                    {(upsertMut.isPending || activating) ? <Loader2 size={15} className="ca-spin" /> : <Save size={15} />}
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
                                <div className="ca-dialog-desc">Barcha sozlamalar o&#39;chiriladi. Xizmat asosiy ma&#39;lumotlariga qaytadi.</div>
                                <div className="ca-dialog-actions">
                                    <button className="ca-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Bekor</button>
                                    <button className="ca-btn-danger" onClick={handleDelete} disabled={deleteMut.isPending}>
                                        {deleteMut.isPending ? <Loader2 size={14} className="ca-spin" /> : null} O&#39;chirish
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
