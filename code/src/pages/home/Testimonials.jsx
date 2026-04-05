import { useState } from 'react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import './css/Testimonials.css';

const DEFAULT_REVIEWS = [
    { name: 'Kenneth Fong', role: 'Patient', title: 'Good Care', img: '/images/1752123738_img1.png', comment: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout." },
    { name: 'Danial Frankie', role: 'Patient', title: 'Truly Grateful', img: '/images/1752123672_img2.png', comment: "From the moment I arrived, I felt welcomed. The staff went above and beyond to make me comfortable." },
    { name: 'Rihana Roy', role: 'Patient', title: 'Caring Staff', img: '/images/1752124093_img3.png', comment: "My experience here was nothing short of amazing. The team treated me with kindness and genuine care." },
    { name: 'Emma Carter', role: 'Patient', title: 'Best Treatment', img: '/images/1752124220_img4.png', comment: "From the first visit, I felt completely at ease. The staff was warm, patient, and incredibly supportive." },
];

export default function Testimonials() {
    const [current, setCurrent] = useState(0);
    const { data } = useHomepageSettings();
    const s = data?.testimonials || {};

    const badge = s.badge || 'Testimonials';
    const title = s.title || 'Real Patients, Real Stories.\nAnd Our Achievements';
    const sectionImage = s.image || '';
    const reviews = (s.reviews && s.reviews.length) ? s.reviews : DEFAULT_REVIEWS;

    const prev = () => setCurrent((c) => (c - 1 + reviews.length) % reviews.length);
    const next = () => setCurrent((c) => (c + 1) % reviews.length);

    const t = reviews[current] || reviews[0];

    return (
        <section
            className="cm-testimonials"
            style={{ backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752043437.bg3.webp')" }}
        >
            <div className="home-container">
                <div className="cm-testimonials-grid">
                    <div className="cm-testimonials-media">
                        <img src={sectionImage || "https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752043437.img2.png"} alt="Testimonials" />
                        <div className="cm-testimonials-circles">
                            <span className="circle1"><span /><span /><span /></span>
                            <span className="circle2"><span /><span /><span /></span>
                        </div>
                    </div>
                    <div className="cm-testimonials-content">
                        <div className="cm-testimonials-head">
                            <span className="cm-section-badge cm-section-badge--light">{badge}</span>
                            <h2>{title.split('\n').map((line, i) => <span key={i}>{line}{i < title.split('\n').length - 1 && <br />}</span>)}</h2>
                        </div>
                        <div className="cm-testimonials-slider">
                            <div className="cm-testimonial-card">
                                <div className="cm-testimonial-media">
                                    <div className="cm-testimonial-img-wrap">
                                        <img src={t.img} alt={t.name} />
                                        <div className="cm-testimonial-play">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5 3l14 9-14 9V3z" /></svg>
                                        </div>
                                    </div>
                                    <div className="cm-testimonial-info">
                                        <h5>{t.name}</h5>
                                        <span>{t.role}</span>
                                    </div>
                                </div>
                                <div className="cm-testimonial-body">
                                    <h3>{t.title || t.name}</h3>
                                    <p>{t.comment || t.text}</p>
                                </div>
                            </div>
                            <div className="cm-testimonials-nav">
                                <button className="cm-testimonial-prev" onClick={prev} aria-label="Previous">
                                    <img src="/images/arrow-left.svg" alt="prev" />
                                </button>
                                <button className="cm-testimonial-next" onClick={next} aria-label="Next">
                                    <img src="/images/arrow-right.svg" alt="next" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
