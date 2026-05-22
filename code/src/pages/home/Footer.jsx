import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, MapPin, Send } from 'lucide-react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import { useLegalDocs } from '../../hooks/useLegalDocs';
import './css/Footer.css';

// Adaptive footer. Background image is preserved (the user explicitly liked it).
// Content is sourced from homepage settings with sensible Uzbek fallbacks; links
// point to real in-app routes so nothing is a dead `#` anymore.

const FOOTER_BG = "url('https://themes.w3cms.in/clinicmaster/medical/public/storage/theme-options/1759147154.bg4.webp')";

const SERVICE_GROUPS = [
    { label: 'Diagnostika', to: '/xizmatlar?category=diagnostika' },
    { label: 'Jarrohlik', to: '/xizmatlar?category=jarrohlik' },
    { label: 'Tekshiruv paketlari', to: '/xizmatlar?category=tekshiruv' },
    { label: 'Sanatoriy', to: '/xizmatlar?category=sanatoriy' },
];

const QUICK_LINKS = [
    { label: 'Bosh sahifa', to: '/' },
    { label: 'Xizmatlar', to: '/xizmatlar' },
    { label: 'Klinikalar', to: '/klinikalar' },
    { label: 'Bronlarim', to: '/user/appointments' },
];

export default function Footer() {
    const { data } = useHomepageSettings();
    const { docs: legalDocs } = useLegalDocs();
    const s = data?.footer || {};

    const description = s.description
        || "BANISA — O'zbekistondagi tibbiy xizmatlarni onlayn topish va bron qilish platformasi. Klinikalar, narxlar va vaqt — bir joyda.";
    const tagline = s.tagline || "Sog'liq — har bir kunning eng muhim rejasi.";
    const phone = s.phone || '+998 71 123 45 67';
    const email = s.email || 'info@banisa.uz';
    const workingHours = s.workingHours || 'Dush–Juma: 09:00–18:00';
    const address = s.address || "Toshkent, O'zbekiston";
    const logo = s.logo || '/images/banisa-logo.png';
    const year = new Date().getFullYear();

    return (
        <footer
            id="contact"
            className="bn-footer"
            style={{ backgroundImage: FOOTER_BG }}
        >
            <div className="bn-footer__overlay">

                {/* ─── Contact strip ─────────────────────────────────────── */}
                <div className="bn-footer__contact-strip">
                    <div className="home-container">
                        <div className="bn-footer__contact-grid">
                            <a className="bn-footer__contact-item" href={`tel:${phone.replace(/\s/g, '')}`}>
                                <div className="bn-footer__contact-icon"><Phone size={18} /></div>
                                <div>
                                    <span className="bn-footer__contact-label">Qo'ng'iroq</span>
                                    <span className="bn-footer__contact-value">{phone}</span>
                                </div>
                            </a>
                            <a className="bn-footer__contact-item" href={`mailto:${email}`}>
                                <div className="bn-footer__contact-icon"><Mail size={18} /></div>
                                <div>
                                    <span className="bn-footer__contact-label">Yozing</span>
                                    <span className="bn-footer__contact-value">{email}</span>
                                </div>
                            </a>
                            <div className="bn-footer__contact-item">
                                <div className="bn-footer__contact-icon"><Clock size={18} /></div>
                                <div>
                                    <span className="bn-footer__contact-label">Ish vaqti</span>
                                    <span className="bn-footer__contact-value">{workingHours}</span>
                                </div>
                            </div>
                            <div className="bn-footer__contact-item">
                                <div className="bn-footer__contact-icon"><MapPin size={18} /></div>
                                <div>
                                    <span className="bn-footer__contact-label">Manzil</span>
                                    <span className="bn-footer__contact-value">{address}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Main grid ─────────────────────────────────────────── */}
                <div className="bn-footer__main">
                    <div className="home-container">
                        <div className="bn-footer__grid">
                            <div className="bn-footer__brand">
                                <Link to="/" className="bn-footer__logo">
                                    <img src={logo} alt="BANISA" />
                                </Link>
                                <p className="bn-footer__desc">{description}</p>
                                <p className="bn-footer__tag">🏥 {tagline}</p>
                            </div>

                            <div className="bn-footer__col">
                                <h4 className="bn-footer__col-title">Xizmatlar</h4>
                                <ul className="bn-footer__links">
                                    {SERVICE_GROUPS.map(({ label, to }) => (
                                        <li key={to}><Link to={to}>{label}</Link></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bn-footer__col">
                                <h4 className="bn-footer__col-title">Tezkor havolalar</h4>
                                <ul className="bn-footer__links">
                                    {QUICK_LINKS.map(({ label, to }) => (
                                        <li key={to}><Link to={to}>{label}</Link></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bn-footer__col">
                                <h4 className="bn-footer__col-title">Hujjatlar</h4>
                                <ul className="bn-footer__links">
                                    {legalDocs?.privacyUrl && (
                                        <li><a href={legalDocs.privacyUrl} target="_blank" rel="noopener noreferrer">Maxfiylik siyosati</a></li>
                                    )}
                                    {legalDocs?.termsUrl && (
                                        <li><a href={legalDocs.termsUrl} target="_blank" rel="noopener noreferrer">Foydalanish shartlari</a></li>
                                    )}
                                    {legalDocs?.ofertaUrl && (
                                        <li><a href={legalDocs.ofertaUrl} target="_blank" rel="noopener noreferrer">Oferta</a></li>
                                    )}
                                    <li><Link to="/clinic-registration/welcome">Klinikalar uchun</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Bottom bar ────────────────────────────────────────── */}
                <div className="bn-footer__bottom">
                    <div className="home-container">
                        <div className="bn-footer__bottom-inner">
                            <p className="bn-footer__copy">
                                © {year} <Link to="/">BANISA</Link>. Barcha huquqlar himoyalangan.
                            </p>
                            <p className="bn-footer__credit">
                                O'zbekistonda <span>♥</span> bilan yaratildi
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
