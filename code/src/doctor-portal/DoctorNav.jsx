import { NavLink, useLocation } from 'react-router-dom';
import { Home, ClipboardPlus, ListChecks } from 'lucide-react';

/**
 * Persistent bottom nav for the doctor portal.
 *
 * The portal previously had no nav at all: the two actions lived as buttons on
 * the home screen, so reaching "Bemorga tavsiya" from the recommendations list
 * meant going back first. The patient side has a bottom bar; this gives the
 * doctor the same one-tap reach inside the Mini App.
 *
 * Hidden on the builder (/doctor/recommend), which owns the fixed basket bar —
 * two stacked bars would cover the screen on a short Mini App viewport.
 */
const TABS = [
    { to: '/doctor', label: 'Kabinet', icon: Home, exact: true },
    { to: '/doctor/recommend', label: 'Bemorga tavsiya', icon: ClipboardPlus },
    { to: '/doctor/recommendations', label: 'Tavsiyalarim', icon: ListChecks },
];

export default function DoctorNav() {
    const { pathname } = useLocation();
    if (pathname.startsWith('/doctor/recommend') && !pathname.startsWith('/doctor/recommendations')) {
        return null;
    }
    if (pathname.startsWith('/doctor/register')) return null;

    return (
        <nav className="dp-botnav" aria-label="Shifokor navigatsiyasi">
            {TABS.map(({ to, label, icon: Icon, exact }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={!!exact}
                    className={({ isActive }) => `dp-botnav__item${isActive ? ' active' : ''}`}
                >
                    <Icon size={21} className="dp-botnav__icon" />
                    <span className="dp-botnav__label">{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
