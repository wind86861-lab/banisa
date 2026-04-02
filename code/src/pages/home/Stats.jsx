import './css/Stats.css';

export default function Stats() {
    return (
        <section
            className="cm-stats"
            style={{ background: 'linear-gradient(135deg, #1dbfc1 0%, #0d9fa1 50%, #0a8a8c 100%)' }}
        >
            <div className="home-container">
                <div className="cm-stats-grid">
                    <div className="cm-stats-booking">
                        <div className="cm-stats-avatars">
                            <img src="/images/1751463870_img1.png" alt="client" />
                            <img src="/images/1751463932_img2.png" alt="client" />
                            <img src="/images/1751463965_img3.png" alt="client" />
                            <img src="/images/1751463996_img4.png" alt="client" />
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
