import './css/Stats.css';

export default function Stats() {
    return (
        <section
            className="cm-stats"
            style={{ backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752042862.bg2.webp')" }}
        >
            <div className="home-container">
                <div className="cm-stats-grid">
                    <div className="cm-stats-booking">
                        <div className="cm-stats-avatars">
                            <img src="/images/vWHugwst1cx9gzyQYF7U1r4N2JaE1BfuaRVAgjWH.webp" alt="client" />
                            <img src="/images/kCMuATd0luwBkCXrOKalCiftCe685rTWNtihLRp8.webp" alt="client" />
                            <img src="/images/DSTFEt33BRyG0GQS5SlGlJvkUhK0U5YtJ52qzCza.webp" alt="client" />
                            <img src="/images/zzjNDWxY6kXBUcDNOKJZ301Zsp8qNdA61PiiLrmW.webp" alt="client" />
                        </div>
                        <p>300+ Appointment Booking Confirm for this Week</p>
                    </div>
                    <div className="cm-stats-item">
                        <span className="cm-stats-num">200<sup>+</sup></span>
                        <h3>Specialists</h3>
                    </div>
                    <div className="cm-stats-item">
                        <span className="cm-stats-num">45<sup>k</sup></span>
                        <h3>Happy Patients</h3>
                    </div>
                    <div className="cm-stats-item">
                        <span className="cm-stats-num">150<sup>+</sup></span>
                        <h3>Winning Awards</h3>
                    </div>
                </div>
            </div>
        </section>
    );
}
