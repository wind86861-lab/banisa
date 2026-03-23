import { Phone, Mail, Clock, Send } from 'lucide-react';
import './css/Footer.css';

export default function Footer() {
    return (
        <footer id="contact" className="cm-footer" style={{ backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/theme-options/1759147154.bg4.webp')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: 'cover' }}>
            <div className="cm-footer-head">
                <div className="home-container">
                    <div className="cm-footer-head-inner">
                        <div className="cm-footer-head-text">
                            <h3>Get in Touch with us</h3>
                            <p>Reach out to us for expert support.</p>
                        </div>
                        <div className="cm-footer-head-contact">
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Phone size={18} /></div>
                                <div>
                                    <h5>Contact Us</h5>
                                    <p><a href="tel:11234567890">1 123 456 7890</a></p>
                                </div>
                            </div>
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Mail size={18} /></div>
                                <div>
                                    <h5>Send us a Mail</h5>
                                    <p><a href="mailto:sales@dexignzone.com">sales@dexignzone.com</a></p>
                                </div>
                            </div>
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Clock size={18} /></div>
                                <div>
                                    <h5>Opening Time</h5>
                                    <p>Mon–Thu: 8:00am–5:00pm</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="cm-footer-top">
                <div className="home-container">
                    <div className="cm-footer-grid">
                        <div className="cm-footer-brand">
                            <div className="cm-footer-logo">
                                <img src="/images/1752849488.logo-white.svg" alt="ClinicMaster" style={{ maxWidth: 160 }} />
                            </div>
                            <p>ClinicMaster Ipsum Dolor Sit Amet, Consectetuer Adipiscing Elit, Sed Diam Nonummy Nibh Euismod Tincidunt Ut Laoreet Dolore Agna Aliquam Erat . Wisi Enim Ad Minim Veniam, Quis Tation. Sit Amet, Consec Tetuer. Ipsum Dolor</p>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Our Services</h4>
                            <ul className="cm-footer-links">
                                {['Angioplasty', 'Cardiology', 'Dental', 'Endocrinology', 'Eye Care'].map(s => (
                                    <li key={s}><a href="#">{s}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Our Stores</h4>
                            <ul className="cm-footer-links">
                                {['New York', 'London SF', 'Edinburgh', 'Los Angeles', 'Las Vegas'].map(s => (
                                    <li key={s}><a href="#">{s}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Useful Links</h4>
                            <ul className="cm-footer-links">
                                {['Privacy Policy', 'Terms & Conditions', 'Contact Us', 'Latest News'].map(s => (
                                    <li key={s}><a href="#">{s}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Quick Links</h4>
                            <ul className="cm-footer-links">
                                {['About Us', 'Team', 'Services', 'Contact Us', 'Appointment'].map(s => (
                                    <li key={s}><a href="#">{s}</a></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div className="cm-footer-middle">
                <div className="home-container">
                    <div className="cm-footer-newsletter">
                        <div className="cm-footer-newsletter-text">
                            <h2>Important Updates Waiting for you</h2>
                            <p>Get our latest and best contents right into your inbox</p>
                        </div>
                        <form className="cm-footer-newsletter-form" onSubmit={e => e.preventDefault()}>
                            <input type="email" placeholder="Your Email Address" className="cm-footer-email-input" />
                            <button type="submit" className="cm-footer-subscribe-btn">
                                Subscribe Now <Send size={14} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <div className="cm-footer-bottom">
                <div className="home-container">
                    <p>&copy; {new Date().getFullYear()} <a href="#">DexignZone</a> Theme. All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    );
}
