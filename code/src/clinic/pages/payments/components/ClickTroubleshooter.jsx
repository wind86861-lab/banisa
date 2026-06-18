import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench } from 'lucide-react';

const FIX_MAP = {
    [-1]: {
        title: 'SIGN CHECK FAILED — imzo mos kelmadi',
        cause: 'CLICK yuborgan sign_string bizning kalit bilan hisoblangan MD5 imzoga mos emas.',
        fix: 'CLICK kabinetdagi secret_key bilan bizdagi kalit bir xil bo\'lishi kerak — "Kalitlarni yangilash" tugmasini bosing.',
    },
    [-2]: {
        title: 'Noto\'g\'ri summa',
        cause: 'CLICK yuborgan summa bron summasiga mos kelmadi (1 so\'m chegarasidan tashqarida).',
        fix: 'Mijoz noto\'g\'ri summa kiritgan bo\'lishi mumkin — log\'dan summalarni solishtiring.',
    },
    [-3]: {
        title: 'Action topilmadi',
        cause: 'CLICK noma\'lum action yubordi (0=Prepare, 1=Complete kutilgan).',
        fix: 'Bu odatda CLICK tomonidagi versiya muammosi — qo\'llab-quvvatlovchiga murojaat qiling.',
    },
    [-4]: {
        title: 'Allaqachon to\'langan',
        cause: 'Bu buyurtma uchun to\'lov ilgari muvaffaqiyatli yakunlangan.',
        fix: 'Bemorga yangi buyurtma yarating yoki tasdiqlash xabarini tekshiring — odatda bu zararsiz.',
    },
    [-5]: {
        title: 'Foydalanuvchi topilmadi',
        cause: 'merchant_trans_id (appointment ID) DB\'da topilmadi yoki boshqa klinikaga tegishli.',
        fix: 'Bemor URL\'ni noto\'g\'ri ishlatgan yoki bron o\'chirilgan. Yangi to\'lov havolasini yuboring.',
    },
    [-6]: {
        title: 'Tranzaksiya topilmadi',
        cause: 'CLICK so\'rayotgan tranzaksiya bizda yo\'q (Prepare bosqichini o\'tmagan).',
        fix: 'Bemor sahifani yangilab qayta urinib ko\'rsin.',
    },
    [-8]: {
        title: 'CLICK so\'rovida xato',
        cause: 'CLICK yuborgan so\'rovda majburiy maydonlar yetishmadi.',
        fix: 'Odatda CLICK tomonidagi nosozlik — qo\'llab-quvvatlovchiga murojaat qiling.',
    },
    [-9]: {
        title: 'Tranzaksiya bekor qilindi',
        cause: 'CLICK to\'lovni bekor qildi yoki bemor to\'lash oynasidan chiqib ketdi.',
        fix: 'Bemorga qayta urinib ko\'rishni taklif qiling.',
    },
};

export default function ClickTroubleshooter({ errorCode, errorMsg }) {
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
