import './css/WhyChooseUs.css';

const REASONS = [
    {
        title: 'More Experience',
        desc: 'We offer a wide range of health services to meet all your needs.',
        icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        )
    },
    {
        title: 'Seamless Care',
        desc: 'We offer a wide range of health services to meet all your needs.',
        icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        )
    },
    {
        title: 'The Right Answers',
        desc: 'We offer a wide range of health services to meet all your needs.',
        icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        )
    },
    {
        title: 'Unparalleled Expertise',
        desc: 'We offer a wide range of health services to meet all your needs.',
        icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
        )
    },
];

export default function WhyChooseUs() {
    return (
        <section
            id="why"
            className="cm-why"
        >
            <div className="home-container">
                <div className="cm-why-grid">
                    <div className="cm-why-media">
                        <div className="cm-why-img">
                            <img src="/images/1752043088.img5.webp" alt="Why Choose Us" />
                        </div>
                        <div className="cm-why-badge">
                            <span className="cm-why-badge-num">20<sup>+</sup></span>
                            <span className="cm-why-badge-label">Years Experienced</span>
                        </div>
                    </div>
                    <div className="cm-why-content">
                        <h2 className="cm-why-title">Why Choose Us for Your Health care Needs</h2>
                        <div className="cm-why-features">
                            {REASONS.map((r, i) => (
                                <div key={i} className="cm-why-feature">
                                    <div className="cm-why-feature-icon-bx">
                                        {r.icon}
                                    </div>
                                    <div className="cm-why-feature-content">
                                        <h3 className="cm-why-feature-title">{r.title}</h3>
                                        <p className="cm-why-feature-desc">{r.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
