import { ArrowRight, Play } from 'lucide-react';
import './css/Hero.css';

export default function Hero() {
    return (
        <section
            id="home"
            className="cm-hero"
            style={{
                backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752040977.bg1.webp')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="cm-hero-vertical">24/7 EMERGENCY SERVICE</div>

            <div className="home-container">
                <div className="cm-hero-grid">
                    {/* Left content */}
                    <div className="cm-hero-content">
                        <h1>
                            Medical &<br />
                            Health Care<br />
                            <span className="cyan">Services</span>
                            <img
                                src="https://themes.w3cms.in/clinicmaster/medical/public/themes/frontend/clinicmaster/images/hero-banner/line.png"
                                alt=""
                                className="cm-hero-line"
                            />
                        </h1>

                        <p className="cm-hero-desc">
                            Your health is our top priority. Schedule an
                            appointment with us today
                        </p>

                        <div className="cm-hero-actions">
                            <button className="cm-hero-appt">
                                Appointment
                                <span className="arrow"><ArrowRight size={16} /></span>
                            </button>
                            <button className="cm-hero-watch">
                                <span className="play"><Play size={14} fill="#1a103d" /></span>
                                Watch Now
                            </button>
                        </div>

                        {/* Chat widget */}
                        <div className="cm-hero-chat">
                            <div className="cm-hero-chat-avatar">
                                <img
                                    src="/images/1752040923.avatar6.webp"
                                    alt="Avatar"
                                />
                            </div>
                            <div>
                                <h6 className="cm-hero-chat-title">Have a Question?</h6>
                                <a href="mailto:sales@dexignzone.com" className="cm-hero-chat-link">sales@dexignzone.com</a>
                            </div>
                        </div>
                    </div>

                    {/* Right image */}
                    <div className="cm-hero-visual">
                        <div className="cm-hero-curve" />
                        <img
                            src="https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752040923.img1.webp"
                            alt="Doctor"
                            className="cm-hero-img"
                        />
                        {/* Floating heart */}
                        <div className="cm-hero-heart">
                            <img
                                src="https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752040923.heart.png"
                                alt="Heart"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
