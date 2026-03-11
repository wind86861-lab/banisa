
import {
    Home, Users, Activity, Settings, UserPlus,
    FileText, Briefcase, Layout, Shield, Lock,
    MoreHorizontal, ChevronRight, Building2,
    PieChart, Phone, Grid, Calendar
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandedMenu, setExpandedMenu] = useState({ 'dashboard': true });
    const [hoveredItem, setHoveredItem] = useState(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0 });

    const toggleSubMenu = (key) => {
        setExpandedMenu(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleItemHover = (e, item) => {
        if (!isOpen && item.subItems) {
            const rect = e.currentTarget.getBoundingClientRect();
            setPopoverPos({ top: rect.top });
            setHoveredItem(item);
        }
    };

    const handleItemLeave = () => {
        setHoveredItem(null);
    };

    const isActive = (itemPath) => {
        if (!itemPath) return false;
        const [path, query] = itemPath.split('?');
        const isPathMatch = location.pathname === path;

        if (query) {
            return isPathMatch && location.search.includes(query);
        }

        // If item has no query but current URL has one, it's not a perfect match for /services
        if (isPathMatch && location.pathname === '/services' && location.search && !query) {
            return false;
        }

        return isPathMatch;
    };

    const menuGroups = [
        {
            title: 'DASHBOARD',
            items: [
                { key: 'dashboard', icon: <Home size={20} />, label: 'Dashboard', path: '/' }
            ]
        },
        {
            items: [
                { key: 'patients', icon: <Users size={20} />, label: 'Foydalanuvchilar', path: '/patients' },
                { key: 'clinics', icon: <Building2 size={20} />, label: 'Klinikalar', path: '/admin/clinics' },
                { key: 'services', icon: <Briefcase size={20} />, label: 'Diagnostika', path: '/services?root=diagnostics' },
                { key: 'operations', icon: <Activity size={20} />, label: 'Operatsiyalar', path: '/services?root=operations' },
                { key: 'packages', icon: <Grid size={20} />, label: 'Checkup Paketlar', path: '/packages' },
                { key: 'clinic-packages', icon: <Briefcase size={20} />, label: 'Klinika Paketlari', path: '/clinic-packages' },
            ]
        },
        {
            title: 'LOGIN & ERROR',
            items: [
                { key: 'auth', icon: <Lock size={20} />, label: 'Authentication', path: '/auth' },
                { key: 'misc', icon: <Shield size={20} />, label: 'Miscellaneous', path: '/misc' },
            ]
        }
    ];

    // Animation Variants
    const subMenuVariants = {
        open: {
            height: 'auto',
            opacity: 1,
            transition: {
                height: { duration: 0.3, ease: 'easeOut' },
                opacity: { duration: 0.2, delay: 0.1 },
                staggerChildren: 0.05
            }
        },
        collapsed: {
            height: 0,
            opacity: 0,
            transition: {
                height: { duration: 0.3, ease: 'easeInOut' },
                opacity: { duration: 0.2 },
                when: "afterChildren"
            }
        }
    };

    const menuItemVariants = {
        open: {
            opacity: 1,
            x: 0,
            transition: { type: 'spring', stiffness: 300, damping: 24 }
        },
        collapsed: {
            opacity: 0,
            x: -10,
            transition: { duration: 0.2 }
        }
    };

    const arrowVariants = {
        open: { rotate: 90 },
        collapsed: { rotate: 0 }
    };

    return (
        <aside
            className={`sidebar ${!isOpen ? 'closed' : ''}`}
            onMouseLeave={handleItemLeave}
        >
            <div className="sidebar-header">
                <a href="/" className="logo">
                    <div className="logo-icon">B</div>
                    {isOpen && <span>Banisa</span>}
                </a>
            </div>

            <div className="sidebar-content">


                <nav className="sidebar-nav">
                    {menuGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="nav-section">
                            {group.title && isOpen && <h3 className="section-title">{group.title}</h3>}
                            <ul>
                                {group.items.map((item) => (
                                    <li
                                        key={item.key}
                                        className="nav-item"
                                        onMouseEnter={(e) => handleItemHover(e, item)}
                                    >
                                        {item.subItems ? (
                                            <>
                                                <a
                                                    href="#"
                                                    className={`nav-link ${expandedMenu[item.key] ? 'active' : ''} ${hoveredItem?.key === item.key ? 'hovered' : ''}`}
                                                    onClick={(e) => { e.preventDefault(); if (isOpen) toggleSubMenu(item.key); }}
                                                >
                                                    <span className="icon">{item.icon}</span>
                                                    {isOpen && <span className="label text-truncate">{item.label}</span>}
                                                    {isOpen && (
                                                        <motion.div
                                                            variants={arrowVariants}
                                                            initial="collapsed"
                                                            animate={expandedMenu[item.key] ? "open" : "collapsed"}
                                                        >
                                                            <ChevronRight size={16} className="arrow" />
                                                        </motion.div>
                                                    )}
                                                </a>

                                                {/* In-place sub-menu for open sidebar */}
                                                <AnimatePresence>
                                                    {isOpen && expandedMenu[item.key] && (
                                                        <motion.ul
                                                            className="sub-menu"
                                                            variants={subMenuVariants}
                                                            initial="collapsed"
                                                            animate="open"
                                                            exit="collapsed"
                                                        >
                                                            {item.subItems.map((sub, subIdx) => (
                                                                <motion.li key={subIdx} variants={menuItemVariants}>
                                                                    <a
                                                                        href="#"
                                                                        className={`sub-link ${isActive(sub.path) ? 'active' : ''}`}
                                                                        onClick={(e) => { e.preventDefault(); navigate(sub.path); }}
                                                                    >
                                                                        <span className="dot"></span>
                                                                        {sub.label}
                                                                    </a>
                                                                </motion.li>
                                                            ))}
                                                        </motion.ul>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        ) : (
                                            <a
                                                href="#"
                                                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                                                onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                                            >
                                                <span className="icon">{item.icon}</span>
                                                {isOpen && <span className="label text-truncate">{item.label}</span>}
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Flyout Popover for closed sidebar */}
            <AnimatePresence>
                {!isOpen && hoveredItem && (
                    <motion.div
                        className="flyout-menu"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        style={{ top: popoverPos.top }}
                    >
                        <div className="flyout-header">{hoveredItem.label}</div>
                        <ul>
                            {hoveredItem.subItems.map((sub, idx) => (
                                <li key={idx}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); navigate(sub.path); setHoveredItem(null); }}
                                    >
                                        <div className="dot"></div>
                                        {sub.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </aside>
    );
};

export default Sidebar;
