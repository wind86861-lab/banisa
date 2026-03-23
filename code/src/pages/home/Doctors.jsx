import { ArrowRight } from 'lucide-react';
import './css/Doctors.css';

const DOCTORS = [
    { name: 'Danial Frankie', specialty: 'Cardiac Surgery', img: '/images/1751463932_img2.png', active: true },
    { name: 'Kenneth Fong', specialty: 'Occupational Therapy', img: '/images/1751463996_img4.png', active: false },
    { name: 'Nashid Martines', specialty: 'Pediatric Clinic', img: '/images/1751463870_img1.png', active: false },
    { name: 'Rihana Roy', specialty: 'Gynecology', img: '/images/1751463965_img3.png', active: false },
];

export default function Doctors() {
    return (
        <section className="cm-doctors">
            <div className="home-container">
                <div className="cm-section-header">
                    <div>
                        <span className="cm-section-badge">Our Team</span>
                        <h2 className="cm-section-title">Meet Our Expert<br />Doctors</h2>
                    </div>
                    <button className="cm-btn-teal">
                        View All
                        <ArrowRight size={16} />
                    </button>
                </div>
                <div className="cm-doctors-grid">
                    {DOCTORS.map((doc, i) => (
                        <div key={i} className={`cm-doctor-card${doc.active ? ' active' : ''}`}>
                            <div className="cm-doctor-media">
                                <img src={doc.img} alt={doc.name} />
                            </div>
                            <div className="cm-doctor-content">
                                <div className="cm-doctor-info">
                                    <h3 className="cm-doctor-name">{doc.name}</h3>
                                    <span className="cm-doctor-specialty">{doc.specialty}</span>
                                </div>
                                <button className="cm-doctor-arrow">
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                            <ul className="cm-doctor-social">
                                <li><a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
                                </a></li>
                                <li><a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                                </a></li>
                                <li><a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="Twitter">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg>
                                </a></li>
                                <li><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                                </a></li>
                                <li><a href="https://youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                </a></li>
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
