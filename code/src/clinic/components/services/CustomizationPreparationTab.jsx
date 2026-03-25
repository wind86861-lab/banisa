import { ClipboardList, AlertTriangle, Clock, Calendar, FileText } from 'lucide-react';

export default function CustomizationPreparationTab({ formData, setFormData, service }) {
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePrepJsonChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            preparationJson: {
                ...(prev.preparationJson || {}),
                [field]: value
            }
        }));
    };

    const handleBookingPolicyChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            bookingPolicy: {
                ...(prev.bookingPolicy || {}),
                [field]: value
            }
        }));
    };

    const prep = formData.preparationJson || {};
    const booking = formData.bookingPolicy || {};

    return (
        <div className="customization-tab-content">
            <div className="tab-section">
                <div className="section-header">
                    <ClipboardList size={20} />
                    <div>
                        <h3>Tayyorgarlik ko'rsatmalari</h3>
                        <p className="section-desc">Bemorlar sizning klinikangizga qanday tayyorlanishi kerak</p>
                    </div>
                </div>

                <div className="form-group">
                    <label>Umumiy tayyorgarlik (matn)</label>
                    <small className="field-hint">Umumiy ko'rsatmalar va tavsiyalar</small>
                    <textarea
                        rows={3}
                        placeholder="Tahlilga och qoringa kelish tavsiya etiladi. Oxirgi ovqatlanishdan keyin kamida 8 soat o'tishi kerak..."
                        value={formData.preparationUz || ''}
                        onChange={(e) => handleChange('preparationUz', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label><AlertTriangle size={16} /> Och qorin (soat)</label>
                    <small className="field-hint">Necha soat ovqatlanmaslik kerak</small>
                    <input
                        type="number"
                        min="0"
                        max="24"
                        placeholder="8"
                        value={prep.fastingHours || ''}
                        onChange={(e) => handlePrepJsonChange('fastingHours', e.target.value ? parseInt(e.target.value) : null)}
                    />
                </div>

                <div className="form-group row">
                    <div className="col">
                        <label><Clock size={16} /> Eng yaxshi vaqt</label>
                        <small className="field-hint">Qachon kelish yaxshiroq</small>
                        <input
                            type="text"
                            placeholder="Ertalab 8:00-10:00"
                            value={prep.bestTime || ''}
                            onChange={(e) => handlePrepJsonChange('bestTime', e.target.value)}
                        />
                    </div>
                    <div className="col">
                        <label>Maxsus dieta</label>
                        <small className="field-hint">Ovqatlanish bo'yicha cheklovlar</small>
                        <input
                            type="text"
                            placeholder="Yog'li ovqat iste'mol qilmaslik"
                            value={prep.specialDiet || ''}
                            onChange={(e) => handlePrepJsonChange('specialDiet', e.target.value)}
                        />
                    </div>
                </div>


                <div className="form-group">
                    <label><FileText size={16} /> Olib kelish kerak bo'lgan hujjatlar</label>
                    <small className="field-hint">Qanday hujjatlar kerak</small>
                    <input
                        type="text"
                        placeholder="Pasport, tibbiy polisa, oldingi tahlillar (agar mavjud bo'lsa)"
                        value={prep.documents || ''}
                        onChange={(e) => handlePrepJsonChange('documents', e.target.value)}
                    />
                </div>

            </div>

            <div className="tab-section">
                <div className="section-header">
                    <Calendar size={20} />
                    <div>
                        <h3>Buyurtma siyosati</h3>
                        <p className="section-desc">Sizning klinikangizda qabulga yozilish va bekor qilish qoidalari</p>
                    </div>
                </div>

                <div className="form-group">
                    <label>Oldindan to'lov kerakmi?</label>
                    <select
                        value={booking.prepaymentRequired ? 'yes' : 'no'}
                        onChange={(e) => handleBookingPolicyChange('prepaymentRequired', e.target.value === 'yes')}
                    >
                        <option value="no">Yo'q, kerak emas</option>
                        <option value="yes">Ha, kerak</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Bekor qilish shartlari</label>
                    <small className="field-hint">Qabulni bekor qilish qoidalari</small>
                    <input
                        type="text"
                        placeholder="24 soat oldin bepul bekor qilish mumkin"
                        value={booking.cancellationPolicy || ''}
                        onChange={(e) => handleBookingPolicyChange('cancellationPolicy', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>O'zgartirish shartlari</label>
                    <small className="field-hint">Qabulni o'zgartirish qoidalari</small>
                    <input
                        type="text"
                        placeholder="12 soat oldin o'zgartirish mumkin"
                        value={booking.modificationPolicy || ''}
                        onChange={(e) => handleBookingPolicyChange('modificationPolicy', e.target.value)}
                    />
                </div>
            </div>

            <div className="info-box">
                <strong>💡 Maslahat:</strong> Aniq va tushunarli ko'rsatmalar bemorlarning to'g'ri tayyorlanishiga yordam beradi
                va tahlil natijalarining aniqligini oshiradi. Barcha muhim cheklovlarni ko'rsating.
            </div>
        </div>
    );
}
