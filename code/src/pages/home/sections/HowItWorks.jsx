const STEPS = [
    {
        num: 1,
        icon: '🔍',
        title: 'Tanlang',
        desc: 'Klinika va kerakli tibbiy xizmatni qidirib, tanlang',
    },
    {
        num: 2,
        icon: '📅',
        title: 'Bron qiling',
        desc: 'Sana va vaqtni tanlab, bir necha klikda bron qiling',
    },
    {
        num: 3,
        icon: '💰',
        title: 'Naqd to\'lov',
        desc: "Klinikaga kelib kassada naqd to'lang — qulay va xavfsiz",
    },
];

export default function HowItWorksNew() {
    return (
        <section className="hn-section">
            <div className="hn-container">
                <div className="hn-section-head" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 className="hn-section-title">Qanday ishlaydi?</h2>
                    <p className="hn-section-sub">Sog'liqni boshqarish endi 3 oson qadam</p>
                </div>

                <div className="hn-hiw-grid">
                    {STEPS.map((s) => (
                        <div key={s.num} className="hn-hiw-step">
                            <div className="hn-hiw-num">{s.num}</div>
                            <div className="hn-hiw-icon">{s.icon}</div>
                            <h3 className="hn-hiw-title">{s.title}</h3>
                            <p className="hn-hiw-desc">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
