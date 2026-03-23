import { Phone, Mail, Clock, Send } from 'lucide-react';
import './css/Footer.css';

export default function Footer() {
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
                                    <p><a href="tel:+998711234567">+998 71 123 45 67</a></p>
                                </div>
                            </div>
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Mail size={18} /></div>
                                <div>
                                    <h5>Elektron pochta</h5>
                                    <p><a href="mailto:info@banisa.uz">info@banisa.uz</a></p>
                                </div>
                            </div>
                            <div className="cm-footer-contact-item">
                                <div className="cm-footer-contact-icon"><Clock size={18} /></div>
                                <div>
                                    <h5>Ish vaqti</h5>
                                    <p>Dush–Juma: 09:00–18:00</p>
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
                                <img src="/images/1752849488.logo-white.svg" alt="BANISA" style={{ maxWidth: 160 }} />
                            </div>
                            <p>BANISA — zamonaviy tibbiyot markazi. Biz sizning sog'lig'ingizni birinchi o'ringa qo'yamiz. Malakali mutaxassislar va ilg'or texnologiyalar yordamida eng yaxshi tibbiy xizmatlarni taqdim etamiz.</p>
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
                                {["Maxfiylik siyosati", "Foydalanish shartlari", "Biz haqimizda", "Yangiliklar"].map(s => (
                                    <li key={s}><a href="#">{s}</a></li>
                                ))}
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
