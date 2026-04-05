import { useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import './css/FAQ.css';

const DEFAULT_FAQS = [
    { q: 'How do I book an appointment at BANISA?', a: 'You can book an appointment by calling our helpline at +998 71 123 45 67, sending an email to info@banisa.uz, or using the online appointment form on our website.' },
    { q: 'What medical specialties do your doctors cover?', a: 'BANISA offers a wide range of specialties including Cardiology, Dermatology, Neurology, Pediatrics, Orthopedics, Gynecology, and Dental care.' },
    { q: 'What types of treatments and procedures do you offer?', a: 'We provide both outpatient and inpatient services including diagnostics, surgical procedures, rehabilitation, and preventive healthcare programs.' },
    { q: 'Can I cancel or reschedule my appointment?', a: 'Yes. You can cancel or reschedule your appointment up to 2 hours before the scheduled time by contacting us via phone or email.' },
];

export default function FAQ() {
    const [open, setOpen] = useState(0);
    const { data } = useHomepageSettings();
    const s = data?.faq || {};

    const badge = s.badge || 'FAQ';
    const title = s.title || 'Frequently Asked Questions';
    const description = s.description || "Have questions about our services or how to book an appointment? We've answered the most common questions below to help you get started.";
    const image = s.image || '/images/1752043777.img3.webp';
    const phone = s.phone || '+998 71 123 45 67';
    const faqs = (s.faqs && s.faqs.length) ? s.faqs : DEFAULT_FAQS;

    return (
        <section
            className="cm-faq"
            style={{ backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/magic-editor/1752043777.bg3.png')" }}
        >
            <div className="home-container">
                <div className="cm-faq-grid">
                    <div className="cm-faq-content">
                        <span className="cm-section-badge">{badge}</span>
                        <h2 className="cm-faq-title">{title}</h2>
                        <p className="cm-faq-desc">{description}</p>
                        <div className="cm-faq-accordion">
                            {faqs.map((item, i) => (
                                <div key={i} className={`cm-faq-item${open === i ? ' open' : ''}`}>
                                    <button className="cm-faq-question" onClick={() => setOpen(open === i ? -1 : i)}>
                                        {item.q}
                                        <span className="cm-faq-icon">{open === i ? '−' : '+'}</span>
                                    </button>
                                    {open === i && (
                                        <div className="cm-faq-answer"><p>{item.a}</p></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="cm-faq-media">
                        <img src={image} alt="FAQ" />
                        <div className="cm-faq-media-actions">
                            <div className="cm-faq-phone">
                                <div className="cm-faq-phone-icon"><Phone size={20} color="#00BDE0" /></div>
                                <div>
                                    <span className="cm-faq-phone-label">Qo'ng'iroq qiling</span>
                                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="cm-faq-phone-number">{phone}</a>
                                </div>
                            </div>
                            <button className="cm-btn-teal">
                                Appointment <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
