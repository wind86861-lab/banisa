import { useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import './css/FAQ.css';

const FAQS = [
    { q: 'How do I book my appointment?', a: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its. The point of using Lorem Ipsum is that it has a more-or-less normal distribution' },
    { q: 'How much do you charge for pedicure?', a: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its. The point of using Lorem Ipsum is that it has a more-or-less normal distribution' },
    { q: 'What types of treatments do you offer?', a: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its. The point of using Lorem Ipsum is that it has a more-or-less normal distribution' },
    { q: 'Can I cancel my appointment?', a: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its. The point of using Lorem Ipsum is that it has a more-or-less normal distribution' },
];

export default function FAQ() {
    const [open, setOpen] = useState(0);

    return (
        <section
            className="cm-faq"
            style={{ backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752043777.bg3.png')" }}
        >
            <div className="home-container">
                <div className="cm-faq-grid">
                    <div className="cm-faq-content">
                        <h2 className="cm-faq-title">Frequently Asked Questions</h2>
                        <p className="cm-faq-desc">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
                        <div className="cm-faq-accordion">
                            {FAQS.map((item, i) => (
                                <div key={i} className={`cm-faq-item${open === i ? ' open' : ''}`}>
                                    <button
                                        className="cm-faq-question"
                                        onClick={() => setOpen(open === i ? -1 : i)}
                                    >
                                        {item.q}
                                        <span className="cm-faq-icon">{open === i ? '−' : '+'}</span>
                                    </button>
                                    {open === i && (
                                        <div className="cm-faq-answer">
                                            <p>{item.a}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="cm-faq-media">
                        <img src="/images/1752043777.img3.webp" alt="FAQ" />
                        <div className="cm-faq-media-actions">
                            <div className="cm-faq-phone">
                                <div className="cm-faq-phone-icon">
                                    <Phone size={20} color="#00BDE0" />
                                </div>
                                <div>
                                    <span className="cm-faq-phone-label">Contact us?</span>
                                    <a href="tel:11234567890" className="cm-faq-phone-number">1 123 456 7890</a>
                                </div>
                            </div>
                            <button className="cm-btn-teal">
                                Appointment
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
