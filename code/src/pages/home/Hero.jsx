import { ArrowRight, Play } from 'lucide-react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import './css/Hero.css';

export default function Hero() {
    const { data } = useHomepageSettings();
    const s = data?.hero || {};

    const badge = s.badge || '24/7 EMERGENCY SERVICE';
    const title1 = s.title1 || 'Medical &';
    const title2 = s.title2 || 'Health Care';
    const titleHighlight = s.titleHighlight || 'Services';
    const description = s.description || 'Your health is our top priority. Schedule an appointment with us today';
    const bgImage = s.bgImage || 'https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752040977.bg1.webp';
    const chatAvatar = s.chatAvatar || '/images/1752040923.avatar6.webp';
    const chatTitle = s.chatTitle || 'Have a Question?';
    const chatEmail = s.chatEmail || 'info@banisa.uz';
    const appointmentBtnText = s.appointmentBtnText || 'Xizmatlarimiz';
    const appointmentBtnLink = s.appointmentBtnLink || '/xizmatlar';
    const videoBtnText = s.videoBtnText || 'Watch Now';
    const videoUrl = s.videoUrl || '';

    return (
        <section
            id="home"
            className="cm-hero"
            style={{ backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
            <div className="cm-hero-vertical">{badge}</div>

            <div className="home-container">
                <div className="cm-hero-grid">
                    <div className="cm-hero-content">
                        <h1>
                            {title1}<br />
                            {title2}<br />
                            <span className="cyan">{titleHighlight}</span>
                            <img
                                src="https://themes.w3cms.in/clinicmaster/medical/public/themes/frontend/clinicmaster/images/hero-banner/line.png"
                                alt=""
                                className="cm-hero-line"
                            />
                        </h1>
                        <p className="cm-hero-desc">{description}</p>
                        <div className="cm-hero-actions">
                            <a href={appointmentBtnLink} className="cm-hero-appt">
                                {appointmentBtnText}
                                <span className="arrow"><ArrowRight size={16} /></span>
                            </a>
                            {videoUrl ? (
                                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="cm-hero-watch">
                                    <span className="play"><Play size={14} fill="#1a103d" /></span>
                                    {videoBtnText}
                                </a>
                            ) : (
                                <button className="cm-hero-watch">
                                    <span className="play"><Play size={14} fill="#1a103d" /></span>
                                    {videoBtnText}
                                </button>
                            )}
                        </div>
                        <div className="cm-hero-chat">
                            <div className="cm-hero-chat-avatar">
                                <img src={chatAvatar} alt="Avatar" />
                            </div>
                            <div>
                                <h6 className="cm-hero-chat-title">{chatTitle}</h6>
                                <a href={`mailto:${chatEmail}`} className="cm-hero-chat-link">{chatEmail}</a>
                            </div>
                        </div>
                    </div>
                    <div className="cm-hero-visual">
                        <div className="cm-hero-curve" />
                        <img
                            src="https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752040923.img1.webp"
                            alt="Doctor"
                            className="cm-hero-img"
                        />
                        <div className="cm-hero-heart">
                            <img src="https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752040923.heart.png" alt="Heart" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
