import { Phone, Mail, CalendarCheck, Clock, CreditCard } from 'lucide-react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import './css/TopBar.css';

export default function TopBar() {
    const { data } = useHomepageSettings();
    const s = data?.topbar || {};

    // A missing *Enabled flag counts as enabled (older stored rows have no
    // flags). Each item: icon + admin-editable label + admin-editable value.
    const on = (v) => v !== false;
    const items = [
        { key: 'contact', enabled: on(s.contactEnabled), icon: <Phone size={18} />, color: 'pink',
          label: s.contactLabel || 'Aloqa', value: s.phone || '+998 71 123 45 67' },
        { key: 'email', enabled: on(s.emailEnabled), icon: <Mail size={18} />, color: 'blue',
          label: s.emailLabel || 'Email', value: s.email || 'info@banisa.uz' },
        { key: 'appointment', enabled: on(s.appointmentEnabled), icon: <CalendarCheck size={18} />, color: 'green',
          label: s.appointmentLabel || 'Onlayn Navbat', value: s.appointmentValue || 'Hozir Oling' },
        { key: 'support', enabled: on(s.supportEnabled), icon: <Clock size={18} />, color: 'navy',
          label: s.supportLabel || "Qo'llab-quvvatlash", value: s.workingHours || 'Dush–Juma: 09:00–18:00' },
        { key: 'payment', enabled: on(s.paymentEnabled), icon: <CreditCard size={18} />, color: 'purple',
          label: s.paymentLabel || "To'lov", value: s.paymentValue || "Onlayn To'lov" },
    ].filter(i => i.enabled && (i.label || i.value));

    // Nothing to show → don't render an empty strip.
    if (!items.length) return null;

    return (
        <div className="cm-topbar">
            <div className="home-container cm-topbar-inner">
                {items.map(i => (
                    <div className="cm-topbar-item" key={i.key}>
                        <div className={`cm-topbar-icon ${i.color}`}>{i.icon}</div>
                        <div>
                            <div className="cm-topbar-label">{i.label}</div>
                            <div className="cm-topbar-value">{i.value}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
