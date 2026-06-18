import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FlaskConical, ShieldCheck, X } from 'lucide-react';

export default function ClickModeSwitchModal({ open, currentIsTest, onClose, onConfirm }) {
    const goingLive = currentIsTest;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
                        backdropFilter: 'blur(4px)', zIndex: 1100,
                        display: 'grid', placeItems: 'center', padding: 20,
                    }}
                >
                    <motion.div
                        initial={{ y: 20, scale: 0.96, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{ y: 20, scale: 0.96, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 20, padding: 24,
                            maxWidth: 460, width: '100%',
                            boxShadow: '0 30px 80px rgba(15,23,42,0.3)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div
                                style={{
                                    width: 52, height: 52, borderRadius: 14,
                                    display: 'grid', placeItems: 'center',
                                    background: goingLive ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.14)',
                                    color: goingLive ? '#10b981' : '#d97706',
                                }}
                            >
                                {goingLive ? <ShieldCheck size={24} /> : <FlaskConical size={24} />}
                            </div>
                            <button
                                onClick={onClose}
                                style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#94a3b8', padding: 6 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                            {goingLive ? "LIVE rejimga o'tasizmi?" : "Test rejimga o'tasizmi?"}
                        </h3>

                        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                            {goingLive
                                ? "Bundan keyin bemorlar real pul to'laydi. CLICK kabinetidagi LIVE service_id ishlatiladi."
                                : "Bundan keyin bemorlar CLICK tugmasini bossa CLICK sandbox'iga uzatiladi. Real pul yechilmaydi."}
                        </p>

                        {goingLive && (
                            <div className="pay-key-warn" style={{ marginBottom: 16 }}>
                                <AlertTriangle size={14} />
                                Avval test rejimda bir nechta sinov o'tkazganingizga ishonchingiz komilmi?
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="pay-btn pay-btn--ghost" onClick={onClose}>
                                Bekor
                            </button>
                            <button
                                className={`pay-btn ${goingLive ? 'pay-btn--primary' : ''}`}
                                onClick={onConfirm}
                                style={!goingLive ? { background: '#fbbf24', color: '#78350f', borderColor: 'transparent' } : undefined}
                            >
                                {goingLive ? "Ha, LIVE'ga o'tish" : "Ha, Test'ga o'tish"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
