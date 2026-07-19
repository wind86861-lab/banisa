import { useState, useRef, useEffect } from 'react';
import {
    Menu, X, User, LogOut, ChevronDown, Calendar, Heart, LayoutDashboard, ShoppingCart,
    Home, Stethoscope, Building2, UserRound, Ambulance, HelpCircle, Phone, ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import { useAuth } from '../../shared/auth/AuthContext';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import { useCart } from '../../contexts/CartContext';
import UserNotificationBell from '../../user/components/UserNotificationBell';
import './css/Navigation.css';

const NAV_LINKS = [
    { href: '/', label: 'Bosh sahifa', isAnchor: false, icon: Home },
    { href: '/xizmatlar', label: 'Xizmatlar', isAnchor: false, icon: Stethoscope },
    { href: '/klinikalar', label: 'Klinikalar', isAnchor: false, icon: Building2 },
    { href: '/doktorlar', label: 'Doktorlar', isAnchor: false, icon: UserRound },
    { href: '/skory', label: 'Tez yordam', isAnchor: false, icon: Ambulance, urgent: true },
    { href: '#how', label: 'Qanday ishlaydi', isAnchor: true, icon: HelpCircle },
    { href: '#contact', label: 'Aloqa', isAnchor: true, icon: Phone },
];

// Panel slides in as one piece; children stagger in just behind it so the menu
// "assembles" instead of appearing all at once.
const PANEL_VARIANTS = {
    hidden: { x: '100%' },
    show: {
        x: 0,
        transition: { type: 'spring', stiffness: 380, damping: 38, mass: 0.9, staggerChildren: 0.035, delayChildren: 0.08 },
    },
    exit: { x: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};
const ITEM_VARIANTS = {
    hidden: { opacity: 0, x: 24 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 460, damping: 34 } },
};

export default function Navigation() {
    const [open, setOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { user, logout } = useUserAuth();
    const { user: clinicUser } = useAuth();
    const { data: hpData } = useHomepageSettings();
    const { cartCount } = useCart();
    const nav = hpData?.navigation || {};

    const siteName = nav.siteName || 'BANISA';
    const siteTagline = nav.siteTagline || 'Tibbiy Xizmatlar Platformasi';
    const logoColor = nav.logoColor || '#1dbfc1';
    const logoUrl = nav.logoUrl || '';

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

    const { pathname } = useLocation();
    const close = () => setOpen(false);

    // Close the drawer on route change + Esc, and freeze the page behind it so
    // the body doesn't scroll under the open panel on iOS.
    useEffect(() => { setOpen(false); }, [pathname]);
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Foydalanuvchi';
    const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || 'B';

    return (
        <nav className="cm-nav">
            <div className="home-container">
                <div className="cm-nav-inner">
                    {/* Logo */}
                    <Link to="/" className="cm-nav-logo">
                        <div className="cm-nav-logo-icon">
                            <img
                                src={logoUrl || '/images/banisa-logo.png'}
                                alt={siteName}
                            />
                        </div>
                        <div className="cm-nav-logo-text">
                            {siteName}
                            <span>{siteTagline}</span>
                        </div>
                    </Link>

                    {/* Desktop links */}
                    <div className="cm-nav-links">
                        {NAV_LINKS.map(l => {
                            const cls = `cm-nav-link${l.emphasis === 'urgent' ? ' cm-nav-link--urgent' : ''}`;
                            return l.isAnchor
                                ? <a key={l.href} href={l.href} className={cls}>{l.label}</a>
                                : <Link key={l.href} to={l.href} className={cls}>{l.label}</Link>;
                        })}
                    </div>

                    {/* Right side */}
                    <div className="cm-nav-right">
                        {/* Cart icon - visible to all users */}
                        <Link
                            to={user ? "/user/cart" : "/user/login"}
                            className="cm-nav-cart"
                            aria-label="Savat"
                            state={!user ? { from: location.pathname } : undefined}
                        >
                            <ShoppingCart size={20} />
                            {cartCount > 0 && <span className="cm-nav-cart-badge">{cartCount}</span>}
                        </Link>

                        {user ? (
                            /* ─── Logged-in PATIENT ─── */
                            <div className="cm-nav-user" ref={dropdownRef}>
                                {user.role === 'PATIENT' && <UserNotificationBell />}
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
                                        <Link to="/user/cart" className="cm-nav-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                            <ShoppingCart size={16} /> Savat {cartCount > 0 && `(${cartCount})`}
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

                        <button
                            className={`cm-nav-hamburger${open ? ' is-open' : ''}`}
                            onClick={() => setOpen(!open)}
                            aria-label="Menu"
                            aria-expanded={open}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={open ? 'x' : 'menu'}
                                    className="cm-nav-hamburger__icon"
                                    initial={{ rotate: open ? -90 : 90, opacity: 0, scale: 0.7 }}
                                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                    exit={{ rotate: open ? 90 : -90, opacity: 0, scale: 0.7 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                >
                                    {open ? <X size={22} /> : <Menu size={22} />}
                                </motion.span>
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

                {/* ─── Mobile menu (premium drawer) ─── */}
                <AnimatePresence>
                    {open && (
                        <>
                            <motion.div
                                key="backdrop"
                                className="cm-mobile-backdrop"
                                onClick={close}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.22 }}
                            />
                            <motion.aside
                                key="panel"
                                className="cm-mmenu"
                                variants={PANEL_VARIANTS}
                                initial="hidden"
                                animate="show"
                                exit="exit"
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={{ left: 0, right: 0.35 }}
                                onDragEnd={(_, info) => { if (info.offset.x > 90) close(); }}
                            >
                                <div className="cm-mmenu__glow" aria-hidden="true" />

                                <motion.div className="cm-mmenu__head" variants={ITEM_VARIANTS}>
                                    <div className="cm-mmenu__brand">
                                        <img src={logoUrl || '/images/banisa-logo.png'} alt={siteName} />
                                        <div>
                                            <div className="cm-mmenu__brand-name">{siteName}</div>
                                            <div className="cm-mmenu__brand-tag">{siteTagline}</div>
                                        </div>
                                    </div>
                                    <button className="cm-mmenu__close" onClick={close} aria-label="Yopish">
                                        <X size={19} />
                                    </button>
                                </motion.div>

                                {user && (
                                    <motion.div className="cm-mmenu__user" variants={ITEM_VARIANTS}>
                                        <div className="cm-mmenu__avatar">{initials}</div>
                                        <div className="cm-mmenu__user-info">
                                            <div className="cm-mmenu__user-name">{displayName}</div>
                                            <div className="cm-mmenu__user-sub">{user.phone || 'Shaxsiy kabinet'}</div>
                                        </div>
                                        <Link to="/user/dashboard" className="cm-mmenu__user-go" onClick={close} aria-label="Profil">
                                            <ChevronRight size={17} />
                                        </Link>
                                    </motion.div>
                                )}

                                <motion.div className="cm-mmenu__label" variants={ITEM_VARIANTS}>Menyu</motion.div>
                                <nav className="cm-mmenu__list">
                                    {NAV_LINKS.map((l) => {
                                        const Icon = l.icon;
                                        const active = !l.isAnchor && (l.href === '/' ? pathname === '/' : pathname.startsWith(l.href));
                                        const cls = `cm-mmenu__item${active ? ' is-active' : ''}${l.urgent ? ' is-urgent' : ''}`;
                                        const inner = (
                                            <>
                                                <span className="cm-mmenu__item-icon"><Icon size={18} /></span>
                                                <span className="cm-mmenu__item-label">{l.label}</span>
                                                <ChevronRight size={16} className="cm-mmenu__item-arrow" />
                                            </>
                                        );
                                        return (
                                            <motion.div key={l.href} variants={ITEM_VARIANTS}>
                                                {l.isAnchor
                                                    ? <a href={l.href} className={cls} onClick={close}>{inner}</a>
                                                    : <Link to={l.href} className={cls} onClick={close}>{inner}</Link>}
                                            </motion.div>
                                        );
                                    })}
                                </nav>

                                <motion.div className="cm-mmenu__label" variants={ITEM_VARIANTS}>Hisob</motion.div>
                                <div className="cm-mmenu__list">
                                    {user ? (
                                        <>
                                            <motion.div variants={ITEM_VARIANTS}>
                                                <Link to="/user/appointments" className="cm-mmenu__item" onClick={close}>
                                                    <span className="cm-mmenu__item-icon"><Calendar size={18} /></span>
                                                    <span className="cm-mmenu__item-label">Bronlarim</span>
                                                    <ChevronRight size={16} className="cm-mmenu__item-arrow" />
                                                </Link>
                                            </motion.div>
                                            <motion.div variants={ITEM_VARIANTS}>
                                                <Link to="/user/cart" className="cm-mmenu__item" onClick={close}>
                                                    <span className="cm-mmenu__item-icon"><ShoppingCart size={18} /></span>
                                                    <span className="cm-mmenu__item-label">Savat</span>
                                                    {cartCount > 0 && <span className="cm-mmenu__badge">{cartCount}</span>}
                                                    <ChevronRight size={16} className="cm-mmenu__item-arrow" />
                                                </Link>
                                            </motion.div>
                                            <motion.div variants={ITEM_VARIANTS}>
                                                <button className="cm-mmenu__item cm-mmenu__item--danger" onClick={() => { logout(); close(); }}>
                                                    <span className="cm-mmenu__item-icon"><LogOut size={18} /></span>
                                                    <span className="cm-mmenu__item-label">Chiqish</span>
                                                </button>
                                            </motion.div>
                                        </>
                                    ) : isClinicAdmin ? (
                                        <motion.div variants={ITEM_VARIANTS}>
                                            <Link to="/clinic/dashboard" className="cm-mmenu__cta" onClick={close}>
                                                <LayoutDashboard size={17} /> Boshqaruv paneli
                                            </Link>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <motion.div variants={ITEM_VARIANTS}>
                                                <Link to="/user/login" className="cm-mmenu__item" onClick={close}>
                                                    <span className="cm-mmenu__item-icon"><User size={18} /></span>
                                                    <span className="cm-mmenu__item-label">Kirish</span>
                                                    <ChevronRight size={16} className="cm-mmenu__item-arrow" />
                                                </Link>
                                            </motion.div>
                                            <motion.div variants={ITEM_VARIANTS}>
                                                <Link to="/user/signup" className="cm-mmenu__cta" onClick={close}>
                                                    Ro'yxatdan o'tish
                                                </Link>
                                            </motion.div>
                                        </>
                                    )}
                                </div>

                                <motion.div className="cm-mmenu__foot" variants={ITEM_VARIANTS}>
                                    Shoshilinch holatda <a href="tel:103">103</a> ga qo'ng'iroq qiling
                                </motion.div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
}
