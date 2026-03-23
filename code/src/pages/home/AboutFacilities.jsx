import { ArrowRight, Phone } from 'lucide-react';
import './css/AboutFacilities.css';

const FACILITIES = [
    'Comprehensive Specialties', 'Research and Development',
    'Emergency Services', 'Advanced Imaging Services',
    'Intensive Care Units (ICUs)', 'Rehabilitation Services',
    'Telemedicine Facilities', 'Patient-Centric Approach',
    'Multidisciplinary Team', 'Health Information Technology',
];

export default function AboutFacilities() {
    return (
        <section className="cm-about">
            <div className="home-container">
                <div className="cm-about-grid">
                    <div className="cm-about-media">
                        <div className="cm-about-img-wrap">
                            <img src="/images/1752042615.img1.webp" alt="Doctor" />
                        </div>
                        <div className="cm-about-badge-call">
                            <div className="cm-about-badge-call-header">Video Call Support</div>
                            <div className="cm-about-badge-call-body">
                                <img src="/images/1752042615.img2.webp" alt="Doctor" />
                                <div className="cm-about-call-icons">
                                    <img src="/images/camra.svg" alt="camera" />
                                    <img src="/images/message.svg" alt="message" />
                                    <img src="/images/call.svg" alt="call" className="active" />
                                    <img src="/images/mike.svg" alt="mic" />
                                    <img src="/images/video.svg" alt="video" />
                                </div>
                            </div>
                        </div>
                        <div className="cm-about-badge-hours">
                            <div className="cm-about-hours-icon">
                                <img src="/images/clock.svg" alt="clock" />
                            </div>
                            <div className="cm-about-hours-content">
                                <h4>Open Hours</h4>
                                <ul>
                                    <li>Monday <strong>09:30 - 07:30</strong></li>
                                    <li>Tuesday <strong>09:30 - 07:30</strong></li>
                                    <li>Wednesday <strong>09:30 - 07:30</strong></li>
                                    <li>Thursday <strong>09:30 - 07:30</strong></li>
                                    <li>Friday <strong>09:30 - 07:30</strong></li>
                                    <li>Saturday <strong>09:30 - 07:30</strong></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="cm-about-content">
                        <h2 className="cm-about-title">World Class Patient Facilities Designed for You</h2>
                        <p className="cm-about-desc">
                            Experience the future of healthcare. Our state-of-the-art facilities are equipped with the latest technology, ensuring you receive the world's best quality treatment.
                        </p>
                        <ul className="cm-about-list">
                            {FACILITIES.map((f, i) => (
                                <li key={i}>{f}</li>
                            ))}
                        </ul>
                        <div className="cm-about-actions">
                            <button className="cm-btn-secondary">
                                Appointment
                                <span className="arrow"><ArrowRight size={16} /></span>
                            </button>
                            <div className="cm-about-phone">
                                <div className="cm-about-phone-icon">
                                    <Phone size={20} color="#00BDE0" />
                                </div>
                                <div>
                                    <span className="cm-about-phone-label">Contact us?</span>
                                    <a href="tel:11234567890" className="cm-about-phone-number">1 123 456 7890</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
