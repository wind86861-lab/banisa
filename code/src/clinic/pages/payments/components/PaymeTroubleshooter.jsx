import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench } from 'lucide-react';

// Payme JSON-RPC error code → plain-language explanation + suggested fix.
const FIX_MAP = {
    [-32504]: {
        title: 'Unauthorized — kalit mos kelmadi',
        cause: 'Payme yuborgan parol DB\'dagi kalitga mos kelmadi.',
        fix: 'Payme kabinetdan secret kalitni qaytadan oling va "Kalitlarni yangilash" tugmasini bosing.',
    },
    [-32601]: {
        title: 'Method not found',
        cause: 'Payme noma\'lum metod yubordi (mumkin: noto\'g\'ri version).',
        fix: 'Payme tomonidagi versiyani tekshiring; agar takrorlansa qo\'llab-quvvatlovchiga murojaat qiling.',
    },
    [-31001]: {
        title: 'Invalid amount — summa noto\'g\'ri',
        cause: 'Bemor to\'layotgan summa bron summasiga mos kelmadi.',
        fix: 'Bu odatda Payme tomonidan boshqa summa yuborilganda yuz beradi — log\'dan summalarni solishtiring.',
    },
    [-31050]: {
        title: 'Order not found — buyurtma topilmadi',
        cause: 'order_id DB\'da topilmadi yoki boshqa klinikaga tegishli.',
        fix: 'Bemor URL\'ni noto\'g\'ri ishlatgan yoki order o\'chirilgan. Bemorga yangi to\'lov havolasini yuboring.',
    },
    [-31003]: {
        title: 'Transaction not found',
        cause: 'Payme so\'rayotgan tranzaksiya DB\'da yo\'q.',
        fix: 'Bu odatda Payme retry urinishi paytida bo\'ladi — birinchi javob yetib bormagan bo\'lishi mumkin. Agar takrorlansa Payme bilan bog\'laning.',
    },
    [-31008]: {
        title: 'Unable to perform',
        cause: 'Tranzaksiya holati noto\'g\'ri (allaqachon yakunlangan/bekor qilingan).',
        fix: 'Bemor sahifani yangilab qayta urinib ko\'rsin.',
    },
    [-31099]: {
        title: 'Order is busy — buyurtma band',
        cause: 'Shu buyurtma uchun boshqa tranzaksiya allaqachon ochilgan.',
        fix: 'Oldingi tranzaksiyani yakunlash yoki bekor qilishni kuting (15 daqiqa), keyin qayta urining.',
    },
    [-32400]: {
        title: 'Internal system error',
        cause: 'Bizning tomonimizda kutilmagan xato — log\'lar ko\'rib chiqilmoqda.',
        fix: 'Agar takrorlansa tizim ma\'muriga murojaat qiling.',
    },
};

export default function PaymeTroubleshooter({ errorCode, errorMsg }) {
    const [open, setOpen] = useState(false);
    const fix = FIX_MAP[errorCode];

    if (!fix) {
        return (
            <div className="pay-log__err">
                <strong>Xato:</strong> {errorMsg || `code ${errorCode}`}
            </div>
        );
    }

    return (
        <div className="pay-log__err" style={{ background: 'rgba(239,68,68,0.06)' }}>
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    background: 'transparent', border: 0, color: '#b91c1c',
                    padding: 0, font: 'inherit', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700,
                }}
            >
                <Wrench size={12} /> {fix.title}
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {open && (
                <div style={{ marginTop: 6, fontWeight: 400, color: '#7f1d1d' }}>
                    <div style={{ marginBottom: 4 }}><strong>Sabab:</strong> {fix.cause}</div>
                    <div><strong>Yechim:</strong> {fix.fix}</div>
                </div>
            )}
        </div>
    );
}
