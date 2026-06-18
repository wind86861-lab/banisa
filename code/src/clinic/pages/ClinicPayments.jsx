import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Lock, Sparkles } from 'lucide-react';
import PaymeTab from './payments/PaymeTab';
import ClickTab from './payments/ClickTab';
import './payments/clinic-payments.css';

const PROVIDERS = [
    {
        key: 'payme',
        label: 'Payme',
        logo: '/images/payme-logo.svg',
        accent: '#00bbe2',
        status: 'available',
        component: PaymeTab,
    },
    {
        key: 'click',
        label: 'Click',
        accent: '#0078d4',
        status: 'available',
        component: ClickTab,
    },
    {
        key: 'alif',
        label: 'Alif',
        accent: '#7c3aed',
        status: 'soon',
        soonText: 'Tez orada — Alif Pay integratsiyasi',
    },
];

function ComingSoon({ provider }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="payments-soon"
        >
            <div className="payments-soon__icon" style={{ background: `${provider.accent}18`, color: provider.accent }}>
                <Lock size={28} />
            </div>
            <div className="payments-soon__title">{provider.label} — Tez orada</div>
            <div className="payments-soon__desc">{provider.soonText}</div>
            <div className="payments-soon__pill">
                <Sparkles size={14} /> Qiziqsangiz biz bilan bog'laning
            </div>
        </motion.div>
    );
}

export default function ClinicPayments() {
    const [searchParams, setSearchParams] = useSearchParams();
    const active = searchParams.get('provider') || 'payme';
    const current = useMemo(
        () => PROVIDERS.find((p) => p.key === active) || PROVIDERS[0],
        [active],
    );

    const handleSwitch = (key) => {
        const next = new URLSearchParams(searchParams);
        next.set('provider', key);
        setSearchParams(next, { replace: true });
    };

    return (
        <div className="payments-page">
            <motion.header
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="payments-header"
            >
                <div className="payments-header__icon">
                    <CreditCard size={22} />
                </div>
                <div>
                    <h1 className="payments-header__title">To'lov tizimi</h1>
                    <p className="payments-header__sub">
                        Klinikangizning to'lov provayderlarini boshqaring
                    </p>
                </div>
            </motion.header>

            <nav className="payments-tabs" role="tablist" aria-label="To'lov provayderlari">
                {PROVIDERS.map((p) => {
                    const isActive = p.key === current.key;
                    return (
                        <button
                            key={p.key}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => handleSwitch(p.key)}
                            className={`payments-tab ${isActive ? 'payments-tab--active' : ''} ${
                                p.status === 'soon' ? 'payments-tab--soon' : ''
                            }`}
                            style={isActive ? { '--accent': p.accent } : undefined}
                        >
                            <span className="payments-tab__label">{p.label}</span>
                            {p.status === 'soon' && (
                                <span className="payments-tab__badge">
                                    <Lock size={10} /> Soon
                                </span>
                            )}
                            {p.status === 'available' && (
                                <span className="payments-tab__dot" style={{ background: p.accent }} />
                            )}
                        </button>
                    );
                })}
            </nav>

            <AnimatePresence mode="wait">
                <motion.div
                    key={current.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="payments-panel"
                >
                    {current.status === 'available' && current.component ? (
                        <current.component />
                    ) : (
                        <ComingSoon provider={current} />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
