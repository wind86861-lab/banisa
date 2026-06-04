import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Phone,
    Eye, EyeOff, Loader2, ShieldCheck, KeyRound, FlaskConical, Power,
    Copy, AlertTriangle, MessageCircle,
} from 'lucide-react';
import api from '../../../../shared/api/axios';

const STEPS = ['Shartnoma', 'Kalit', 'Tekshirish', 'Yoqish'];

function StepIndicator({ current }) {
    return (
        <div className="pay-wiz__steps">
            {STEPS.map((label, idx) => {
                const isActive = idx === current;
                const isDone = idx < current;
                return (
                    <div
                        key={label}
                        className={`pay-wiz__step ${isActive ? 'pay-wiz__step--active' : ''} ${
                            isDone ? 'pay-wiz__step--done' : ''
                        }`}
                    >
                        <span className="pay-wiz__dot">
                            {isDone ? <CheckCircle2 size={11} /> : idx + 1}
                        </span>
                        {label}
                    </div>
                );
            })}
        </div>
    );
}

function MaskedInput({ value, onChange, placeholder, label, hint }) {
    const [show, setShow] = useState(false);
    return (
        <div className="pay-field">
            <label className="pay-field__label">{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    type={show ? 'text' : 'password'}
                    className="pay-field__input pay-field__input--mono"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    style={{
                        position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
                        background: 'transparent', border: 0, cursor: 'pointer', color: '#64748b',
                        padding: 6, borderRadius: 6,
                    }}
                    aria-label={show ? 'Yashirish' : "Ko'rsatish"}
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {hint && <div className="pay-field__hint">{hint}</div>}
        </div>
    );
}

export default function PaymeOnboardingWizard({ webhookUrl, initialConfig, onCancel, onSaved }) {
    const isRotation = !!initialConfig;
    const [step, setStep] = useState(isRotation ? 1 : 0);
    const [merchantId, setMerchantId] = useState(initialConfig?.merchantId || '');
    const [prodKey, setProdKey] = useState('');
    const [testKey, setTestKey] = useState('');
    const [isTestMode, setIsTestMode] = useState(initialConfig?.isTestMode ?? true);
    const [activate, setActivate] = useState(initialConfig?.isActive ?? true);
    const [copied, setCopied] = useState(false);

    const save = useMutation({
        mutationFn: async () => {
            const { data } = await api.put('/clinic/payments/payme/config', {
                merchantId: merchantId.trim(),
                prodKey: prodKey.trim(),
                testKey: testKey.trim() || null,
                isTestMode,
            });
            if (activate) {
                await api.patch('/clinic/payments/payme/config/active', { isActive: true });
            }
            return data;
        },
        onSuccess: onSaved,
    });

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    };

    const canGoNext = () => {
        if (step === 0) return true;
        if (step === 1) return merchantId.trim().length >= 3 && prodKey.trim().length >= 8;
        if (step === 2) return true;
        return true;
    };

    return (
        <div className="pay-wiz">
            <StepIndicator current={step} />

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22 }}
                >
                    {step === 0 && (
                        <>
                            <h2 className="pay-wiz__title">Payme bilan shartnoma</h2>
                            <p className="pay-wiz__sub">
                                Har klinika alohida Payme merchant sifatida ro'yxatdan o'tishi kerak.
                                Biz vositachi emas — to'lovlar to'g'ridan-to'g'ri sizning kabinetingizga keladi.
                            </p>

                            <button className="pay-wiz__option" onClick={() => setStep(1)}>
                                <div className="pay-wiz__option-title">
                                    <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#10b981' }} />
                                    Ha, mening kabinetim bor
                                </div>
                                <div className="pay-wiz__option-sub">
                                    merchantId va secret key kabinetdan tayyor — keyingi qadamga o'taman
                                </div>
                            </button>

                            <div className="pay-wiz__option" style={{ cursor: 'default' }}>
                                <div className="pay-wiz__option-title">
                                    <Phone size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#6366f1' }} />
                                    Yo'q, qanday tuzaman?
                                </div>
                                <div className="pay-wiz__option-sub" style={{ marginBottom: 12 }}>
                                    Banisa jamoasi sizga yordam beradi — Payme bilan shartnoma tuzish jarayonini
                                    boshidan oxirigacha kuzatib boramiz. Biz bilan bog'laning:
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <a
                                        href="tel:+998711234567"
                                        className="pay-btn pay-btn--primary"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <Phone size={14} /> +998 71 123 45 67
                                    </a>
                                    <a
                                        href="https://t.me/banisa_uz"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="pay-btn"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <MessageCircle size={14} /> Telegram'da yozish
                                    </a>
                                </div>
                            </div>

                            <div className="pay-wiz__actions">
                                <button className="pay-btn pay-btn--ghost" onClick={onCancel}>
                                    Bekor qilish
                                </button>
                                <div />
                            </div>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <h2 className="pay-wiz__title">
                                <KeyRound size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                                {isRotation ? 'Kalitlarni yangilash' : 'Kalit kiritish'}
                            </h2>
                            <p className="pay-wiz__sub">
                                Payme kabinetdan olingan merchant ID va secret kalitni kiriting.
                                Kalitlar AES-256 shifrlanib saqlanadi.
                            </p>

                            <div className="pay-field">
                                <label className="pay-field__label">Merchant ID</label>
                                <input
                                    className="pay-field__input pay-field__input--mono"
                                    value={merchantId}
                                    onChange={(e) => setMerchantId(e.target.value)}
                                    placeholder="65abc1234567890def123456"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <div className="pay-field__hint">Payme kabinet → Sozlamalar → Merchant ID</div>
                            </div>

                            <MaskedInput
                                label="Production secret key"
                                value={prodKey}
                                onChange={setProdKey}
                                placeholder="••••••••••••••••"
                                hint={isRotation
                                    ? 'Yangi kalitni kiriting — eski kalit avtomatik o\'chadi'
                                    : 'Payme kabinet → Sozlamalar → Test/Live kalit'}
                            />

                            <MaskedInput
                                label="Test secret key (ixtiyoriy)"
                                value={testKey}
                                onChange={setTestKey}
                                placeholder="••••••••••••••••"
                                hint="Test rejimda Payme sandbox API'si bilan ishlashga imkon beradi"
                            />

                            <div className="pay-wiz__actions">
                                <button className="pay-btn pay-btn--ghost" onClick={() => setStep(0)}>
                                    <ArrowLeft size={14} /> Orqaga
                                </button>
                                <button
                                    className="pay-btn pay-btn--primary"
                                    onClick={() => setStep(2)}
                                    disabled={!canGoNext()}
                                >
                                    Davom <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="pay-wiz__title">
                                <FlaskConical size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                                Rejim tanlash
                            </h2>
                            <p className="pay-wiz__sub">
                                Boshlash uchun qaysi rejim? Live rejimda real bemorlardan pul yechiladi.
                            </p>

                            <button
                                className="pay-wiz__option"
                                onClick={() => setIsTestMode(true)}
                                style={isTestMode ? { borderColor: '#06b6d4', background: 'rgba(6,182,212,0.04)' } : undefined}
                            >
                                <div className="pay-wiz__option-title">
                                    <FlaskConical size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#fbbf24' }} />
                                    Test (sandbox) — tavsiya
                                </div>
                                <div className="pay-wiz__option-sub">
                                    Avval test tranzaksiyalar bilan tekshirib ko'rasiz. Real pul yechilmaydi.
                                </div>
                            </button>

                            <button
                                className="pay-wiz__option"
                                onClick={() => setIsTestMode(false)}
                                style={!isTestMode ? { borderColor: '#06b6d4', background: 'rgba(6,182,212,0.04)' } : undefined}
                            >
                                <div className="pay-wiz__option-title">
                                    <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#10b981' }} />
                                    Live — to'g'ridan-to'g'ri ishga tushirish
                                </div>
                                <div className="pay-wiz__option-sub">
                                    Real bemorlar darrov to'lay oladi. Kalit to'g'ri ekanligiga ishonchingiz komil bo'lsa.
                                </div>
                            </button>

                            <div className="pay-key-warn" style={{ marginTop: 16 }}>
                                <AlertTriangle size={14} />
                                Webhook URL'ni Payme kabinetiga joylashni unutmang — pastdagi qadamda ko'rsatamiz
                            </div>

                            <div className="pay-wiz__actions">
                                <button className="pay-btn pay-btn--ghost" onClick={() => setStep(1)}>
                                    <ArrowLeft size={14} /> Orqaga
                                </button>
                                <button className="pay-btn pay-btn--primary" onClick={() => setStep(3)}>
                                    Davom <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 className="pay-wiz__title">
                                <Power size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                                Yoqish va webhook URL
                            </h2>
                            <p className="pay-wiz__sub">
                                Quyidagi URL'ni Payme bilan shartnoma tuzgan masul xodimga yuboring —
                                ular sizning kabinetingizga webhook URL'ni ulab beradi.
                            </p>

                            <div className="pay-card" style={{ marginBottom: 16 }}>
                                <div className="pay-url-row">
                                    <div className="pay-url-input" title={webhookUrl}>{webhookUrl}</div>
                                    <button className="pay-btn pay-btn--primary" onClick={copyUrl}>
                                        {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                        {copied ? 'Nusxalandi' : 'Nusxa'}
                                    </button>
                                </div>
                            </div>

                            <label className="pay-wiz__option" style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <input
                                    type="checkbox"
                                    checked={activate}
                                    onChange={(e) => setActivate(e.target.checked)}
                                    style={{ marginTop: 4, width: 18, height: 18, accentColor: '#06b6d4' }}
                                />
                                <div>
                                    <div className="pay-wiz__option-title">
                                        Saqlash bilan birga yoqish
                                    </div>
                                    <div className="pay-wiz__option-sub">
                                        {isTestMode
                                            ? "Test rejimda yoqiladi — bemorlar Payme tugmasini ko'radi, lekin real pul yechilmaydi."
                                            : "LIVE rejimda yoqiladi — bemorlar real to'lov qiladi."}
                                    </div>
                                </div>
                            </label>

                            {save.isError && (
                                <div className="pay-key-warn" style={{ marginTop: 12 }}>
                                    <AlertTriangle size={14} />
                                    Saqlashda xato: {save.error?.response?.data?.message || save.error?.message}
                                </div>
                            )}

                            <div className="pay-wiz__actions">
                                <button className="pay-btn pay-btn--ghost" onClick={() => setStep(2)}>
                                    <ArrowLeft size={14} /> Orqaga
                                </button>
                                <button
                                    className="pay-btn pay-btn--primary"
                                    onClick={() => save.mutate()}
                                    disabled={save.isPending}
                                >
                                    {save.isPending
                                        ? <><Loader2 size={14} className="spin" /> Saqlanmoqda…</>
                                        : <><Sparkles size={14} /> {isRotation ? 'Yangilash' : 'Yoqish'}</>}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
