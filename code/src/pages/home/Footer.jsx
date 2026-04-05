import { Phone, Mail, Clock, Send } from 'lucide-react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import { useLegalDocs } from '../../hooks/useLegalDocs';
import './css/Footer.css';

export default function Footer() {
    const { data } = useHomepageSettings();
    const { docs: legalDocs } = useLegalDocs();
    const s = data?.footer || {};

    const description = s.description || "BANISA — zamonaviy tibbiyot markazi. Biz sizning sog'lig'ingizni birinchi o'ringa qo'yamiz.";
    const tagline = s.tagline || "Kasalxonaga onlayn bron qilish tizimi — Tez, qulay va xavfsiz";
    const phone = s.phone || '+998 71 123 45 67';
    const email = s.email || 'info@banisa.uz';
    const workingHours = s.workingHours || 'Dush–Juma: 09:00–18:00';
    const address = s.address || "Toshkent, O'zbekiston";
    const logo = s.logo || '/images/1752849488.logo-white.svg';

    return (
        <footer id="contact" className="cm-footer" style={{ backgroundImage: "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/theme-options/1759147154.bg4.webp')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: 'cover' }}>
            <div className="cm-footer-head">
                <div className="home-container">
                    <div className="cm-footer-head-inner">
                        <div className="cm-footer-head-text">
                            <h3>Biz bilan bog'laning</h3>
                            <p>Mutaxassislarimiz sizga yordam berishga tayyor.</p>
                        </div>
                        <div className="cm-footer-head-contact">
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Phone size={18} /></div>
                                <div>
                                    <h5>Qo'ng'iroq qiling</h5>
                                    <p><a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></p>
                                </div>
                            </div>
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Mail size={18} /></div>
                                <div>
                                    <h5>Elektron pochta</h5>
                                    <p><a href={`mailto:${email}`}>{email}</a></p>
                                </div>
                            </div>
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Clock size={18} /></div>
                                <div>
                                    <h5>Ish vaqti</h5>
                                    <p>{workingHours}</p>
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
                                <img src={logo} alt="BANISA" style={{ maxWidth: 160 }} />
                            </div>
                            <p>{description}</p>
                            <p style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                🏥 {tagline}
                            </p>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Xizmatlar</h4>
                            <ul className="cm-footer-links">
                                {['Kardiologiya', 'Dermatologiya', 'Stomatologiya', 'Nevrologiya', 'Ko\'z shifokori'].map(s => (
                                    <li key={s}><a href="#">{s}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Filiallar</h4>
                            <ul className="cm-footer-links">
                                {['Toshkent', 'Samarqand', 'Buxoro', 'Namangan', 'Andijon'].map(s => (
                                    <li key={s}><a href="#">{s}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Foydali havolalar</h4>
                            <ul className="cm-footer-links">
                                <li><a href={legalDocs?.privacyUrl || '#'} target={legalDocs?.privacyUrl ? '_blank' : '_self'} rel="noopener noreferrer">Maxfiylik siyosati</a></li>
                                <li><a href={legalDocs?.termsUrl || '#'} target={legalDocs?.termsUrl ? '_blank' : '_self'} rel="noopener noreferrer">Foydalanish shartlari</a></li>
                                <li><a href={legalDocs?.ofertaUrl || '#'} target={legalDocs?.ofertaUrl ? '_blank' : '_self'} rel="noopener noreferrer">Oferta</a></li>
                                <li><a href="#">Biz haqimizda</a></li>
                                <li><a href="#">Yangiliklar</a></li>
                            </ul>
                        </div>
                        <div className="cm-footer-col">
                            <h4 className="cm-footer-col-title">Tezkor havolalar</h4>
                            <ul className="cm-footer-links">
                                {['Bosh sahifa', 'Shifokorlar', 'Xizmatlar', 'Aloqa', 'Navbat olish'].map(s => (
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
                            <h2>Yangiliklar va takliflar</h2>
                            <p>Eng so'nggi tibbiy yangiliklar va aksiyalardan xabardor bo'ling</p>
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
                    <p>&copy; {new Date().getFullYear()} <a href="#">BANISA</a> Tibbiyot Markazi. Barcha huquqlar himoyalangan.</p>
                </div>
            </div>
        </footer>
    );
}
