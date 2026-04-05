import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import './css/Stats.css';

const DEFAULT_AVATARS = [
    '/images/1751463932_img2.png',
    '/images/1751463870_img1.png',
    '/images/1751463965_img3.png',
    '/images/1751463996_img4.png',
];

export default function Stats() {
    const { data } = useHomepageSettings();
    const s = data?.stats || {};

    const avatars = (s.avatars || []).map(a => a.url || a).filter(Boolean);
    const displayAvatars = avatars.length ? avatars : DEFAULT_AVATARS;
    const bookingText = s.bookingText || '300+ Appointment Booking Confirm for this Week';
    const specialists = s.specialists || '200';
    const patients = s.patients || '45k';
    const awards = s.awards || '150';
    const bgImage = s.bgImage || 'https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752042862.bg2.webp';

    return (
        <section
            className="cm-stats"
            style={{ backgroundImage: `url('${bgImage}')` }}
        >
            <div className="home-container">
                <div className="cm-stats-grid">
                    <div className="cm-stats-booking">
                        <div className="cm-stats-avatars">
                            {displayAvatars.slice(0, 4).map((src, i) => (
                                <img key={i} src={src} alt="client" />
                            ))}
                        </div>
                        <p>{bookingText}</p>
                    </div>
                    <div className="cm-stats-item">
                        <span className="cm-stats-num">{specialists}<sup>+</sup></span>
                        <h3>Specialists</h3>
                    </div>
                    <div className="cm-stats-item">
                        <span className="cm-stats-num">{patients}</span>
                        <h3>Happy Patients</h3>
                    </div>
                    <div className="cm-stats-item">
                        <span className="cm-stats-num">{awards}<sup>+</sup></span>
                        <h3>Winning Awards</h3>
                    </div>
                </div>
            </div>
        </section>
    );
}
