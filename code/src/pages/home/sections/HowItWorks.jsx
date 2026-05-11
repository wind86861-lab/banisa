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
        icon: '📲',
        title: 'Klinikada QR scan qiling',
        desc: 'Klinikaga kelganingizda devordagi QR kodni telefon kamerangiz bilan oching — check-in avtomatik bo\'ladi',
    },
    {
        num: 4,
        icon: '💰',
        title: "Naqd yoki onlayn to'lov",
        desc: "Naqd to'lasangiz chegirma; karta, Payme, Click — sizga qulay usulda to'lang",
    },
];

export default function HowItWorksNew() {
    return (
        <section className="hn-section" id="how">
            <div className="hn-container">
                <div className="hn-section-head" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 className="hn-section-title">Qanday ishlaydi?</h2>
                    <p className="hn-section-sub">Sog'liqni boshqarish endi {STEPS.length} oson qadam</p>
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
