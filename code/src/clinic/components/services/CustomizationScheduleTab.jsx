import { Plus, X } from 'lucide-react';
import '../../pages/clinic-admin.css';

const DAYS = [
    { value: 'monday',    label: 'Dushanba' },
    { value: 'tuesday',   label: 'Seshanba' },
    { value: 'wednesday', label: 'Chorshanba' },
    { value: 'thursday',  label: 'Payshanba' },
    { value: 'friday',    label: 'Juma' },
    { value: 'saturday',  label: 'Shanba' },
    { value: 'sunday',    label: 'Yakshanba' },
];

export default function CustomizationScheduleTab({ formData, setFormData }) {
    const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

    const toggleDay = (day) => {
        const days = [...(formData.availableDays || [])];
        const idx = days.indexOf(day);
        if (idx >= 0) {
            days.splice(idx, 1);
            // Also remove time slots for this day
            const slots = { ...(formData.availableTimeSlots || {}) };
            delete slots[day];
            setFormData(prev => ({ ...prev, availableDays: days, availableTimeSlots: slots }));
        } else {
            days.push(day);
            set('availableDays', days);
        }
    };

    // Time slots management
    const addSlot = (day) => {
        const slots = { ...(formData.availableTimeSlots || {}) };
        const daySlots = [...(slots[day] || [])];
        daySlots.push({ start: '09:00', end: '17:00' });
        slots[day] = daySlots;
        set('availableTimeSlots', slots);
    };

    const updateSlot = (day, index, field, value) => {
        const slots = { ...(formData.availableTimeSlots || {}) };
        const daySlots = [...(slots[day] || [])];
        daySlots[index] = { ...daySlots[index], [field]: value };
        slots[day] = daySlots;
        set('availableTimeSlots', slots);
    };

    const removeSlot = (day, index) => {
        const slots = { ...(formData.availableTimeSlots || {}) };
        const daySlots = (slots[day] || []).filter((_, i) => i !== index);
        if (daySlots.length === 0) {
            delete slots[day];
        } else {
            slots[day] = daySlots;
        }
        set('availableTimeSlots', slots);
    };

    const activeDays = formData.availableDays || [];
    const timeSlots = formData.availableTimeSlots || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Available Days */}
            <div className="ca-form-group">
                <label className="ca-label">Xizmat mavjud kunlar</label>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                    Bu xizmat qaysi kunlari taklif etilishini belgilang
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {DAYS.map(d => {
                        const isActive = activeDays.includes(d.value);
                        return (
                            <button
                                key={d.value}
                                type="button"
                                onClick={() => toggleDay(d.value)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                    background: isActive ? 'rgba(0,201,167,0.1)' : 'transparent',
                                    color: isActive ? 'var(--color-primary)' : 'var(--text-main)',
                                    fontSize: 13,
                                    fontWeight: isActive ? 600 : 400,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {d.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slots per Day */}
            {activeDays.length > 0 && (
                <div className="ca-form-group">
                    <label className="ca-label">Vaqt oraliklari</label>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                        Har bir kun uchun ish vaqtini belgilang
                    </p>

                    {DAYS.filter(d => activeDays.includes(d.value)).map(d => (
                        <div
                            key={d.value}
                            style={{
                                marginBottom: 14,
                                padding: 14,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: (timeSlots[d.value]?.length > 0) ? 10 : 0,
                            }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{d.label}</span>
                                <button
                                    type="button"
                                    className="ca-btn-secondary"
                                    style={{ fontSize: 11, padding: '3px 10px' }}
                                    onClick={() => addSlot(d.value)}
                                >
                                    <Plus size={12} /> Vaqt
                                </button>
                            </div>

                            {(timeSlots[d.value] || []).map((slot, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                    <input
                                        type="time"
                                        value={slot.start}
                                        onChange={e => updateSlot(d.value, i, 'start', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                    <input
                                        type="time"
                                        value={slot.end}
                                        onChange={e => updateSlot(d.value, i, 'end', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        className="ca-icon-btn danger"
                                        onClick={() => removeSlot(d.value, i)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                            {(!timeSlots[d.value] || timeSlots[d.value].length === 0) && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Vaqt oraligi belgilanmagan
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeDays.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: 24,
                    color: 'var(--text-muted)',
                    fontSize: 13,
                }}>
                    Avval mavjud kunlarni tanlang
                </div>
            )}
        </div>
    );
}
