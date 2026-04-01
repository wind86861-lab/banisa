import { useState, useRef, useEffect } from 'react';
import { Menu, X, User, LogOut, ChevronDown, Calendar, Heart, Bell, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import { useAuth } from '../../shared/auth/AuthContext';
import './css/Navigation.css';

const NAV_LINKS = [
    { href: '#home', label: 'Bosh Sahifa', isAnchor: true },
    { href: '/xizmatlar', label: 'Xizmatlar', isAnchor: false },
    { href: '#how', label: 'Qanday Ishlaydi', isAnchor: true },
    { href: '/klinikalar', label: 'Klinikalar', isAnchor: false },
    { href: '#why', label: 'Nega Biz', isAnchor: true },
    { href: '#contact', label: 'Aloqa', isAnchor: true },
];

export default function Navigation() {
    const [open, setOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { user, logout } = useUserAuth();
    const { user: clinicUser } = useAuth();

    // Determine clinic admin state (CLINIC_ADMIN role via AuthContext)
    const isClinicAdmin = clinicUser && clinicUser.role === 'CLINIC_ADMIN';

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
                            l.isAnchor
                                ? <a key={l.href} href={l.href} className="cm-nav-link">{l.label}</a>
                                : <Link key={l.href} to={l.href} className="cm-nav-link">{l.label}</Link>
                        ))}
                    </div>

                    {/* Right side */}
                    <div className="cm-nav-right">
                        {user ? (
                            /* ─── Logged-in PATIENT ─── */
                            <div className="cm-nav-user" ref={dropdownRef}>
                                <button className="cm-nav-bell" aria-label="Bildirishnomalar">
                                    <Bell size={20} />
                                </button>
                                <button
                                    className="cm-nav-avatar-btn"
                                    onClick={() => setDropdownOpen(p => !p)}
                                    aria-label="Profil menyusi"
                                >
                                    <div className="cm-nav-avatar">
                                        {user.firstName?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <span className="cm-nav-username">{user.firstName || 'Profil'}</span>
                                    <ChevronDown size={16} className={dropdownOpen ? 'rotated' : ''} />
                                </button>

                                {dropdownOpen && (
                                    <div className="cm-nav-dropdown">
                                        <div className="cm-nav-dropdown-header">
                                            <strong>{user.firstName} {user.lastName}</strong>
                                            <span>{user.phone}</span>
                                        </div>
                                        <div className="cm-nav-dropdown-divider" />
                                        <Link to="/user/dashboard" className="cm-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                            <User size={16} /> Profilim
                                        </Link>
                                        <Link to="/user/appointments" className="cm-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                            <Calendar size={16} /> Uchrashuvlarim
                                        </Link>
                                        <Link to="/user/favorites" className="cm-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                            <Heart size={16} /> Sevimlilar
                                        </Link>
                                        <div className="cm-nav-dropdown-divider" />
                                        <button
                                            className="cm-nav-dropdown-item cm-nav-dropdown-logout"
                                            onClick={() => { logout(); setDropdownOpen(false); }}
                                        >
                                            <LogOut size={16} /> Chiqish
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : isClinicAdmin ? (
                            /* ─── Logged-in CLINIC ADMIN ─── */
                            <div className="cm-nav-clinic-admin">
                                <Link to="/clinic/dashboard" className="cm-nav-admin-btn">
                                    <LayoutDashboard size={16} /> Boshqaruv paneli
                                </Link>
                            </div>
                        ) : (
                            /* ─── Guest ─── */
                            <div className="cm-nav-auth">
                                <Link to="/user/login" className="cm-nav-login-btn">Kirish</Link>
                                <Link to="/user/signup" className="cm-nav-signup-btn">Ro'yxat</Link>
                            </div>
                        )}

                        <button className="cm-nav-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
                            {open ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* Backdrop */}
                {open && <div className="cm-mobile-backdrop" onClick={() => setOpen(false)} />}

                {/* Mobile menu */}
                <div className={`cm-mobile-menu${open ? ' open' : ''}`}>
                    <div className="cm-mobile-menu-header">
                        <span className="cm-mobile-menu-title">Menu</span>
                        <button className="cm-mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
                            <X size={20} />
                        </button>
                    </div>
                    {NAV_LINKS.map(l => (
                        l.isAnchor
                            ? <a key={l.href} href={l.href} className="cm-mobile-link" onClick={() => setOpen(false)}>{l.label}</a>
                            : <Link key={l.href} to={l.href} className="cm-mobile-link" onClick={() => setOpen(false)}>{l.label}</Link>
                    ))}
                    <div className="cm-mobile-divider" />
                    {user ? (
                        <>
                            <Link to="/user/dashboard" className="cm-mobile-link" onClick={() => setOpen(false)}>Profilim</Link>
                            <Link to="/user/appointments" className="cm-mobile-link" onClick={() => setOpen(false)}>Uchrashuvlarim</Link>
                            <button className="cm-mobile-logout" onClick={() => { logout(); setOpen(false); }}>Chiqish</button>
                        </>
                    ) : isClinicAdmin ? (
                        <Link to="/clinic/dashboard" className="cm-mobile-cta" onClick={() => setOpen(false)}>Boshqaruv paneli</Link>
                    ) : (
                        <>
                            <Link to="/user/login" className="cm-mobile-link" onClick={() => setOpen(false)}>Kirish</Link>
                            <Link to="/user/signup" className="cm-mobile-cta" onClick={() => setOpen(false)}>Ro'yxatdan o'tish</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
