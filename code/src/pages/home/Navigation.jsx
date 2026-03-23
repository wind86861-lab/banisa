import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import './css/Navigation.css';

const NAV_LINKS = [
    { href: '#home', label: 'Bosh Sahifa' },
    { href: '#services', label: 'Xizmatlar' },
    { href: '#how', label: 'Qanday Ishlaydi' },
    { href: '#clinics', label: 'Klinikalar' },
    { href: '#why', label: 'Nega Biz' },
    { href: '#contact', label: 'Aloqa' },
];

export default function Navigation() {
    const [open, setOpen] = useState(false);

    return (
        <nav className="cm-nav">
            <div className="home-container">
                <div className="cm-nav-inner">
                    {/* Logo */}
                    <Link to="/" className="cm-nav-logo">
                        <div className="cm-nav-logo-icon">
                            <svg viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="46" height="46" rx="12" fill="#1dbfc1" />
                                <rect x="13" y="20" width="20" height="6" rx="1.5" fill="#fff" />
                                <rect x="20" y="13" width="6" height="20" rx="1.5" fill="#fff" />
                            </svg>
                        </div>
                        <div className="cm-nav-logo-text">
                            BANISA
                            <span>Clinic</span>
                        </div>
                    </Link>

                    {/* Desktop links */}
                    <div className="cm-nav-links">
                        {NAV_LINKS.map(l => (
                            <a key={l.href} href={l.href} className="cm-nav-link">{l.label}</a>
                        ))}
                    </div>

                    {/* Right side */}
                    <div className="cm-nav-right">
                        <Link to="/login" className="cm-nav-btn">Appointment</Link>
                        <button className="cm-nav-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
                            {open ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                <div className={`cm-mobile-menu${open ? ' open' : ''}`}>
                    {NAV_LINKS.map(l => (
                        <a key={l.href} href={l.href} className="cm-mobile-link" onClick={() => setOpen(false)}>
                            {l.label}
                        </a>
                    ))}
                    <Link to="/login" className="cm-mobile-cta" onClick={() => setOpen(false)}>
                        Navbat Olish
                    </Link>
                </div>
            </div>
        </nav>
    );
}
