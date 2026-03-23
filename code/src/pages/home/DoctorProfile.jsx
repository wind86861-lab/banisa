import './css/DoctorProfile.css';

const SKILLS = [
    'Radiant Skin Dermatology', 'Laser Resurfacing',
    'Flawless Dermatology', 'Refined Skin Dermatology',
    'Luminous Dermatology', 'Anti Aging',
];

const AWARDS = [
    { img: '/images/spkqkJMUIHYAdCZwRDSbnNmX2D6q3sQMjw5KIkQs.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Best Dermatologists' },
    { img: '/images/WGYGgndSeSMO2mLaEywEYrGNxVQ68FBTGx0qZDj2.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Best Dermatologists' },
];

export default function DoctorProfile() {
    return (
        <section
            className="cm-doctor-profile"
            style={{ backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752043693.bg1.webp')" }}
        >
            <div className="home-container">
                <div className="cm-doctor-profile-grid">
                    <div className="cm-dp-media">
                        <img src="/images/1752043693.img1.png" alt="Dr. Natali Jackson" />
                        <div className="cm-dp-badge">
                            <span className="cm-dp-badge-num">20<span>+</span></span>
                            <span className="cm-dp-badge-label">Years<br />Experienced</span>
                        </div>
                    </div>
                    <div className="cm-dp-content">
                        <span className="cm-section-badge cm-section-badge--light">Featured Doctor</span>
                        <h2 className="cm-dp-title">Meet Dr. Natali Jackson</h2>
                        <p className="cm-dp-desc">
                            Dr. Natali Jackson is a board-certified dermatologist with over 20 years of clinical experience. She specializes in advanced skin therapies, laser treatments, and anti-aging procedures, combining precision medicine with compassionate patient care.
                        </p>
                        <h4 className="cm-dp-skills-heading">About Skills</h4>
                        <ul className="cm-dp-skills">
                            {SKILLS.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                        <div className="cm-dp-awards">
                            {AWARDS.map((a, i) => (
                                <div key={i} className="cm-dp-award-card">
                                    <div className="cm-dp-award-img">
                                        <img src={a.img} alt={a.title} />
                                    </div>
                                    <div className="cm-dp-award-info">
                                        <h4>{a.title}</h4>
                                        <p>{a.org}</p>
                                        <a href="#" className="cm-dp-award-link">{a.label}</a>
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
