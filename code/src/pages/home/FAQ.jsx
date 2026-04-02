import { useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import './css/FAQ.css';

const FAQS = [
    { q: 'How do I book an appointment at BANISA?', a: 'You can book an appointment by calling our helpline at +998 71 123 45 67, sending an email to info@banisa.uz, or using the online appointment form on our website. Our team will confirm your appointment within 24 hours.' },
    { q: 'What medical specialties do your doctors cover?', a: 'BANISA offers a wide range of specialties including Cardiology, Dermatology, Neurology, Pediatrics, Orthopedics, Gynecology, and Dental care. Our team of 200+ certified specialists ensures comprehensive healthcare for all ages.' },
    { q: 'What types of treatments and procedures do you offer?', a: 'We provide both outpatient and inpatient services including diagnostics, surgical procedures, rehabilitation, telemedicine consultations, advanced imaging, and preventive healthcare programs tailored to each patient.' },
    { q: 'Can I cancel or reschedule my appointment?', a: 'Yes. You can cancel or reschedule your appointment up to 2 hours before the scheduled time by contacting us via phone or email. We kindly ask for timely notice so we can accommodate other patients.' },
];

export default function FAQ() {
    const [open, setOpen] = useState(0);

    return (
        <section
            className="cm-faq"
            style={{ background: 'linear-gradient(135deg, #f0fafb 0%, #e8f7f8 50%, #d6f0f2 100%)' }}
        >
            <div className="home-container">
                <div className="cm-faq-grid">
                    <div className="cm-faq-content">
                        <span className="cm-section-badge">FAQ</span>
                        <h2 className="cm-faq-title">Frequently Asked Questions</h2>
                        <p className="cm-faq-desc">Have questions about our services or how to book an appointment? We've answered the most common questions below to help you get started.</p>
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
                                    <span className="cm-faq-phone-label">Qo'ng'iroq qiling</span>
                                    <a href="tel:+998711234567" className="cm-faq-phone-number">+998 71 123 45 67</a>
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
