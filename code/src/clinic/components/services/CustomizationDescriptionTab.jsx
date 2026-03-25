import { FileText, FlaskConical } from 'lucide-react';

export default function CustomizationDescriptionTab({ formData, setFormData, service }) {
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="customization-tab-content">
            <div className="tab-section">
                <div className="section-header">
                    <FileText size={20} />
                    <div>
                        <h3>To'liq tavsif</h3>
                        <p className="section-desc">Sizning klinikangizda bu xizmat qanday amalga oshirilishini batafsil yozing</p>
                    </div>
                </div>

                <div className="form-group">
                    <label>To'liq tavsif (O'zbekcha) *</label>
                    <small className="field-hint">
                        Sizning klinikangizda bu xizmat qanday o'tishini, qanday uskunalar ishlatilishini,
                        natijalar qanday taqdim etilishini batafsil yozing.
                    </small>
                    <textarea
                        rows={6}
                        placeholder="Bizning klinikamizda qon umumiy tahlili zamonaviy Siemens Atellica analizatori yordamida amalga oshiriladi. Tahlil jarayoni 15 daqiqa davom etadi. Natijalar 2 soat ichida tayyor bo'ladi va SMS orqali xabar beriladi. Natijalarni online kabinetdan yuklab olish yoki klinikadan qog'oz shaklida olish mumkin..."
                        value={formData.fullDescriptionUz || ''}
                        onChange={(e) => handleChange('fullDescriptionUz', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>To'liq tavsif (Ruscha)</label>
                    <textarea
                        rows={6}
                        placeholder="В нашей клинике общий анализ крови выполняется на современном анализаторе Siemens Atellica..."
                        value={formData.fullDescriptionRu || ''}
                        onChange={(e) => handleChange('fullDescriptionRu', e.target.value)}
                    />
                </div>
            </div>

            <div className="tab-section">
                <div className="section-header">
                    <FlaskConical size={20} />
                    <div>
                        <h3>Jarayon tavsifi</h3>
                        <p className="section-desc">Sizning klinikangizda jarayon qanday bosqichlardan iborat</p>
                    </div>
                </div>

                <div className="form-group">
                    <label>Jarayon tavsifi (qadamma-qadam)</label>
                    <small className="field-hint">
                        Bemor klinikaga kelganidan boshlab natija olguncha bo'lgan jarayonni bosqichma-bosqich yozing.
                    </small>
                    <textarea
                        rows={5}
                        placeholder="1. Bemor ro'yxatdan o'tadi va navbat raqamini oladi&#10;2. Tibbiy hamshira qo'ldan venoz qon oladi (5 ml)&#10;3. Qon namunasi laboratoriyaga yuboriladi&#10;4. Avtomatik analizator barcha ko'rsatkichlarni tekshiradi&#10;5. Natijalar shifokor tomonidan tekshiriladi&#10;6. Natijalar SMS orqali xabar qilinadi&#10;7. Natijalarni online kabinetdan yoki klinikadan olish mumkin"
                        value={formData.processDescription || ''}
                        onChange={(e) => handleChange('processDescription', e.target.value)}
                    />
                </div>
            </div>

            <div className="info-box">
                <strong>💡 Maslahat:</strong> Qanchalik batafsil va aniq yozsangiz, bemorlar uchun shunchalik tushunarli bo'ladi.
                Sizning klinikangizning afzalliklarini (tez natija, zamonaviy uskunalar, tajribali mutaxassislar) ta'kidlang.
            </div>
        </div>
    );
}
