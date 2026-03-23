import { ArrowRight } from 'lucide-react';
import './css/HowItWorks.css';

const STEPS = [
    {
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
        ),
        title: 'Book an Appointment',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
        ),
        title: 'Conduct Checkup',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
        ),
        title: 'Perform Treatment',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        ),
        title: 'Prescribe & Payment',
    },
];

export default function HowItWorks() {
    return (
        <section id="how" className="cm-how">
            <div className="home-container">
                <div className="cm-how-grid">
                    <div className="cm-how-left">
                        <span className="cm-section-badge">Process</span>
                        <h2 className="cm-how-title">How It Works</h2>
                        <p className="cm-how-desc">Getting quality healthcare at BANISA is simple. Follow these easy steps to book your appointment and receive world-class treatment.</p>
                        <div className="cm-how-steps">
                            {STEPS.map((s, i) => (
                                <div key={i} className="cm-how-step">
                                    <div className="cm-how-step-icon">{s.icon}</div>
                                    <h3>{s.title}</h3>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="cm-how-right">
                        <div className="cm-how-media">
                            <img src="/images/1752043509.img4.webp" alt="How it works" />
                            <button className="cm-how-appt-btn">
                                Appointment <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="cm-how-stats-badge">
                            <div className="cm-how-stat">
                                <span className="cm-how-stat-num">180<sup>+</sup></span>
                                <span className="cm-how-stat-label">Specialists</span>
                            </div>
                            <div className="cm-how-stat">
                                <span className="cm-how-stat-num">45<sup>k</sup></span>
                                <span className="cm-how-stat-label">Happy Patients</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
