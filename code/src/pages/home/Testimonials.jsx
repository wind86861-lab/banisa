import { useState } from 'react';
import './css/Testimonials.css';

const TESTIMONIALS = [
    {
        name: 'Kenneth Fong', role: 'Patient', title: 'Good Care',
        img: '/images/1752123738_img1.png',
        text: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable",
    },
    {
        name: 'Danial Frankie', role: 'Patient', title: 'Truly Grateful',
        img: '/images/1752123672_img2.png',
        text: "From the moment I arrived, I felt welcomed. The staff went above and beyond to make me comfortable. My doctor listened patiently and explained everything. The treatment was smooth, and results were amazing. I truly appreciate the compassion and professionalism shown.",
    },
    {
        name: 'Rihana Roy', role: 'Patient', title: 'Caring Staff',
        img: '/images/1752124093_img3.png',
        text: "My experience here was nothing short of amazing. The team treated me with kindness and genuine care. Every step of my treatment was handled with professionalism. I felt heard, supported, and completely at ease. I'm truly grateful for the care I received.",
    },
    {
        name: 'Emma Carter', role: 'Patient', title: 'Best Treatment',
        img: '/images/1752124220_img4.png',
        text: "From the first visit, I felt completely at ease. The staff was warm, patient, and incredibly supportive. They took time to listen and explain everything clearly. Their kindness made a real difference in my recovery. I'm thankful for such a caring team.",
    },
];

export default function Testimonials() {
    const [current, setCurrent] = useState(0);

    const prev = () => setCurrent((c) => (c - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    const next = () => setCurrent((c) => (c + 1) % TESTIMONIALS.length);

    const t = TESTIMONIALS[current];

    return (
        <section
            className="cm-testimonials"
            style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1a103d 40%, #0d2461 100%)' }}
        >
            <div className="home-container">
                <div className="cm-testimonials-grid">
                    <div className="cm-testimonials-media">
                        <img src="/images/1752043437.img2.png" alt="Testimonials" />
                        <div className="cm-testimonials-circles">
                            <span className="circle1"><span /><span /><span /></span>
                            <span className="circle2"><span /><span /><span /></span>
                        </div>
                    </div>
                    <div className="cm-testimonials-content">
                        <div className="cm-testimonials-head">
                            <span className="cm-section-badge cm-section-badge--light">Testimonials</span>
                            <h2>Real Patients, Real Stories.<br />And Our Achievements</h2>
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
                                    <h3>{t.title}</h3>
                                    <p>{t.text}</p>
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
